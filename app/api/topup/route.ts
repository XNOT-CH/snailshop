import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { checkTopupRateLimit, getClientIp } from "@/lib/rateLimit";
import { assertPinForProtectedAction } from "@/lib/security/pin";
import { mapSlipError } from "@/lib/features/topup/slipHelpers";
import { getVerifiedTopupAmount } from "@/lib/features/topup/topupBuilders";
import {
    createApprovedTopup,
    createPendingTopup,
    hasDuplicateTopupTransactionRef,
} from "@/lib/features/topup/topupService";
import {
    parseTopupRequestFormData,
    validateParsedTopupRequest,
} from "@/lib/features/topup/topupRequest";
import { validateTopupProofInput } from "@/lib/features/topup/topupProofValidation";
import { verifyTopupSlip } from "@/lib/features/topup/topupVerificationFlow";
import { saveTopupProofImage } from "@/lib/features/topup/topupProofStorage";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const maintenance = getMaintenanceState("topup");
    if (maintenance.enabled) {
        return NextResponse.json(
            { success: false, message: maintenance.message },
            {
                status: 503,
                headers: {
                    "Retry-After": String(maintenance.retryAfterSeconds),
                },
            },
        );
    }

    const ip = getClientIp(request);
    const rateLimit = checkTopupRateLimit(ip);
    if (rateLimit.blocked) {
        return NextResponse.json(
            { success: false, message: "ส่งคำขอเติมเงินถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง" },
            {
                status: 429,
                headers: {
                    "Retry-After": String(Math.max(1, Math.ceil((rateLimit.retryAfter ?? 1000) / 1000))),
                },
            },
        );
    }

    try {
        const authCheck = await isAuthenticatedWithCsrf(request);
        if (!authCheck.success || !authCheck.userId) {
            return NextResponse.json(
                { success: false, message: authCheck.error ?? "กรุณาเข้าสู่ระบบก่อน" },
                { status: 401 },
            );
        }

        const formData = await request.formData();
        const parsedTopupRequest = parseTopupRequestFormData(formData);
        const validationError = validateParsedTopupRequest(parsedTopupRequest);
        if (validationError) {
            return NextResponse.json(
                { success: false, message: validationError.message },
                { status: validationError.status },
            );
        }

        const {
            base64,
            file,
            imageUrl,
            pin,
            qrPayload,
            remark,
            requestedAmount,
            verifyMethod,
            verifyTarget,
        } = parsedTopupRequest;
        if (requestedAmount === null) {
            return NextResponse.json(
                { success: false, message: "กรุณากรอกจำนวนเงินที่โอนให้ถูกต้อง" },
                { status: 400 },
            );
        }

        const proofValidationError = await validateTopupProofInput({
            file,
            base64,
            imageUrl,
            verifyTarget,
        });
        if (proofValidationError) {
            return NextResponse.json(
                { success: false, message: proofValidationError.message },
                { status: proofValidationError.status },
            );
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, authCheck.userId),
            columns: {
                id: true,
                creditBalance: true,
                totalTopup: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, message: "ไม่พบผู้ใช้งาน" },
                { status: 404 },
            );
        }

        const pinCheck = await assertPinForProtectedAction(user.id, pin);
        if (!pinCheck.success) {
            return NextResponse.json(
                { success: false, message: pinCheck.message },
                { status: pinCheck.status },
            );
        }

        const {
            verificationResult,
            shouldFallbackToPending,
        } = await verifyTopupSlip({
            qrPayload,
            base64,
            imageUrl,
            file,
            requestedAmount,
            remark,
            verifyTarget,
        });

        if (!shouldFallbackToPending && verificationResult && verificationResult.status !== 200) {
            return NextResponse.json(
                { success: false, message: mapSlipError(verificationResult.message) },
                { status: 400 },
            );
        }

        if (!shouldFallbackToPending && verificationResult?.data?.transRef) {
            if (await hasDuplicateTopupTransactionRef(verificationResult.data.transRef)) {
                return NextResponse.json(
                    { success: false, message: "สลิปนี้เคยใช้เติมเงินแล้ว" },
                    { status: 400 },
                );
            }
        }

        const topupId = crypto.randomUUID();
        const { proofImage } = await saveTopupProofImage({
            file,
            imageUrl,
        });

        if (shouldFallbackToPending || !verificationResult?.data) {
            const pendingTopup = await createPendingTopup({
                request,
                topupId,
                userId: user.id,
                requestedAmount,
                proofImage,
                verifyMethod,
                verifyTarget,
            });

            return NextResponse.json({
                success: true,
                message: `ส่งสลิปสำเร็จ จำนวน ฿${requestedAmount.toLocaleString("th-TH")} และรอแอดมินตรวจสอบ`,
                data: pendingTopup,
            });
        }

        const verifiedSlip = verificationResult.data;
        const verifiedAmount = getVerifiedTopupAmount(verifiedSlip);
        if (verifiedAmount <= 0) {
            return NextResponse.json(
                { success: false, message: "ไม่สามารถอ่านจำนวนเงินจากสลิปได้" },
                { status: 400 },
            );
        }

        const approvedTopup = await createApprovedTopup({
            request,
            topupId,
            userId: user.id,
            requestedAmount,
            verifiedSlip,
            verifiedAmount,
            proofImage,
            verifyMethod,
            verifyTarget,
        });

        return NextResponse.json({
            success: true,
            message: `เติมเงินสำเร็จ! ได้รับ ฿${verifiedAmount.toLocaleString("th-TH")}`,
            data: approvedTopup,
        });
    } catch (error) {
        console.error("Topup error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่" },
            { status: 500 },
        );
    }
}
