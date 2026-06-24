import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { checkTopupRateLimit, getClientIp } from "@/lib/rateLimit";
import { assertPinForProtectedAction } from "@/lib/security/pin";
import {
    createApprovedTopup,
    hasDuplicateTopupTransactionRef,
} from "@/lib/features/topup/topupService";
import {
    getVerifiedTopupAmount,
    getVerifiedTopupTransactionRef,
    type VerifiedTopupSlip,
} from "@/lib/features/topup/topupBuilders";
import {
    parseTopupRequestFormData,
    validateParsedTopupRequest,
    type ParsedTopupRequest,
} from "@/lib/features/topup/topupRequest";
import { validateTopupProofInput } from "@/lib/features/topup/topupProofValidation";
import { saveTopupProofImage } from "@/lib/features/topup/topupProofStorage";
import {
    verifyBankSlipWithEasySlipV2,
    verifyTrueWalletSlipWithEasySlipV2,
    type EasySlipV2Error,
} from "@/lib/features/topup/easySlipService";

export const runtime = "nodejs";

type TopupEasySlipVerificationResult =
    | { success: true; status: number; verifiedSlip: VerifiedTopupSlip }
    | { success: false; status: number; error: EasySlipV2Error };

async function verifyParsedTopupWithEasySlipV2(
    input: ParsedTopupRequest & { requestedAmount: number },
): Promise<TopupEasySlipVerificationResult> {
    const options = {
        remark: input.remark ?? undefined,
        matchAccount: true,
        matchAmount: input.requestedAmount,
        checkDuplicate: true,
    };

    if (input.verifyTarget === "truewallet") {
        const result = input.file
            ? await verifyTrueWalletSlipWithEasySlipV2({ image: input.file, ...options })
            : input.base64
                ? await verifyTrueWalletSlipWithEasySlipV2({ base64: input.base64, ...options })
                : await verifyTrueWalletSlipWithEasySlipV2({ url: input.imageUrl ?? "", ...options });

        if (!result.response.success) {
            return { success: false, status: result.status, error: result.response.error };
        }

        return {
            success: true,
            status: result.status,
            verifiedSlip: { verifyTarget: "truewallet", data: result.response.data },
        };
    }

    const result = input.qrPayload
        ? await verifyBankSlipWithEasySlipV2({ payload: input.qrPayload, ...options })
        : input.file
            ? await verifyBankSlipWithEasySlipV2({ image: input.file, ...options })
            : input.base64
                ? await verifyBankSlipWithEasySlipV2({ base64: input.base64, ...options })
                : await verifyBankSlipWithEasySlipV2({ url: input.imageUrl ?? "", ...options });

    if (!result.response.success) {
        return { success: false, status: result.status, error: result.response.error };
    }

    return {
        success: true,
        status: result.status,
        verifiedSlip: { verifyTarget: "bank", data: result.response.data },
    };
}

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
    const rateLimit = await checkTopupRateLimit(ip);
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

        let verification: TopupEasySlipVerificationResult;
        try {
            verification = await verifyParsedTopupWithEasySlipV2({
                ...parsedTopupRequest,
                requestedAmount,
                qrPayload,
                remark,
                verifyTarget,
            });
        } catch (error) {
            if (error instanceof Error && error.message === "EASYSLIP_API_KEY is not configured.") {
                return NextResponse.json(
                    { success: false, message: "ระบบตรวจสลิปยังไม่ได้ตั้งค่า EasySlip API key" },
                    { status: 503 },
                );
            }

            console.error("[TOPUP_EASYSLIP_V2]", error);
            return NextResponse.json(
                { success: false, message: "ไม่สามารถเชื่อมต่อ EasySlip ได้ กรุณาลองใหม่อีกครั้ง" },
                { status: 502 },
            );
        }

        if (!verification.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: verification.error.message,
                    error: verification.error,
                },
                { status: verification.status },
            );
        }

        const { verifiedSlip } = verification;
        if (verifiedSlip.data.isDuplicate) {
            return NextResponse.json(
                { success: false, message: "สลิปนี้เคยใช้เติมเงินแล้ว" },
                { status: 400 },
            );
        }

        if (verifiedSlip.data.isAmountMatched !== true) {
            return NextResponse.json(
                { success: false, message: "จำนวนเงินในสลิปไม่ตรงกับยอดที่ส่งตรวจ" },
                { status: 400 },
            );
        }

        if (!verifiedSlip.data.matchedAccount) {
            return NextResponse.json(
                { success: false, message: "บัญชีผู้รับในสลิปไม่ตรงกับบัญชีที่ลงทะเบียนไว้" },
                { status: 400 },
            );
        }

        const transactionRef = getVerifiedTopupTransactionRef(verifiedSlip);
        // The Topup.transactionRef unique index is the last line of defense against
        // double-crediting the same slip, but MySQL allows multiple NULL/empty values
        // in a unique index. If the slip yields no usable reference we cannot dedupe
        // it at the DB level, so reject rather than risk crediting it twice.
        if (typeof transactionRef !== "string" || transactionRef.trim() === "") {
            return NextResponse.json(
                { success: false, message: "ไม่สามารถอ่านเลขอ้างอิงรายการจากสลิปได้ กรุณาลองใหม่หรือติดต่อแอดมิน" },
                { status: 400 },
            );
        }
        if (await hasDuplicateTopupTransactionRef(transactionRef)) {
            return NextResponse.json(
                { success: false, message: "สลิปนี้เคยใช้เติมเงินแล้ว" },
                { status: 400 },
            );
        }

        const verifiedAmount = getVerifiedTopupAmount(verifiedSlip);
        if (!Number.isFinite(verifiedAmount) || verifiedAmount <= 0) {
            return NextResponse.json(
                { success: false, message: "ไม่สามารถอ่านจำนวนเงินจากสลิปได้" },
                { status: 400 },
            );
        }

        const topupId = crypto.randomUUID();
        const { proofImage } = await saveTopupProofImage({
            file,
            imageUrl,
        });

        const approvedTopup = await createApprovedTopup({
            request,
            topupId,
            userId: user.id,
            requestedAmount,
            verifiedSlip,
            verifiedAmount,
            proofImage,
            verifyMethod,
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
