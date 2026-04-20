import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, orders, products, promoCodes, promoUsages, users } from "@/lib/db";
import { eq, inArray, sql } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/encryption";
import { splitStock, getDelimiter } from "@/lib/stock";
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
import { validatePromoCode } from "@/lib/promo";
import { resolveSiteName } from "@/lib/seo";
import { assertPinForProtectedAction } from "@/lib/security/pin";

type ProductRow = {
    id: string;
    name: string;
    price: string | number;
    discountPrice?: string | number | null;
    currency?: string | null;
    category?: string | null;
    isSold: boolean;
    secretData?: string | null;
    stockSeparator?: string | null;
    autoDeleteAfterSale?: string | number | null;
};

type AppliedPromo = {
    id: string;
    code: string;
    discountAmount: number;
};

type PurchaseContext = {
    productIds: string[];
    userId: string;
    promoCode?: string | null;
    user: {
        creditBalance: string | number;
        pointBalance?: string | number | null;
    };
};

const MSG_SELECT_PRODUCTS = "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ";
const MSG_MAX_PRODUCTS = "ไม่สามารถซื้อสินค้ามากกว่า 50 รายการในครั้งเดียว";
const MSG_LOGIN_REQUIRED = "กรุณาเข้าสู่ระบบก่อน";
const MSG_USER_NOT_FOUND = "ไม่พบผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่";
const MSG_PRODUCTS_NOT_FOUND = "บางสินค้าไม่พบในระบบ";
const MSG_INSUFFICIENT_CREDIT = "เครดิตไม่เพียงพอ";
const MSG_PURCHASE_ERROR = "เกิดข้อผิดพลาดในการซื้อ";
const MSG_GENERIC_ERROR = "เกิดข้อผิดพลาด";

function toCents(value: string | number) {
    return Math.round(Number(value) * 100);
}

function fromCents(value: number) {
    return value / 100;
}

function getActivePrice(product: ProductRow) {
    return Number(product.discountPrice ?? product.price);
}

function getCartPromoCategory(productList: ProductRow[]) {
    const categories = Array.from(
        new Set(
            productList
                .filter((product) => product.currency === "THB" || !product.currency)
                .map((product) => product.category?.trim())
                .filter(Boolean)
        )
    );

    return categories.length === 1 ? categories[0] ?? null : null;
}

async function getAppliedPromo(
    promoCode: string | null | undefined,
    totalTHB: number,
    productList: ProductRow[],
    userId: string
): Promise<AppliedPromo | null> {
    if (!promoCode || totalTHB <= 0) {
        return null;
    }

    const result = await validatePromoCode({
        code: promoCode,
        totalPrice: totalTHB,
        productCategory: getCartPromoCategory(productList),
        userId,
    });

    if (!result.valid) {
        throw new Error(result.message);
    }

    return {
        id: result.promo.id,
        code: result.promo.code,
        discountAmount: result.discountAmount ?? 0,
    };
}

function buildDiscountedThbPriceMap(productList: ProductRow[], discountAmount: number) {
    const thbProducts = productList.filter((product) => product.currency === "THB" || !product.currency);
    const totalThbCents = thbProducts.reduce((sum, product) => sum + toCents(getActivePrice(product)), 0);
    const totalDiscountCents = Math.min(toCents(discountAmount), totalThbCents);
    const priceMap = new Map<string, number>();

    if (thbProducts.length === 0 || totalDiscountCents <= 0 || totalThbCents <= 0) {
        thbProducts.forEach((product) => {
            priceMap.set(product.id, getActivePrice(product));
        });
        return priceMap;
    }

    let distributedDiscountCents = 0;

    thbProducts.forEach((product, index) => {
        const baseCents = toCents(getActivePrice(product));
        const discountCents = index === thbProducts.length - 1
            ? totalDiscountCents - distributedDiscountCents
            : Math.min(baseCents, Math.floor((totalDiscountCents * baseCents) / totalThbCents));

        distributedDiscountCents += discountCents;
        priceMap.set(product.id, fromCents(Math.max(0, baseCents - discountCents)));
    });

    return priceMap;
}

function getAutoDeleteTimestamp(delayMinutes?: string | number | null) {
    if (!delayMinutes) return null;

    const deleteAt = new Date();
    deleteAt.setMinutes(deleteAt.getMinutes() + Number(delayMinutes));
    return deleteAt.toISOString().slice(0, 19).replace("T", " ");
}

function validateAndSummarizeProducts(
    productList: ProductRow[],
    productIds: string[],
    user: PurchaseContext["user"],
    currencySettings?: PublicCurrencySettings | null,
) {
    if (productList.length !== productIds.length) {
        throw new Error(MSG_PRODUCTS_NOT_FOUND);
    }

    const soldProducts = productList.filter((product) => product.isSold);
    if (soldProducts.length > 0) {
        const err: Error & { soldProductIds?: string[] } = new Error(
            `สินค้าบางรายการถูกขายไปแล้ว: ${soldProducts.map((product) => product.name).join(", ")}`
        );
        err.soldProductIds = soldProducts.map((product) => product.id);
        throw err;
    }

    const totalTHB = productList
        .filter((product) => product.currency === "THB" || !product.currency)
        .reduce((sum, product) => sum + Number(product.discountPrice ?? product.price), 0);
    const totalPoints = productList
        .filter((product) => product.currency === "POINT")
        .reduce((sum, product) => sum + Number(product.discountPrice ?? product.price), 0);

    if (totalTHB > 0 && Number(user.creditBalance) < totalTHB) {
        throw new Error(
            `${MSG_INSUFFICIENT_CREDIT} (ต้องการ ${formatCurrencyAmount(totalTHB, "THB", currencySettings)} แต่มี ${formatCurrencyAmount(Number(user.creditBalance), "THB", currencySettings)})`,
        );
    }
    if (totalPoints > 0 && Number(user.pointBalance ?? 0) < totalPoints) {
        throw new Error(
            `${getPointCurrencyName(currencySettings)}ไม่เพียงพอ (ต้องการ ${formatCurrencyAmount(totalPoints, "POINT", currencySettings)} แต่มี ${formatCurrencyAmount(Number(user.pointBalance ?? 0), "POINT", currencySettings)})`,
        );
    }

    return { totalTHB, totalPoints };
}

async function executeWithRawConnection(
    { productIds, userId, user, promoCode }: PurchaseContext,
    currencySettings?: PublicCurrencySettings | null,
) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = await (db as any).$client.getConnection();

    try {
        await conn.beginTransaction();

        const [rows] = await conn.execute(
            `SELECT id, name, price, discountPrice, currency, category, isSold, secretData, stockSeparator, autoDeleteAfterSale
             FROM Product WHERE id IN (${productIds.map(() => "?").join(",")}) FOR UPDATE`,
            productIds
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const productList = rows as any as ProductRow[];
        const { totalTHB, totalPoints } = validateAndSummarizeProducts(productList, productIds, user, currencySettings);
        const appliedPromo = await getAppliedPromo(promoCode, totalTHB, productList, userId);
        const discountedPriceMap = buildDiscountedThbPriceMap(productList, appliedPromo?.discountAmount ?? 0);
        const finalTotalTHB = productList
            .filter((product) => product.currency === "THB" || !product.currency)
            .reduce((sum, product) => sum + (discountedPriceMap.get(product.id) ?? getActivePrice(product)), 0);

        const orderResults = [];
        for (const product of productList) {
            const decrypted = decrypt(product.secretData || "");
            const separatorType = product.stockSeparator || "newline";
            const stockItems = splitStock(decrypted, separatorType);

            if (stockItems.length === 0) throw new Error(`สินค้าหมดสต็อก: ${product.name}`);

            const [givenItem, ...remaining] = stockItems;
            const remainingData = remaining.join(getDelimiter(separatorType));
            const isLastStock = remaining.length === 0;
            const orderId = crypto.randomUUID();
            const unitPrice = product.currency === "THB" || !product.currency
                ? (discountedPriceMap.get(product.id) ?? getActivePrice(product))
                : getActivePrice(product);

            await conn.execute(
                "INSERT INTO `Order` (id, userId, totalPrice, status, givenData) VALUES (?, ?, ?, 'COMPLETED', ?)",
                [orderId, userId, String(unitPrice), encrypt(givenItem)]
            );

            await conn.execute(
                "UPDATE Product SET secretData = ?, isSold = ?, orderId = ?, scheduledDeleteAt = ? WHERE id = ?",
                [
                    isLastStock ? encrypt(givenItem) : encrypt(remainingData),
                    isLastStock ? 1 : 0,
                    orderId,
                    isLastStock ? getAutoDeleteTimestamp(product.autoDeleteAfterSale) : null,
                    product.id,
                ]
            );

            orderResults.push({
                orderId,
                productName: product.name,
                price: unitPrice,
                currency: product.currency || "THB",
            });
        }

        if (totalTHB > 0) {
            await conn.execute(
                "UPDATE User SET creditBalance = creditBalance - ? WHERE id = ?",
                [finalTotalTHB, userId]
            );
        }
        if (totalPoints > 0) {
            await conn.execute(
                "UPDATE User SET pointBalance = pointBalance - ? WHERE id = ?",
                [totalPoints, userId]
            );
        }

        if (appliedPromo) {
            await conn.execute(
                "UPDATE PromoCode SET usedCount = usedCount + 1 WHERE id = ?",
                [appliedPromo.id]
            );
            await conn.execute(
                "INSERT INTO PromoUsage (id, promoCodeId, userId, orderId, promoCode, discountAmount, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', NOW(), NOW())",
                [
                    crypto.randomUUID(),
                    appliedPromo.id,
                    userId,
                    orderResults[0]?.orderId ?? null,
                    appliedPromo.code,
                    appliedPromo.discountAmount.toFixed(2),
                ]
            );
        }

        await conn.commit();
        return { orderResults, totalTHB: finalTotalTHB, totalPoints, promoCode: appliedPromo?.code ?? null, discountAmount: appliedPromo?.discountAmount ?? 0 };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

async function executeWithDrizzleTransaction(
    { productIds, userId, user, promoCode }: PurchaseContext,
    currencySettings?: PublicCurrencySettings | null,
) {
    return db.transaction(async (tx) => {
        const productList = await tx.select().from(products).where(inArray(products.id, productIds)) as ProductRow[];
        const { totalTHB, totalPoints } = validateAndSummarizeProducts(productList, productIds, user, currencySettings);
        const appliedPromo = await getAppliedPromo(promoCode, totalTHB, productList, userId);
        const discountedPriceMap = buildDiscountedThbPriceMap(productList, appliedPromo?.discountAmount ?? 0);
        const finalTotalTHB = productList
            .filter((product) => product.currency === "THB" || !product.currency)
            .reduce((sum, product) => sum + (discountedPriceMap.get(product.id) ?? getActivePrice(product)), 0);

        const orderResults = [];
        for (const product of productList) {
            const decrypted = product.secretData ? decrypt(product.secretData) : "test-stock";
            const separatorType = product.stockSeparator || "newline";
            const stockItems = splitStock(decrypted, separatorType);

            if (stockItems.length === 0) throw new Error(`สินค้าหมดสต็อก: ${product.name}`);

            const [givenItem, ...remaining] = stockItems;
            const remainingData = remaining.join(getDelimiter(separatorType));
            const isLastStock = remaining.length === 0;
            const orderId = crypto.randomUUID();
            const unitPrice = product.currency === "THB" || !product.currency
                ? (discountedPriceMap.get(product.id) ?? getActivePrice(product))
                : getActivePrice(product);

            await tx.insert(orders).values({
                id: orderId,
                userId,
                totalPrice: String(unitPrice),
                status: "COMPLETED",
                givenData: encrypt(givenItem),
            });

            await tx.update(products).set({
                secretData: isLastStock ? encrypt(givenItem) : encrypt(remainingData),
                isSold: isLastStock,
                orderId,
                scheduledDeleteAt: isLastStock ? getAutoDeleteTimestamp(product.autoDeleteAfterSale) : null,
            }).where(eq(products.id, product.id));

            orderResults.push({
                orderId,
                productName: product.name,
                price: unitPrice,
                currency: product.currency || "THB",
            });
        }

        if (totalTHB > 0) {
            await tx.update(users).set({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                creditBalance: sql`creditBalance - ${finalTotalTHB}` as any,
            }).where(eq(users.id, userId));
        }
        if (totalPoints > 0) {
            await tx.update(users).set({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                pointBalance: sql`pointBalance - ${totalPoints}` as any,
            }).where(eq(users.id, userId));
        }

        if (appliedPromo) {
            await tx.update(promoCodes).set({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                usedCount: sql`usedCount + 1` as any,
            }).where(eq(promoCodes.id, appliedPromo.id));

            await tx.insert(promoUsages).values({
                id: crypto.randomUUID(),
                promoCodeId: appliedPromo.id,
                userId,
                orderId: orderResults[0]?.orderId ?? null,
                promoCode: appliedPromo.code,
                discountAmount: appliedPromo.discountAmount.toFixed(2),
                status: "COMPLETED",
            });
        }

        return { orderResults, totalTHB: finalTotalTHB, totalPoints, promoCode: appliedPromo?.code ?? null, discountAmount: appliedPromo?.discountAmount ?? 0 };
    });
}

async function runCheckoutTransaction(
    context: PurchaseContext,
    currencySettings?: PublicCurrencySettings | null,
) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((db as any).$client?.getConnection) {
        return executeWithRawConnection(context, currencySettings);
    }

    return executeWithDrizzleTransaction(context, currencySettings);
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
        const { productIds, promoCode, pin } = await request.json();

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return NextResponse.json({ success: false, message: MSG_SELECT_PRODUCTS }, { status: 400 });
        }

        if (productIds.length > 50) {
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
            const { orderResults, totalTHB, totalPoints } = await runCheckoutTransaction({
                productIds,
                userId,
                user,
                promoCode: typeof promoCode === "string" ? promoCode : null,
            }, currencySettings);

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
                purchasedCount: orderResults.length,
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
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : MSG_GENERIC_ERROR },
            { status: 500 }
        );
    }
}
