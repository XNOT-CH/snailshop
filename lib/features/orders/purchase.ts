import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { splitStock, getDelimiter } from "@/lib/stock";
import {
    calculatePromoDiscountAmount,
    getPromoValidationMessage,
    type PromoRecord,
} from "@/lib/promo";
import {
    formatCurrencyAmount,
    getPointCurrencyName,
    type PublicCurrencySettings,
} from "@/lib/currencySettings";

export type CheckoutItemInput = {
    productId: string;
    quantity: number;
};

export type PurchaseTransactionUser = {
    id: string;
    creditBalance: string | number;
    pointBalance: string | number | null | undefined;
};

export type PurchaseProductRow = {
    id: string;
    name: string;
    price: string | number;
    discountPrice?: string | number | null;
    currency?: string | null;
    category?: string | null;
    isSold: boolean | number;
    secretData?: string | null;
    stockSeparator?: string | null;
    orderId?: string | null;
    autoDeleteAfterSale?: string | number | null;
};

export type PurchasePromoData = {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    maxDiscount: number | null;
    discountAmount: number;
};

type RawConnection = {
    beginTransaction: () => Promise<void>;
    execute: (query: string, params?: unknown[]) => Promise<[unknown]>;
    commit: () => Promise<void>;
    rollback: () => Promise<void>;
    release: () => void;
};

const PROMO_COLUMNS_SQL = [
    "id",
    "code",
    "codeType",
    "discountType",
    "discountValue",
    "minPurchase",
    "maxDiscount",
    "usageLimit",
    "usagePerUser",
    "usedCount",
    "startsAt",
    "expiresAt",
    "applicableCategories",
    "excludedCategories",
    "isNewUserOnly",
    "isActive",
].join(", ");

const PRODUCT_COLUMNS_SQL = [
    "id",
    "name",
    "price",
    "discountPrice",
    "currency",
    "category",
    "isSold",
    "secretData",
    "stockSeparator",
    "orderId",
    "autoDeleteAfterSale",
].join(", ");

export function getActivePrice(product: PurchaseProductRow) {
    return Number(product.discountPrice ?? product.price);
}

export function processStock(decryptedData: string, separatorType: string, qty: number) {
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

export function getAutoDeleteTimestamp(delayMinutes?: string | number | null) {
    if (!delayMinutes) return null;

    const deleteAt = new Date();
    deleteAt.setMinutes(deleteAt.getMinutes() + Number(delayMinutes));
    return deleteAt.toISOString().slice(0, 19).replace("T", " ");
}

function normalizeCartPromoCategory(productList: PurchaseProductRow[]) {
    const categories = Array.from(
        new Set(
            productList
                .filter((product) => product.currency === "THB" || !product.currency)
                .map((product) => product.category?.trim())
                .filter(Boolean),
        ),
    );

    return categories.length === 1 ? categories[0] ?? null : null;
}

export function buildDiscountedThbPriceMap(
    productList: PurchaseProductRow[],
    items: CheckoutItemInput[],
    discountAmount: number,
) {
    const thbProducts = items
        .map((item) => {
            const product = productList.find((candidate) => candidate.id === item.productId);
            if (!product || (product.currency !== "THB" && product.currency)) {
                return null;
            }

            return {
                productId: item.productId,
                subtotal: getActivePrice(product) * item.quantity,
            };
        })
        .filter(Boolean) as Array<{ productId: string; subtotal: number }>;
    const totalThbCents = thbProducts.reduce((sum, product) => sum + Math.round(product.subtotal * 100), 0);
    const totalDiscountCents = Math.min(Math.round(discountAmount * 100), totalThbCents);
    const priceMap = new Map<string, number>();

    if (thbProducts.length === 0 || totalDiscountCents <= 0 || totalThbCents <= 0) {
        thbProducts.forEach((product) => {
            priceMap.set(product.productId, product.subtotal);
        });
        return priceMap;
    }

    let distributedDiscountCents = 0;

    thbProducts.forEach((product, index) => {
        const baseCents = Math.round(product.subtotal * 100);
        const discountCents = index === thbProducts.length - 1
            ? totalDiscountCents - distributedDiscountCents
            : Math.min(baseCents, Math.floor((totalDiscountCents * baseCents) / totalThbCents));

        distributedDiscountCents += discountCents;
        priceMap.set(product.productId, Math.max(0, baseCents - discountCents) / 100);
    });

    return priceMap;
}

export function validateAndSummarizeCartProducts(
    productList: PurchaseProductRow[],
    items: CheckoutItemInput[],
    user: PurchaseTransactionUser,
    currencySettings?: PublicCurrencySettings | null,
    options: { checkThbBalance?: boolean } = {},
) {
    const checkThbBalance = options.checkThbBalance ?? true;

    if (productList.length !== items.length) {
        throw new Error("บางสินค้าไม่พบในระบบ");
    }

    const soldProducts = productList.filter((product) => Boolean(product.isSold));
    if (soldProducts.length > 0) {
        const err: Error & { soldProductIds?: string[] } = new Error(
            `สินค้าบางรายการถูกขายไปแล้ว: ${soldProducts.map((product) => product.name).join(", ")}`,
        );
        err.soldProductIds = soldProducts.map((product) => product.id);
        throw err;
    }

    const totalTHB = productList.reduce((sum, product) => {
        const item = items.find((candidate) => candidate.productId === product.id);
        if (!item || (product.currency !== "THB" && product.currency)) {
            return sum;
        }

        return sum + (getActivePrice(product) * item.quantity);
    }, 0);

    const totalPoints = productList.reduce((sum, product) => {
        const item = items.find((candidate) => candidate.productId === product.id);
        if (!item || product.currency !== "POINT") {
            return sum;
        }

        return sum + (getActivePrice(product) * item.quantity);
    }, 0);

    if (checkThbBalance && totalTHB > 0 && Number(user.creditBalance) < totalTHB) {
        throw new Error(
            `เครดิตไม่เพียงพอ (ต้องการ ${formatCurrencyAmount(totalTHB, "THB", currencySettings)} แต่มี ${formatCurrencyAmount(Number(user.creditBalance), "THB", currencySettings)})`,
        );
    }

    if (totalPoints > 0 && Number(user.pointBalance ?? 0) < totalPoints) {
        throw new Error(
            `${getPointCurrencyName(currencySettings)}ไม่เพียงพอ (ต้องการ ${formatCurrencyAmount(totalPoints, "POINT", currencySettings)} แต่มี ${formatCurrencyAmount(Number(user.pointBalance ?? 0), "POINT", currencySettings)})`,
        );
    }

    return {
        totalTHB,
        totalPoints,
        productCategory: normalizeCartPromoCategory(productList),
    };
}

export async function getRawTransactionConnection() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getConnection = (db as any).$client?.getConnection;
    if (typeof getConnection !== "function") {
        throw new Error("Purchases require a transactional MySQL connection");
    }

    return getConnection() as Promise<RawConnection>;
}

export async function validatePromoInTransaction(
    conn: RawConnection,
    promoCode: string,
    userId: string,
    totalPrice: number,
    productCategory: string | null | undefined,
): Promise<PurchasePromoData> {
    const [promoRows] = await conn.execute(
        `SELECT ${PROMO_COLUMNS_SQL} FROM PromoCode WHERE code = ? FOR UPDATE`,
        [promoCode.trim().toUpperCase()],
    );
    const promo = (promoRows as PromoRecord[])[0];

    if (!promo) {
        throw new Error("โค้ดส่วนลดไม่ถูกต้อง");
    }

    let completedOrderExists = false;
    if (promo.isNewUserOnly) {
        const [orderRows] = await conn.execute(
            "SELECT id FROM `Order` FORCE INDEX (idx_order_user_status) WHERE userId = ? AND status = 'COMPLETED' LIMIT 1",
            [userId],
        );
        completedOrderExists = Array.isArray(orderRows) && orderRows.length > 0;
    }

    let userPromoUsageCount = 0;
    if (promo.usagePerUser !== null && promo.usagePerUser !== undefined) {
        const [usageRows] = await conn.execute(
            "SELECT COUNT(*) AS count FROM PromoUsage WHERE promoCodeId = ? AND userId = ? AND status <> 'REVERTED'",
            [promo.id, userId],
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

export async function executeSingleProductPurchaseTransaction(params: {
    conn: RawConnection;
    productId: string;
    qty: number;
    user: PurchaseTransactionUser;
    promoCode?: string;
    currencySettings?: PublicCurrencySettings | null;
}) {
    const { conn, productId, qty, user, promoCode, currencySettings } = params;

    try {
        await conn.beginTransaction();

        const [productRows] = await conn.execute(
            `SELECT ${PRODUCT_COLUMNS_SQL} FROM Product WHERE id = ? FOR UPDATE`,
            [productId],
        );
        const product = (productRows as PurchaseProductRow[])[0];

        if (!product) throw new Error("ไม่พบสินค้านี้ในระบบ");
        if (Boolean(product.isSold)) throw new Error("สินค้านี้ถูกขายไปแล้ว");

        const unitPrice = getActivePrice(product);
        const baseTotalPrice = unitPrice * qty;
        const isPointCurrency = product.currency === "POINT";
        if (isPointCurrency && promoCode) {
            throw new Error("โค้ดส่วนลดใช้ได้เฉพาะสินค้าสกุลเงินบาท");
        }

        const promoData = !isPointCurrency && promoCode
            ? await validatePromoInTransaction(conn, promoCode, user.id, baseTotalPrice, product.category)
            : null;
        const totalPrice = Math.max(
            0,
            Math.round((baseTotalPrice - (promoData?.discountAmount ?? 0)) * 100) / 100,
        );
        const userBalance = isPointCurrency ? Number(user.pointBalance ?? 0) : Number(user.creditBalance);

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
                `${isPointCurrency ? getPointCurrencyName(currencySettings) : "เครดิต"}ไม่เพียงพอ (ต้องการ ${requiredAmount} แต่มี ${currentAmount})`,
            );
        }

        const decryptedData = decrypt(product.secretData || "");
        const separatorType = product.stockSeparator || "newline";
        const { givenJoined, remainingData, isLastStock } = processStock(decryptedData, separatorType, qty);

        const orderId = crypto.randomUUID();
        await conn.execute(
            "INSERT INTO `Order` (id, userId, totalPrice, status, givenData) VALUES (?, ?, ?, 'COMPLETED', ?)",
            [orderId, user.id, totalPrice, encrypt(givenJoined)],
        );

        if (isPointCurrency) {
            await conn.execute(
                "UPDATE User SET pointBalance = pointBalance - ? WHERE id = ?",
                [Math.round(totalPrice), user.id],
            );
        } else {
            await conn.execute(
                "UPDATE User SET creditBalance = creditBalance - ? WHERE id = ?",
                [totalPrice, user.id],
            );
        }

        await conn.execute(
            "UPDATE Product SET secretData = ?, isSold = ?, orderId = ?, scheduledDeleteAt = ? WHERE id = ?",
            [
                encrypt(remainingData),
                isLastStock ? 1 : 0,
                orderId,
                isLastStock ? getAutoDeleteTimestamp(product.autoDeleteAfterSale) : null,
                productId,
            ],
        );

        if (promoData) {
            await conn.execute(
                "UPDATE PromoCode SET usedCount = usedCount + 1 WHERE id = ?",
                [promoData.id],
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
                ],
            );
        }

        await conn.commit();

        return {
            order: { id: orderId },
            product,
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

export async function executeCartPurchaseTransaction(params: {
    conn: RawConnection;
    items: CheckoutItemInput[];
    userId: string;
    user: PurchaseTransactionUser;
    promoCode?: string | null;
    currencySettings?: PublicCurrencySettings | null;
}) {
    const { conn, items, userId, user, promoCode, currencySettings } = params;
    const productIds = items.map((item) => item.productId);

    try {
        await conn.beginTransaction();

        const [rows] = await conn.execute(
            `SELECT ${PRODUCT_COLUMNS_SQL}
             FROM Product WHERE id IN (${productIds.map(() => "?").join(",")}) FOR UPDATE`,
            productIds,
        );
        const productList = rows as PurchaseProductRow[];
        const { totalTHB, totalPoints, productCategory } = validateAndSummarizeCartProducts(
            productList,
            items,
            user,
            currencySettings,
            { checkThbBalance: false },
        );
        const appliedPromo = promoCode && totalTHB > 0
            ? await validatePromoInTransaction(conn, promoCode, userId, totalTHB, productCategory)
            : null;
        const discountedPriceMap = buildDiscountedThbPriceMap(productList, items, appliedPromo?.discountAmount ?? 0);
        const finalTotalTHB = items.reduce((sum, item) => sum + (discountedPriceMap.get(item.productId) ?? 0), 0);

        if (finalTotalTHB > 0 && Number(user.creditBalance) < finalTotalTHB) {
            throw new Error(
                `เครดิตไม่เพียงพอ (ต้องการ ${formatCurrencyAmount(finalTotalTHB, "THB", currencySettings)} แต่มี ${formatCurrencyAmount(Number(user.creditBalance), "THB", currencySettings)})`,
            );
        }

        const orderResults = [];
        for (const product of productList) {
            const item = items.find((candidate) => candidate.productId === product.id);
            if (!item) {
                continue;
            }

            const decrypted = decrypt(product.secretData || "");
            const separatorType = product.stockSeparator || "newline";
            const { givenJoined, remainingData, isLastStock } = processStock(
                decrypted,
                separatorType,
                item.quantity,
            );
            const orderId = crypto.randomUUID();
            const unitPrice = product.currency === "THB" || !product.currency
                ? (discountedPriceMap.get(product.id) ?? (getActivePrice(product) * item.quantity))
                : (getActivePrice(product) * item.quantity);

            await conn.execute(
                "INSERT INTO `Order` (id, userId, totalPrice, status, givenData) VALUES (?, ?, ?, 'COMPLETED', ?)",
                [orderId, userId, String(unitPrice), encrypt(givenJoined)],
            );

            await conn.execute(
                "UPDATE Product SET secretData = ?, isSold = ?, orderId = ?, scheduledDeleteAt = ? WHERE id = ?",
                [
                    encrypt(remainingData),
                    isLastStock ? 1 : 0,
                    orderId,
                    isLastStock ? getAutoDeleteTimestamp(product.autoDeleteAfterSale) : null,
                    product.id,
                ],
            );

            orderResults.push({
                orderId,
                productName: product.name,
                price: unitPrice,
                currency: product.currency || "THB",
                quantity: item.quantity,
            });
        }

        if (totalTHB > 0) {
            await conn.execute(
                "UPDATE User SET creditBalance = creditBalance - ? WHERE id = ?",
                [finalTotalTHB, userId],
            );
        }
        if (totalPoints > 0) {
            await conn.execute(
                "UPDATE User SET pointBalance = pointBalance - ? WHERE id = ?",
                [totalPoints, userId],
            );
        }

        if (appliedPromo) {
            await conn.execute(
                "UPDATE PromoCode SET usedCount = usedCount + 1 WHERE id = ?",
                [appliedPromo.id],
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
                ],
            );
        }

        await conn.commit();

        return {
            orderResults,
            totalTHB: finalTotalTHB,
            totalPoints,
            promoCode: appliedPromo?.code ?? null,
            discountAmount: appliedPromo?.discountAmount ?? 0,
            purchasedCount: items.reduce((sum, item) => sum + item.quantity, 0),
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}
