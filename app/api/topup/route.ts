import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, users, topups } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

const EASYSLIP_API_URL = "https://developer.easyslip.com/api/v1/verify";

interface SlipVerificationResult {
    status: number; message?: string;
    data?: {
        payload: string; transRef: string; date: string; countryCode: string;
        amount: { amount: number; local: { amount?: number; currency?: string } };
        fee?: number; ref1?: string; ref2?: string; ref3?: string;
        sender: { bank: { id?: string; name?: string; short?: string }; account: { name: { th?: string; en?: string }; bank?: { type: string; account: string } } };
        receiver: { bank: { id: string; name?: string; short?: string }; account: { name: { th?: string; en?: string }; bank?: { type: string; account: string } } };
    };
}

async function verifySlipWithEasySlip(base64Image: string): Promise<SlipVerificationResult> {
    const token = process.env.EASYSLIP_TOKEN;
    if (!token) throw new Error("EASYSLIP_TOKEN is not configured");

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

    const formData = new FormData();
    formData.append("file", new Blob([bytes], { type: "image/jpeg" }), "slip.jpg");
    formData.append("checkDuplicate", "true");

    const response = await fetch(EASYSLIP_API_URL, {
        method: "POST", headers: { "Authorization": `Bearer ${token}` }, body: formData,
    });
    return response.json() as Promise<SlipVerificationResult>;
}

export async function POST(request: NextRequest) {
    try {
        const { proofImage } = await request.json();
        if (!proofImage) return NextResponse.json({ success: false, message: "กรุณาอัปโหลดสลิปการโอนเงิน" }, { status: 400 });

        const cookieStore = await cookies();
        const userId = cookieStore.get("userId")?.value;
        if (!userId) return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

        const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
        if (!user) return NextResponse.json({ success: false, message: "ไม่พบผู้ใช้งาน" }, { status: 404 });

        let slipResult: SlipVerificationResult;
        try {
            slipResult = await verifySlipWithEasySlip(proofImage);
        } catch (error) {
            return NextResponse.json({ success: false, message: "ไม่สามารถตรวจสอบสลิปได้ กรุณาลองใหม่" }, { status: 500 });
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
                quota_exceeded: "ระบบตรวจสลิปเต็มโควต้า กรุณาติดต่อแอดมิน",
            };
            const errorMessage = (slipResult.message && errorMessages[slipResult.message]) || slipResult.message || "เกิดข้อผิดพลาดในการตรวจสอบ";
            return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
        }

        const amount = slipResult.data?.amount?.amount || 0;
        if (amount <= 0) return NextResponse.json({ success: false, message: "ไม่สามารถอ่านจำนวนเงินจากสลิปได้" }, { status: 400 });

        const existingTopup = await db.query.topups.findFirst({ where: eq(topups.transactionRef, slipResult.data?.transRef ?? "") });
        if (existingTopup) return NextResponse.json({ success: false, message: "สลิปนี้เคยใช้เติมเงินแล้ว" }, { status: 400 });

        const topupId = crypto.randomUUID();
        await db.insert(topups).values({
            id: topupId, userId: user.id, amount: String(amount),
            proofImage: proofImage.substring(0, 500), status: "APPROVED",
            transactionRef: slipResult.data?.transRef,
            senderName: slipResult.data?.sender?.account?.name?.th || null,
            senderBank: slipResult.data?.sender?.bank?.name || null,
            receiverName: slipResult.data?.receiver?.account?.name?.th || null,
            receiverBank: slipResult.data?.receiver?.bank?.name || null,
        });

        await db.update(users).set({
            creditBalance: sql`creditBalance + ${amount}`,
            totalTopup: sql`totalTopup + ${amount}`,
        }).where(eq(users.id, user.id));

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.TOPUP_REQUEST, resource: "TopupRequest", resourceId: topupId,
            resourceName: `฿${amount.toLocaleString()}`,
            details: { amount, transRef: slipResult.data?.transRef, senderName: slipResult.data?.sender?.account?.name?.th, status: "APPROVED" },
        });

        return NextResponse.json({
            success: true, message: `เติมเงินสำเร็จ! ได้รับ ฿${amount.toLocaleString()}`,
            data: { topupId, amount, senderName: slipResult.data?.sender?.account?.name?.th, senderBank: slipResult.data?.sender?.bank?.name, transRef: slipResult.data?.transRef },
        });
    } catch (error) {
        console.error("Topup error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่" },
            { status: 500 }
        );
    }
}
