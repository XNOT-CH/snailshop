import { mysqlNow } from "@/lib/utils/date";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, users, topups } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

const EASYSLIP_API_URL = "https://developer.easyslip.com/api/v1/verify";
const MAX_SLIP_BYTES = 5 * 1024 * 1024;
const SLIP_DATA_URL_PREFIX = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;

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

function getApproximateBase64Bytes(base64Data: string): number {
    const sanitized = base64Data.replace(/\s+/g, "");
    const padding = sanitized.endsWith("==") ? 2 : sanitized.endsWith("=") ? 1 : 0;
    return Math.floor((sanitized.length * 3) / 4) - padding;
}

function validateProofImage(proofImage: unknown) {
    if (typeof proofImage !== "string") {
        return { error: "รูปสลิปไม่ถูกต้อง" };
    }

    const proofImageData = proofImage.trim();
    if (!proofImageData) {
        return { error: "กรุณาอัปโหลดสลิปการโอนเงิน" };
    }

    if (!SLIP_DATA_URL_PREFIX.test(proofImageData)) {
        return { error: "รูปสลิปไม่ถูกต้อง" };
    }

    const base64Data = proofImageData.replace(SLIP_DATA_URL_PREFIX, "");
    if (!base64Data) {
        return { error: "รูปสลิปไม่ถูกต้อง" };
    }

    if (getApproximateBase64Bytes(base64Data) > MAX_SLIP_BYTES) {
        return { error: "ขนาดรูปใหญ่เกินไป", status: 413 };
    }

    return { proofImageData };
}

async function verifySlipWithEasySlip(base64Image: string): Promise<SlipVerificationResult> {
    const token = process.env.EASYSLIP_TOKEN;
    if (!token) throw new Error("EASYSLIP_TOKEN is not configured");

    const base64Data = base64Image.replace(SLIP_DATA_URL_PREFIX, "");
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.codePointAt(i) || 0;
    }

    const formData = new FormData();
    formData.append("file", new Blob([bytes], { type: "image/jpeg" }), "slip.jpg");
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
        const { proofImage } = await request.json();
        const validation = validateProofImage(proofImage);
        if ("error" in validation) {
            return NextResponse.json(
                { success: false, message: validation.error },
                { status: validation.status ?? 400 }
            );
        }

        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { id: true, creditBalance: true, totalTopup: true },
        });
        if (!user) {
            return NextResponse.json({ success: false, message: "ไม่พบผู้ใช้งาน" }, { status: 404 });
        }

        let slipResult: SlipVerificationResult;
        try {
            slipResult = await verifySlipWithEasySlip(validation.proofImageData);
        } catch (error) {
            console.error("[TOPUP_EASYSLIP]", error);
            return NextResponse.json(
                { success: false, message: "ไม่สามารถตรวจสอบสลิปได้ กรุณาลองใหม่" },
                { status: 500 }
            );
        }

        if (slipResult.status !== 200) {
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
            const errorMessage =
                (slipResult.message && errorMessages[slipResult.message]) ||
                slipResult.message ||
                "เกิดข้อผิดพลาดในการตรวจสอบ";
            return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
        }

        const amount = slipResult.data?.amount?.amount || 0;
        if (amount <= 0) {
            return NextResponse.json(
                { success: false, message: "ไม่สามารถอ่านจำนวนเงินจากสลิปได้" },
                { status: 400 }
            );
        }

        const existingTopup = await db.query.topups.findFirst({
            where: eq(topups.transactionRef, slipResult.data?.transRef ?? ""),
        });
        if (existingTopup) {
            return NextResponse.json(
                { success: false, message: "สลิปนี้เคยใช้เติมเงินแล้ว" },
                { status: 400 }
            );
        }

        const topupId = crypto.randomUUID();

        await db.transaction(async (tx) => {
            await tx.insert(topups).values({
                id: topupId,
                userId: user.id,
                amount: String(amount),
                proofImage: validation.proofImageData.substring(0, 500),
                status: "APPROVED",
                transactionRef: slipResult.data?.transRef,
                senderName: slipResult.data?.sender?.account?.name?.th || null,
                senderBank: slipResult.data?.sender?.bank?.name || null,
                receiverName: slipResult.data?.receiver?.account?.name?.th || null,
                receiverBank: slipResult.data?.receiver?.bank?.name || null,
                createdAt: mysqlNow(),
            });

            await tx.update(users).set({
                creditBalance: sql`creditBalance + ${amount}`,
                totalTopup: sql`totalTopup + ${amount}`,
            }).where(eq(users.id, user.id));
        });

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.TOPUP_REQUEST,
            resource: "TopupRequest",
            resourceId: topupId,
            resourceName: `฿${amount.toLocaleString()}`,
            details: {
                amount,
                transRef: slipResult.data?.transRef,
                senderName: slipResult.data?.sender?.account?.name?.th,
                status: "APPROVED",
            },
        });

        return NextResponse.json({
            success: true,
            message: `เติมเงินสำเร็จ! ได้รับ ฿${amount.toLocaleString()}`,
            data: {
                topupId,
                amount,
                senderName: slipResult.data?.sender?.account?.name?.th,
                senderBank: slipResult.data?.sender?.bank?.name,
                transRef: slipResult.data?.transRef,
            },
        });
    } catch (error) {
        console.error("Topup error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่" },
            { status: 500 }
        );
    }
}
