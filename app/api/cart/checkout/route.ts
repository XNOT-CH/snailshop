import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/mail";
import { PurchaseReceiptEmail } from "@/components/emails/PurchaseReceiptEmail";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { checkPurchaseRateLimit, getClientIp } from "@/lib/rateLimit";
import { resolveSiteName } from "@/lib/seo";
import { assertPinForProtectedAction } from "@/lib/security/pin";
import {
    executeCartPurchaseTransaction,
    getRawTransactionConnection,
    type CheckoutItemInput,
    type PurchaseTransactionUser,
} from "@/lib/features/orders/purchase";

const MSG_SELECT_PRODUCTS = "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ";
const MSG_MAX_PRODUCTS = "ไม่สามารถซื้อสินค้ามากกว่า 50 รายการในครั้งเดียว";
const MSG_LOGIN_REQUIRED = "กรุณาเข้าสู่ระบบก่อน";
const MSG_USER_NOT_FOUND = "ไม่พบผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่";
const MSG_PRODUCTS_NOT_FOUND = "บางสินค้าไม่พบในระบบ";
const MSG_PURCHASE_ERROR = "เกิดข้อผิดพลาดในการซื้อ";
const MSG_GENERIC_ERROR = "เกิดข้อผิดพลาด";
const MSG_INVALID_QUANTITY = "จำนวนสินค้าต้องเป็นจำนวนเต็มบวก";
const CHECKOUT_VALIDATION_MESSAGES = new Set([
    MSG_SELECT_PRODUCTS,
    MSG_PRODUCTS_NOT_FOUND,
    MSG_INVALID_QUANTITY,
]);

function normalizeCheckoutItems(rawItems: unknown, rawProductIds: unknown) {
    const aggregated = new Map<string, number>();

    const addItem = (productId: string, quantity: number) => {
        const trimmedId = productId.trim();
        if (!trimmedId) {
            throw new Error(MSG_PRODUCTS_NOT_FOUND);
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
            throw new Error(MSG_INVALID_QUANTITY);
        }

        aggregated.set(trimmedId, (aggregated.get(trimmedId) ?? 0) + quantity);
    };

    if (Array.isArray(rawItems)) {
        for (const item of rawItems) {
            if (!item || typeof item !== "object") {
                throw new Error(MSG_SELECT_PRODUCTS);
            }

            const { productId, quantity } = item as Partial<CheckoutItemInput>;
            if (typeof productId !== "string") {
                throw new Error(MSG_SELECT_PRODUCTS);
            }

            addItem(productId, quantity ?? 1);
        }
    } else if (Array.isArray(rawProductIds)) {
        for (const productId of rawProductIds) {
            if (typeof productId !== "string") {
                throw new Error(MSG_SELECT_PRODUCTS);
            }

            addItem(productId, 1);
        }
    } else {
        throw new Error(MSG_SELECT_PRODUCTS);
    }

    return Array.from(aggregated.entries()).map(([productId, quantity]) => ({ productId, quantity }));
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
    const rateLimit = checkPurchaseRateLimit(`${ip}:cart`);
    if (rateLimit.blocked) {
        return NextResponse.json(
            { success: false, message: "คำขอสั่งซื้อถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง" },
            {
                status: 429,
                headers: {
                    "Retry-After": String(Math.max(1, Math.ceil((rateLimit.retryAfter ?? 1000) / 1000))),
                },
            },
        );
    }

    try {
        const { items, productIds, promoCode, pin } = await request.json();
        const checkoutItems = normalizeCheckoutItems(items, productIds);

        if (checkoutItems.length === 0) {
            return NextResponse.json({ success: false, message: MSG_SELECT_PRODUCTS }, { status: 400 });
        }

        const totalRequestedQuantity = checkoutItems.reduce((sum, item) => sum + item.quantity, 0);
        if (totalRequestedQuantity > 50) {
            return NextResponse.json({ success: false, message: MSG_MAX_PRODUCTS }, { status: 400 });
        }

        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) return NextResponse.json({ success: false, message: MSG_LOGIN_REQUIRED }, { status: 401 });

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { id: true, creditBalance: true, pointBalance: true },
        });
        if (!user) return NextResponse.json({ success: false, message: MSG_USER_NOT_FOUND }, { status: 404 });
        const pinCheck = await assertPinForProtectedAction(user.id, pin);
        if (!pinCheck.success) {
            return NextResponse.json({ success: false, message: pinCheck.message }, { status: pinCheck.status });
        }
        const [currencySettings, siteSettings] = await Promise.all([
            getCurrencySettings().catch(() => null),
            getSiteSettings(),
        ]);
        const siteName = resolveSiteName(siteSettings?.heroTitle);

        try {
            const conn = await getRawTransactionConnection();
            const { orderResults, totalTHB, totalPoints, purchasedCount } = await executeCartPurchaseTransaction({
                conn,
                items: checkoutItems,
                userId,
                user: user as PurchaseTransactionUser,
                promoCode: typeof promoCode === "string" ? promoCode : null,
                currencySettings,
            });

            if (session?.user?.email) {
                void sendEmail({
                    to: session.user.email,
                    subject: `ใบเสร็จรับเงิน ${siteName} - คำสั่งซื้อ ${orderResults.length} รายการ`,
                    react: PurchaseReceiptEmail({
                        siteName,
                        userName: session?.user?.name || "ลูกค้า",
                        orderCount: orderResults.length,
                        totalTHB,
                        totalPoints,
                        items: orderResults,
                        currencySettings,
                    }),
                }).catch((error) => console.error("Failed to send email:", error));
            }

            return NextResponse.json({
                success: true,
                message: "ซื้อสำเร็จ!",
                purchasedCount,
                totalTHB,
                totalPoints,
                promoCode: typeof promoCode === "string" ? promoCode.trim().toUpperCase() : null,
                orders: orderResults,
            });
        } catch (txError) {
            const soldProductIds = (txError as Error & { soldProductIds?: string[] }).soldProductIds;
            return NextResponse.json(
                {
                    success: false,
                    message: txError instanceof Error ? txError.message : MSG_PURCHASE_ERROR,
                    soldProductIds: soldProductIds || [],
                },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error("Cart checkout error:", error);
        if (error instanceof Error && CHECKOUT_VALIDATION_MESSAGES.has(error.message)) {
            return NextResponse.json(
                { success: false, message: error.message },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : MSG_GENERIC_ERROR },
            { status: 500 }
        );
    }
}
