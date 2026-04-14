import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/encryption";
import { splitStock, getDelimiter } from "@/lib/stock";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { sendEmail } from "@/lib/mail";
import { PurchaseReceiptEmail } from "@/components/emails/PurchaseReceiptEmail";
import {
    formatCurrencyAmount,
    getPointCurrencyName,
    type PublicCurrencySettings,
} from "@/lib/currencySettings";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { checkPurchaseRateLimit, getClientIp } from "@/lib/rateLimit";
import { resolveSiteName } from "@/lib/seo";
import {
    calculatePromoDiscountAmount,
    getPromoValidationMessage,
    type PromoRecord,
} from "@/lib/promo";

type PurchasePromoData = {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    maxDiscount: number | null;
    discountAmount: number;
};

type TransactionProductRow = {
    id: string;
    name: string;
    price: string;
    discountPrice: string | null;
    currency: string | null;
    isSold: number;
    secretData: string;
    stockSeparator: string | null;
    orderId: string | null;
    autoDeleteAfterSale?: number | null;
    category?: string | null;
};

type AuthUser = {
    id: string;
    name: string | null;
    email: string | null;
    creditBalance: string;
    pointBalance: number;
};

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

function processStock(decryptedData: string, separatorType: string, qty: number) {
    const stockItems = splitStock(decryptedData, separatorType);

    if (stockItems.length === 0) throw new Error("สินค้าหมดสต็อก");
    if (stockItems.length < qty) {
        throw new Error(`สต็อกไม่เพียงพอ (เหลือ ${stockItems.length} รายการ)`);
    }

    const givenItems = stockItems.slice(0, qty);
    const remainingItems = stockItems.slice(qty);
    const delimiter = getDelimiter(separatorType);

    return {
        givenJoined: givenItems.join(delimiter),
        remainingData: remainingItems.join(delimiter),
        isLastStock: remainingItems.length === 0,
    };
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

async function validatePromoInTransaction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conn: any,
    promoCode: string,
    userId: string,
    totalPrice: number,
    productCategory: string | null | undefined
): Promise<PurchasePromoData> {
    const [promoRows] = await conn.execute(
        "SELECT * FROM PromoCode WHERE code = ? FOR UPDATE",
        [promoCode.trim().toUpperCase()]
    );
    const promo = (promoRows as PromoRecord[])[0];

    if (!promo) {
        throw new Error("โค้ดส่วนลดไม่ถูกต้อง");
    }

    let completedOrderExists = false;
    if (promo.isNewUserOnly) {
        const [orderRows] = await conn.execute(
            "SELECT id FROM `Order` WHERE userId = ? AND status = 'COMPLETED' LIMIT 1",
            [userId]
        );
        completedOrderExists = Array.isArray(orderRows) && orderRows.length > 0;
    }

    let userPromoUsageCount = 0;
    if (promo.usagePerUser !== null && promo.usagePerUser !== undefined) {
        const [usageRows] = await conn.execute(
            "SELECT COUNT(*) AS count FROM PromoUsage WHERE promoCodeId = ? AND userId = ? AND status <> 'REVERTED'",
            [promo.id, userId]
        );
        userPromoUsageCount = Number((usageRows as Array<{ count: number | string }>)[0]?.count ?? 0);
    }

    const errorMessage = getPromoValidationMessage(promo, {
        totalPrice,
        productCategory,
        isAuthenticated: true,
        hasCompletedOrder: completedOrderExists,
        userPromoUsageCount,
    });

    if (errorMessage) {
        throw new Error(errorMessage);
    }

    const { discountAmount } = calculatePromoDiscountAmount(promo, totalPrice);

    return {
        id: promo.id,
        code: promo.code,
        discountType: promo.discountType,
        discountValue: Number(promo.discountValue),
        maxDiscount: promo.maxDiscount ? Number(promo.maxDiscount) : null,
        discountAmount: discountAmount ?? 0,
    };
}

async function executePurchaseTransaction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conn: any,
    productId: string,
    qty: number,
    user: AuthUser,
    promoCode?: string,
    currencySettings?: PublicCurrencySettings | null,
) {
    try {
        await conn.beginTransaction();

        const [productRows] = await conn.execute(
            "SELECT * FROM Product WHERE id = ? FOR UPDATE",
            [productId]
        );
        const prod = (productRows as TransactionProductRow[])[0];

        if (!prod) throw new Error("ไม่พบสินค้านี้ในระบบ");
        if (prod.isSold) throw new Error("สินค้านี้ถูกขายไปแล้ว");

        const unitPrice = prod.discountPrice ? Number(prod.discountPrice) : Number(prod.price);
        const baseTotalPrice = unitPrice * qty;
        const isPointCurrency = prod.currency === "POINT";
        if (isPointCurrency && promoCode) {
            throw new Error("โค้ดส่วนลดใช้ได้เฉพาะสินค้าสกุลเงินบาท");
        }

        const promoData = !isPointCurrency && promoCode
            ? await validatePromoInTransaction(conn, promoCode, user.id, baseTotalPrice, prod.category)
            : null;
        const totalPrice = Math.max(
            0,
            Math.round((baseTotalPrice - (promoData?.discountAmount ?? 0)) * 100) / 100
        );
        const userBalance = isPointCurrency ? Number(user.pointBalance) : Number(user.creditBalance);

        if (userBalance < totalPrice) {
            const requiredAmount = formatCurrencyAmount(
                totalPrice,
                isPointCurrency ? "POINT" : "THB",
                currencySettings,
            );
            const currentAmount = formatCurrencyAmount(
                userBalance,
                isPointCurrency ? "POINT" : "THB",
                currencySettings,
            );

            throw new Error(
                `${isPointCurrency ? getPointCurrencyName(currencySettings) : "เครดิต"}ไม่เพียงพอ (ต้องการ ${requiredAmount} แต่มี ${currentAmount})`
            );
        }

        const decryptedData = decrypt(prod.secretData || "");
        const separatorType = prod.stockSeparator || "newline";
        const { givenJoined, remainingData, isLastStock } = processStock(decryptedData, separatorType, qty);

        const orderId = crypto.randomUUID();
        await conn.execute(
            "INSERT INTO `Order` (id, userId, totalPrice, status, givenData) VALUES (?, ?, ?, 'COMPLETED', ?)",
            [orderId, user.id, totalPrice, encrypt(givenJoined)]
        );

        if (isPointCurrency) {
            await conn.execute(
                "UPDATE User SET pointBalance = pointBalance - ? WHERE id = ?",
                [Math.round(totalPrice), user.id]
            );
        } else {
            await conn.execute(
                "UPDATE User SET creditBalance = creditBalance - ? WHERE id = ?",
                [totalPrice, user.id]
            );
        }

        let scheduledDeleteAt: string | null = null;
        if (isLastStock && prod.autoDeleteAfterSale) {
            const deleteAt = new Date();
            deleteAt.setMinutes(deleteAt.getMinutes() + Number(prod.autoDeleteAfterSale));
            scheduledDeleteAt = deleteAt.toISOString().slice(0, 19).replace("T", " ");
        }

        await conn.execute(
            "UPDATE Product SET secretData = ?, isSold = ?, orderId = ?, scheduledDeleteAt = ? WHERE id = ?",
            [isLastStock ? encrypt(givenJoined) : encrypt(remainingData), isLastStock ? 1 : 0, orderId, scheduledDeleteAt, productId]
        );

        if (promoData) {
            await conn.execute(
                "UPDATE PromoCode SET usedCount = usedCount + 1 WHERE id = ?",
                [promoData.id]
            );
            await conn.execute(
                "INSERT INTO PromoUsage (id, promoCodeId, userId, orderId, promoCode, discountAmount, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', NOW(), NOW())",
                [
                    crypto.randomUUID(),
                    promoData.id,
                    user.id,
                    orderId,
                    promoData.code,
                    promoData.discountAmount.toFixed(2),
                ]
            );
        }

        await conn.commit();

        return {
            order: { id: orderId },
            product: prod,
            finalPrice: totalPrice,
            promoData,
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
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
        const { productId, quantity, promoCode } = await request.json();

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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const conn = await (db as any).$client.getConnection();
        const result = await executePurchaseTransaction(
            conn,
            productId,
            qty,
            user,
            typeof promoCode === "string" ? promoCode : undefined,
            currencySettings,
        );

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
                unitPrice: result.product.discountPrice
                    ? Number(result.product.discountPrice)
                    : Number(result.product.price || 0),
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
            { status: 400 }
        );
    }
}
