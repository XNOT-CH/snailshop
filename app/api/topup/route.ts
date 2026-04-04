import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, users, topups } from "@/lib/db";
import { mysqlNow } from "@/lib/utils/date";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { isAuthenticatedWithCsrf } from "@/lib/auth";
import {
    hasValidImageSignature,
    saveOptimizedImageUpload,
    validateImageFile,
} from "@/lib/serverImageUpload";

export const runtime = "nodejs";

const EASYSLIP_API_URL = "https://developer.easyslip.com/api/v1/verify";
const MAX_SLIP_BYTES = 5 * 1024 * 1024;
const SLIP_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "slips");
const SLIP_PUBLIC_PATH = "/uploads/slips";
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

interface SlipVerificationResult {
    status: number;
    message?: string;
    data?: {
        payload: string;
        transRef: string;
        date: string;
        countryCode: string;
        amount: { amount: number; local: { amount?: number; currency?: string } };
        fee?: number;
        ref1?: string;
        ref2?: string;
        ref3?: string;
        sender: {
            bank: { id?: string; name?: string; short?: string };
            account: { name: { th?: string; en?: string }; bank?: { type: string; account: string } };
        };
        receiver: {
            bank: { id: string; name?: string; short?: string };
            account: { name: { th?: string; en?: string }; bank?: { type: string; account: string } };
        };
    };
}

function parseAmount(rawAmount: FormDataEntryValue | null) {
    if (typeof rawAmount !== "string" || !rawAmount.trim()) {
        return null;
    }

    const parsed = Number(rawAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

function getSlipDataUrl(file: File, buffer: Buffer) {
    return `data:${file.type};base64,${buffer.toString("base64")}`;
}

function mapSlipError(message: string | undefined) {
    const errorMessages: Record<string, string> = {
        invalid_payload: "รูปสลิปไม่ถูกต้อง กรุณาอัปโหลดสลิปใหม่",
        invalid_image: "รูปสลิปไม่ถูกต้อง กรุณาอัปโหลดสลิปใหม่",
        duplicate_slip: "สลิปนี้เคยใช้แล้ว กรุณาใช้สลิปใหม่",
        image_size_too_large: "ขนาดรูปใหญ่เกินไป กรุณาลดขนาดรูป",
        slip_not_found: "ไม่พบข้อมูลสลิปในระบบธนาคาร กรุณาตรวจสอบสลิปอีกครั้ง",
        qrcode_not_found: "ไม่พบข้อมูลสลิปในระบบธนาคาร กรุณาตรวจสอบสลิปอีกครั้ง",
        unauthorized: "ระบบตรวจสลิปขัดข้อง กรุณาติดต่อแอดมิน",
        quota_exceeded: "ระบบตรวจสลิปเต็มโควตา กรุณาติดต่อแอดมิน",
    };

    if (!message) {
        return "เกิดข้อผิดพลาดในการตรวจสอบสลิป";
    }

    return errorMessages[message] || message;
}

async function verifySlipWithEasySlip(file: File, dataUrl: string): Promise<SlipVerificationResult> {
    const token = process.env.EASYSLIP_TOKEN;
    if (!token) {
        throw new Error("EASYSLIP_NOT_CONFIGURED");
    }

    const base64Data = dataUrl.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.codePointAt(i) || 0;
    }

    const extension = file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
            ? "webp"
            : "jpg";

    const formData = new FormData();
    formData.append("file", new Blob([bytes], { type: file.type }), `slip.${extension}`);
    formData.append("checkDuplicate", "true");

    const response = await fetch(EASYSLIP_API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });

    return response.json() as Promise<SlipVerificationResult>;
}

export async function POST(request: NextRequest) {
    try {
        const authCheck = await isAuthenticatedWithCsrf(request);
        if (!authCheck.success || !authCheck.userId) {
            return NextResponse.json(
                { success: false, message: authCheck.error ?? "กรุณาเข้าสู่ระบบก่อน" },
                { status: 401 },
            );
        }

        const formData = await request.formData();
        const file = formData.get("file");
        const requestedAmount = parseAmount(formData.get("amount"));

        if (!(file instanceof File)) {
            return NextResponse.json({ success: false, message: "กรุณาอัปโหลดสลิปการโอนเงิน" }, { status: 400 });
        }

        if (!requestedAmount) {
            return NextResponse.json({ success: false, message: "กรุณากรอกจำนวนเงินที่โอนให้ถูกต้อง" }, { status: 400 });
        }

        validateImageFile(file, {
            allowedTypes: ALLOWED_IMAGE_TYPES,
            maxInputBytes: MAX_SLIP_BYTES,
            maxDimension: 1600,
            outputQuality: 82,
            preserveAnimation: false,
        });

        const originalBuffer = Buffer.from(await file.arrayBuffer());
        if (!hasValidImageSignature(file.type as (typeof ALLOWED_IMAGE_TYPES)[number], originalBuffer)) {
            return NextResponse.json({ success: false, message: "รูปสลิปไม่ถูกต้อง" }, { status: 400 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, authCheck.userId),
            columns: { id: true, creditBalance: true, totalTopup: true },
        });

        if (!user) {
            return NextResponse.json({ success: false, message: "ไม่พบผู้ใช้งาน" }, { status: 404 });
        }

        const slipDataUrl = getSlipDataUrl(file, originalBuffer);

        let verificationResult: SlipVerificationResult | null = null;
        let shouldFallbackToPending = false;

        try {
            verificationResult = await verifySlipWithEasySlip(file, slipDataUrl);
        } catch (error) {
            if (error instanceof Error && error.message === "EASYSLIP_NOT_CONFIGURED") {
                shouldFallbackToPending = true;
            } else {
                console.error("[TOPUP_EASYSLIP]", error);
                shouldFallbackToPending = true;
            }
        }

        if (!shouldFallbackToPending && verificationResult && verificationResult.status !== 200) {
            return NextResponse.json(
                { success: false, message: mapSlipError(verificationResult.message) },
                { status: 400 },
            );
        }

        if (!shouldFallbackToPending && verificationResult?.data?.transRef) {
            const existingTopup = await db.query.topups.findFirst({
                where: eq(topups.transactionRef, verificationResult.data.transRef),
                columns: { id: true },
            });

            if (existingTopup) {
                return NextResponse.json({ success: false, message: "สลิปนี้เคยใช้เติมเงินแล้ว" }, { status: 400 });
            }
        }

        const savedSlip = await saveOptimizedImageUpload(file, {
            allowedTypes: ALLOWED_IMAGE_TYPES,
            maxInputBytes: MAX_SLIP_BYTES,
            maxDimension: 1600,
            outputQuality: 84,
            preserveAnimation: false,
            uploadDir: SLIP_UPLOAD_DIR,
            publicPath: SLIP_PUBLIC_PATH,
        });

        const topupId = crypto.randomUUID();

        if (shouldFallbackToPending || !verificationResult?.data) {
            await db.insert(topups).values({
                id: topupId,
                userId: user.id,
                amount: String(requestedAmount),
                proofImage: savedSlip.url,
                status: "PENDING",
                createdAt: mysqlNow(),
            });

            await auditFromRequest(request, {
                action: AUDIT_ACTIONS.TOPUP_REQUEST,
                resource: "TopupRequest",
                resourceId: topupId,
                resourceName: `฿${requestedAmount.toLocaleString("th-TH")}`,
                details: {
                    amount: requestedAmount,
                    proofImage: savedSlip.url,
                    status: "PENDING",
                    verification: "manual-review",
                },
            });

            return NextResponse.json({
                success: true,
                message: `ส่งสลิปสำเร็จ จำนวน ฿${requestedAmount.toLocaleString("th-TH")} และรอแอดมินตรวจสอบ`,
                data: {
                    topupId,
                    amount: requestedAmount,
                    status: "PENDING",
                    proofImage: savedSlip.url,
                },
            });
        }

        const verifiedAmount = verificationResult.data.amount?.amount || 0;
        if (verifiedAmount <= 0) {
            return NextResponse.json(
                { success: false, message: "ไม่สามารถอ่านจำนวนเงินจากสลิปได้" },
                { status: 400 },
            );
        }

        await db.transaction(async (tx) => {
            await tx.insert(topups).values({
                id: topupId,
                userId: user.id,
                amount: String(verifiedAmount),
                proofImage: savedSlip.url,
                status: "APPROVED",
                transactionRef: verificationResult?.data?.transRef,
                senderName: verificationResult?.data?.sender?.account?.name?.th || null,
                senderBank: verificationResult?.data?.sender?.bank?.name || null,
                receiverName: verificationResult?.data?.receiver?.account?.name?.th || null,
                receiverBank: verificationResult?.data?.receiver?.bank?.name || null,
                createdAt: mysqlNow(),
            });

            await tx.update(users).set({
                creditBalance: sql`creditBalance + ${verifiedAmount}`,
                totalTopup: sql`totalTopup + ${verifiedAmount}`,
            }).where(eq(users.id, user.id));
        });

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.TOPUP_REQUEST,
            resource: "TopupRequest",
            resourceId: topupId,
            resourceName: `฿${verifiedAmount.toLocaleString("th-TH")}`,
            details: {
                amount: verifiedAmount,
                requestedAmount,
                transRef: verificationResult.data.transRef,
                senderName: verificationResult.data.sender?.account?.name?.th,
                proofImage: savedSlip.url,
                status: "APPROVED",
                verification: "automatic",
            },
        });

        return NextResponse.json({
            success: true,
            message: `เติมเงินสำเร็จ! ได้รับ ฿${verifiedAmount.toLocaleString("th-TH")}`,
            data: {
                topupId,
                amount: verifiedAmount,
                senderName: verificationResult.data.sender?.account?.name?.th,
                senderBank: verificationResult.data.sender?.bank?.name,
                transRef: verificationResult.data.transRef,
                proofImage: savedSlip.url,
                status: "APPROVED",
            },
        });
    } catch (error) {
        console.error("Topup error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่" },
            { status: 500 },
        );
    }
}
