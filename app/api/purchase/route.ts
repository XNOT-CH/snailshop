import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { sendEmail } from "@/lib/mail";
import { PurchaseReceiptEmail } from "@/components/emails/PurchaseReceiptEmail";
import {
    type PublicCurrencySettings,
} from "@/lib/currencySettings";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { checkPurchaseRateLimit, getClientIp } from "@/lib/rateLimit";
import { resolveSiteName } from "@/lib/seo";
import { assertPinForProtectedAction } from "@/lib/security/pin";
import {
    executeSingleProductPurchaseTransaction,
    getActivePrice,
    getRawTransactionConnection,
    type PurchaseTransactionUser,
} from "@/lib/features/orders/purchase";

async function getAuthUser() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return { error: "กรุณาเข้าสู่ระบบก่อน", status: 401 } as const;
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) {
        return { error: "ไม่พบผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่", status: 404 } as const;
    }

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            creditBalance: String(user.creditBalance ?? "0"),
            pointBalance: Number(user.pointBalance ?? 0),
        },
    } as const;
}

function sendPurchaseReceipt(
    email: string | null,
    name: string | null,
    result: { finalPrice: number; product: { name: string; currency?: string | null } } | undefined,
    currencySettings: PublicCurrencySettings | null,
    siteName: string,
) {
    if (!email || !result) {
        return;
    }

    const isPointPurchase = result.product.currency === "POINT";

    return sendEmail({
        to: email,
        subject: `ใบเสร็จรับเงิน ${siteName} - สั่งซื้อสินค้า 1 รายการ`,
        react: PurchaseReceiptEmail({
            siteName,
            userName: name || "ลูกค้า",
            orderCount: 1,
            totalTHB: isPointPurchase ? 0 : result.finalPrice,
            totalPoints: isPointPurchase ? result.finalPrice : 0,
            items: [
                {
                    productName: result.product.name,
                    price: result.finalPrice,
                    currency: result.product.currency || "THB",
                },
            ],
            currencySettings,
        }),
    }).catch((error) => {
        console.error("Failed to send email receipt:", error);
    });
}

export async function POST(request: NextRequest) {
    const maintenance = getMaintenanceState("purchase");
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
    const rateLimit = checkPurchaseRateLimit(ip);
    if (rateLimit.blocked) {
        return NextResponse.json(
            { success: false, message: "คำขอซื้อถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง" },
            {
                status: 429,
                headers: {
                    "Retry-After": String(Math.max(1, Math.ceil((rateLimit.retryAfter ?? 1000) / 1000))),
                },
            },
        );
    }

    try {
        const { productId, quantity, promoCode, pin } = await request.json();

        if (!productId) {
            return NextResponse.json({ success: false, message: "Product ID is required" }, { status: 400 });
        }

        const qty = typeof quantity === "number" ? quantity : 1;
        if (!Number.isFinite(qty) || qty < 1 || !Number.isInteger(qty)) {
            return NextResponse.json({ success: false, message: "Quantity must be a positive integer" }, { status: 400 });
        }

        const authRes = await getAuthUser();
        if ("error" in authRes) {
            return NextResponse.json({ success: false, message: authRes.error }, { status: authRes.status });
        }
        const { user } = authRes;
        const [currencySettings, siteSettings] = await Promise.all([
            getCurrencySettings().catch(() => null),
            getSiteSettings(),
        ]);
        const siteName = resolveSiteName(siteSettings?.heroTitle);

        const pinCheck = await assertPinForProtectedAction(user.id, typeof pin === "string" ? pin : undefined);
        if (!pinCheck.success) {
            return NextResponse.json({ success: false, message: pinCheck.message }, { status: pinCheck.status });
        }

        const conn = await getRawTransactionConnection();
        const result = await executeSingleProductPurchaseTransaction({
            conn,
            productId,
            qty,
            user: user as PurchaseTransactionUser,
            promoCode: typeof promoCode === "string" ? promoCode : undefined,
            currencySettings,
        });

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.PURCHASE,
            userId: user.id,
            resource: "Order",
            resourceId: result.order.id,
            resourceName: result.product.name,
            details: {
                resourceName: result.product.name,
                productId,
                orderId: result.order.id,
                promoCode: result.promoData?.code,
                unitPrice: getActivePrice(result.product),
                currency: result.product.currency || "THB",
                quantity: qty,
                totalPrice: result.finalPrice,
            },
        });

        void sendPurchaseReceipt(user.email, user.name, result, currencySettings, siteName);

        return NextResponse.json({
            success: true,
            message: "ซื้อสำเร็จ! 🎉",
            orderId: result.order.id,
            productName: result.product.name,
        });
    } catch (error) {
        console.error("Purchase error:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการซื้อ",
            },
            { status: error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 400 }
        );
    }
}
