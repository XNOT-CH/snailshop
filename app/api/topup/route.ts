import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

// EasySlip API configuration
const EASYSLIP_API_URL = "https://developer.easyslip.com/api/v1/verify";

interface SlipVerificationResult {
    status: number;
    message?: string;
    data?: {
        payload: string;
        transRef: string;
        date: string;
        countryCode: string;
        amount: {
            amount: number;
            local: {
                amount?: number;
                currency?: string;
            };
        };
        fee?: number;
        ref1?: string;
        ref2?: string;
        ref3?: string;
        sender: {
            bank: {
                id?: string;
                name?: string;
                short?: string;
            };
            account: {
                name: {
                    th?: string;
                    en?: string;
                };
                bank?: {
                    type: string;
                    account: string;
                };
            };
        };
        receiver: {
            bank: {
                id: string;
                name?: string;
                short?: string;
            };
            account: {
                name: {
                    th?: string;
                    en?: string;
                };
                bank?: {
                    type: string;
                    account: string;
                };
            };
        };
    };
}

// Verify slip with EasySlip API
async function verifySlipWithEasySlip(base64Image: string): Promise<SlipVerificationResult> {
    const token = process.env.EASYSLIP_TOKEN;

    if (!token) {
        throw new Error("EASYSLIP_TOKEN is not configured");
    }

    // Convert base64 to binary
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // Create form data with the file
    const formData = new FormData();
    const blob = new Blob([bytes], { type: "image/jpeg" });
    formData.append("file", blob, "slip.jpg");
    formData.append("checkDuplicate", "true");

    const response = await fetch(EASYSLIP_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
        },
        body: formData,
    });

    const result = await response.json();
    return result as SlipVerificationResult;
}

export async function POST(request: NextRequest) {
    try {
        const { proofImage } = await request.json();

        if (!proofImage) {
            return NextResponse.json(
                { success: false, message: "กรุณาอัปโหลดสลิปการโอนเงิน" },
                { status: 400 }
            );
        }

        // Get logged-in user from cookie
        const cookieStore = await cookies();
        const userId = cookieStore.get("userId")?.value;

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "กรุณาเข้าสู่ระบบก่อน" },
                { status: 401 }
            );
        }

        // Find the actual user
        const user = await db.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, message: "ไม่พบผู้ใช้งาน" },
                { status: 404 }
            );
        }

        // Verify slip with EasySlip API
        let slipResult: SlipVerificationResult;
        try {
            slipResult = await verifySlipWithEasySlip(proofImage);
        } catch (error) {
            console.error("EasySlip API error:", error);
            return NextResponse.json(
                { success: false, message: "ไม่สามารถตรวจสอบสลิปได้ กรุณาลองใหม่" },
                { status: 500 }
            );
        }

        // Handle EasySlip response
        if (slipResult.status !== 200) {
            let errorMessage = "ไม่สามารถตรวจสอบสลิปได้";

            switch (slipResult.message) {
                case "invalid_payload":
                case "invalid_image":
                    errorMessage = "รูปสลิปไม่ถูกต้อง กรุณาอัปโหลดสลิปใหม่";
                    break;
                case "duplicate_slip":
                    errorMessage = "สลิปนี้เคยใช้แล้ว กรุณาใช้สลิปใหม่";
                    break;
                case "image_size_too_large":
                    errorMessage = "ขนาดรูปใหญ่เกินไป กรุณาลดขนาดรูป";
                    break;
                case "slip_not_found":
                case "qrcode_not_found":
                    errorMessage = "ไม่พบข้อมูลสลิปในระบบธนาคาร กรุณาตรวจสอบสลิปอีกครั้ง";
                    break;
                case "unauthorized":
                    errorMessage = "ระบบตรวจสลิปขัดข้อง กรุณาติดต่อแอดมิน";
                    break;
                case "quota_exceeded":
                    errorMessage = "ระบบตรวจสลิปเต็มโควต้า กรุณาติดต่อแอดมิน";
                    break;
                default:
                    errorMessage = slipResult.message || "เกิดข้อผิดพลาดในการตรวจสอบ";
            }

            return NextResponse.json(
                { success: false, message: errorMessage },
                { status: 400 }
            );
        }

        // Extract amount from slip
        const amount = slipResult.data?.amount?.amount || 0;

        if (amount <= 0) {
            return NextResponse.json(
                { success: false, message: "ไม่สามารถอ่านจำนวนเงินจากสลิปได้" },
                { status: 400 }
            );
        }

        // Check if this transaction was already processed
        const existingTopup = await db.topup.findFirst({
            where: {
                transactionRef: slipResult.data?.transRef,
            },
        });

        if (existingTopup) {
            return NextResponse.json(
                { success: false, message: "สลิปนี้เคยใช้เติมเงินแล้ว" },
                { status: 400 }
            );
        }

        // Create topup record and update user balance
        const [topup] = await db.$transaction([
            db.topup.create({
                data: {
                    userId: user.id,
                    amount: amount,
                    proofImage: proofImage.substring(0, 500), // Store truncated for reference
                    status: "APPROVED",
                    transactionRef: slipResult.data?.transRef,
                    senderName: slipResult.data?.sender?.account?.name?.th || null,
                    senderBank: slipResult.data?.sender?.bank?.name || null,
                    receiverName: slipResult.data?.receiver?.account?.name?.th || null,
                    receiverBank: slipResult.data?.receiver?.bank?.name || null,
                },
            }),
            db.user.update({
                where: { id: user.id },
                data: {
                    creditBalance: {
                        increment: amount,
                    },
                },
            }),
        ]);

        // Audit log for topup
        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.TOPUP_REQUEST,
            resource: "TopupRequest",
            resourceId: topup.id,
            resourceName: `฿${amount.toLocaleString()}`,
            details: {
                resourceName: `฿${amount.toLocaleString()}`,
                amount: amount,
                transRef: slipResult.data?.transRef,
                senderName: slipResult.data?.sender?.account?.name?.th,
                senderBank: slipResult.data?.sender?.bank?.name,
                status: "APPROVED",
            },
        });

        return NextResponse.json({
            success: true,
            message: `เติมเงินสำเร็จ! ได้รับ ฿${amount.toLocaleString()}`,
            data: {
                topupId: topup.id,
                amount: amount,
                senderName: slipResult.data?.sender?.account?.name?.th,
                senderBank: slipResult.data?.sender?.bank?.name,
                transRef: slipResult.data?.transRef,
            },
        });
    } catch (error) {
        console.error("Topup error:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่",
            },
            { status: 500 }
        );
    }
}
