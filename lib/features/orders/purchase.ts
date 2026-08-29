import { rawDbPool } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { splitStock, getDelimiter } from "@/lib/stock";
import {
    calculatePromoDiscountAmount,
    getPromoValidationMessage,
    summarizePromoEligibleItems,
    type PromoLineItem,
    type PromoRecord,
} from "@/lib/promo";
import {
    formatCurrencyAmount,
    getPointCurrencyName,
    type PublicCurrencySettings,
} from "@/lib/currencySettings";
import { sumAmounts, toBaht, toSatang } from "@/lib/money";

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
    imageUrl?: string | null;
};

export type PurchasePromoData = {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    maxDiscount: number | null;
    discountAmount: number;
    eligibleProductIds: string[];
};

export type PromoCartLineItem = PromoLineItem & { productId: string };

type RawConnection = {
    beginTransaction: () => Promise<void>;
    execute: (query: string, params?: unknown[]) => Promise<[unknown, unknown]>;
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
    "imageUrl",
].join(", ");

// `??` alone would treat a stored discountPrice of 0.00 as the active price and
// hand the product out for free. The write paths reject a discount <= 0, so this
// only guards rows predating that check (or edited straight in the database).
export function getActivePrice(product: PurchaseProductRow) {
    const discountPrice = Number(product.discountPrice ?? Number.NaN);
    if (Number.isFinite(discountPrice) && discountPrice > 0) {
        return discountPrice;
    }

    return Number(product.price);
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
        remainingCount: remainingItems.length,
        isLastStock: remainingItems.length === 0,
    };
}

export function getAutoDeleteTimestamp(delayMinutes?: string | number | null) {
    if (!delayMinutes) return null;

    const deleteAt = new Date();
    deleteAt.setMinutes(deleteAt.getMinutes() + Number(delayMinutes));
    return deleteAt.toISOString().slice(0, 19).replace("T", " ");
}

export function buildCartThbPromoItems(
    productList: PurchaseProductRow[],
    items: CheckoutItemInput[],
): PromoCartLineItem[] {
    return items
        .map((item) => {
            const product = productList.find((candidate) => candidate.id === item.productId);
            if (!product || (product.currency !== "THB" && product.currency)) {
                return null;
            }

            return {
                productId: item.productId,
                category: product.category,
                // satang * integer quantity stays exact; price * quantity does not.
                subtotal: toBaht(toSatang(getActivePrice(product)) * item.quantity),
            };
        })
        .filter(Boolean) as PromoCartLineItem[];
}

// The promo discount is distributed only across the promo-eligible lines;
// ineligible THB lines keep their full subtotal. eligibleProductIds = null
// means no promo restriction (or no promo at all).
export function buildDiscountedThbPriceMap(
    thbItems: PromoCartLineItem[],
    discountAmount: number,
    eligibleProductIds: readonly string[] | null = null,
) {
    const priceMap = new Map<string, number>();
    thbItems.forEach((item) => {
        priceMap.set(item.productId, item.subtotal);
    });

    const eligibleSet = eligibleProductIds === null ? null : new Set(eligibleProductIds);
    const eligibleItems = eligibleSet === null
        ? thbItems
        : thbItems.filter((item) => eligibleSet.has(item.productId));
    const baseCentsById = new Map(eligibleItems.map((item) => [item.productId, toSatang(item.subtotal)] as const));
    const totalEligibleCents = eligibleItems.reduce((sum, item) => sum + (baseCentsById.get(item.productId) ?? 0), 0);
    const totalDiscountCents = Math.min(toSatang(discountAmount), totalEligibleCents);

    if (eligibleItems.length === 0 || totalDiscountCents <= 0 || totalEligibleCents <= 0) {
        return priceMap;
    }

    // Give every line its floored proportional share, then hand the leftover
    // satang to lines that still have room. Dumping the whole remainder on the
    // last line used to lose it whenever that line capped at its own subtotal,
    // so the cart charged more than the promo promised.
    const discountCentsById = new Map<string, number>();
    let distributedDiscountCents = 0;

    eligibleItems.forEach((item) => {
        const baseCents = baseCentsById.get(item.productId) ?? 0;
        const share = Math.min(baseCents, Math.floor((totalDiscountCents * baseCents) / totalEligibleCents));

        discountCentsById.set(item.productId, share);
        distributedDiscountCents += share;
    });

    for (const item of eligibleItems) {
        if (distributedDiscountCents >= totalDiscountCents) {
            break;
        }

        const baseCents = baseCentsById.get(item.productId) ?? 0;
        const assigned = discountCentsById.get(item.productId) ?? 0;
        const room = Math.min(baseCents - assigned, totalDiscountCents - distributedDiscountCents);
        if (room <= 0) {
            continue;
        }

        discountCentsById.set(item.productId, assigned + room);
        distributedDiscountCents += room;
    }

    eligibleItems.forEach((item) => {
        const baseCents = baseCentsById.get(item.productId) ?? 0;
        const discountCents = discountCentsById.get(item.productId) ?? 0;

        priceMap.set(item.productId, toBaht(Math.max(0, baseCents - discountCents)));
    });

    return priceMap;
}

// The discount actually handed out, which is what the PromoUsage ledger should
// record — the promo's headline discountAmount can exceed it once per-line caps
// and satang rounding are applied.
export function sumAppliedDiscount(
    thbItems: PromoCartLineItem[],
    discountedPriceMap: Map<string, number>,
) {
    return toBaht(thbItems.reduce((sum, item) => {
        const chargedSatang = toSatang(discountedPriceMap.get(item.productId) ?? item.subtotal);
        return sum + (toSatang(item.subtotal) - chargedSatang);
    }, 0));
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

    const thbItems = buildCartThbPromoItems(productList, items);
    const totalTHB = sumAmounts(thbItems.map((item) => item.subtotal));

    // pointBalance is an INT column and the deduction below rounds, so round the
    // total once here and let the check and the charge agree on one number.
    const totalPoints = Math.round(productList.reduce((sum, product) => {
        const item = items.find((candidate) => candidate.productId === product.id);
        if (!item || product.currency !== "POINT") {
            return sum;
        }

        return sum + (getActivePrice(product) * item.quantity);
    }, 0));

    if (checkThbBalance && totalTHB > 0 && toSatang(user.creditBalance) < toSatang(totalTHB)) {
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
        thbItems,
    };
}

export async function getRawTransactionConnection() {
    if (typeof rawDbPool?.getConnection !== "function") {
        throw new Error("Purchases require a transactional MySQL connection");
    }

    return rawDbPool.getConnection() as Promise<RawConnection>;
}

export async function validatePromoInTransaction(
    conn: RawConnection,
    promoCode: string,
    userId: string,
    thbItems: PromoCartLineItem[],
): Promise<PurchasePromoData> {
    const [promoRows] = await conn.execute(
        `SELECT ${PROMO_COLUMNS_SQL} FROM PromoCode WHERE code = ? FOR UPDATE`,
        [promoCode.trim().toUpperCase()],
    );
    const promo = (promoRows as PromoRecord[])[0];

    if (!promo) {
        throw new Error("โค้ดส่วนลดไม่ถูกต้อง");
    }

    const { eligibleItems, eligibleTotal, categoryError } = summarizePromoEligibleItems(promo, thbItems);
    if (categoryError) {
        throw new Error(categoryError);
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

    // minPurchase and the discount itself are measured against the eligible
    // lines only — ineligible lines can't help reach the minimum or inflate
    // the discount. The category passed here comes from an eligible line, so
    // the category checks inside are satisfied by construction.
    const errorMessage = getPromoValidationMessage(promo, {
        totalPrice: eligibleTotal,
        productCategory: eligibleItems[0]?.category,
        isAuthenticated: true,
        hasCompletedOrder: completedOrderExists,
        userPromoUsageCount,
    });

    if (errorMessage) {
        throw new Error(errorMessage);
    }

    const { discountAmount } = calculatePromoDiscountAmount(promo, eligibleTotal);

    return {
        id: promo.id,
        code: promo.code,
        discountType: promo.discountType,
        discountValue: Number(promo.discountValue),
        maxDiscount: promo.maxDiscount ? Number(promo.maxDiscount) : null,
        discountAmount: discountAmount ?? 0,
        eligibleProductIds: eligibleItems.map((item) => item.productId),
    };
}

async function lockPurchaseUserForUpdate(conn: RawConnection, userId: string): Promise<PurchaseTransactionUser> {
    const [userRows] = await conn.execute(
        "SELECT id, creditBalance, pointBalance FROM User WHERE id = ? FOR UPDATE",
        [userId],
    );
    const lockedUser = (userRows as PurchaseTransactionUser[])[0];

    if (!lockedUser) {
        throw new Error("ไม่พบผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่");
    }

    return lockedUser;
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
            `SELECT ${PRODUCT_COLUMNS_SQL} FROM Product WHERE id = ? AND deletedAt IS NULL FOR UPDATE`,
            [productId],
        );
        const product = (productRows as PurchaseProductRow[])[0];

        if (!product) throw new Error("ไม่พบสินค้านี้ในระบบ");
        if (Boolean(product.isSold)) throw new Error("สินค้านี้ถูกขายไปแล้ว");

        const lockedUser = await lockPurchaseUserForUpdate(conn, user.id);
        const unitPrice = getActivePrice(product);
        const baseTotalSatang = toSatang(unitPrice) * qty;
        const baseTotalPrice = toBaht(baseTotalSatang);
        const isPointCurrency = product.currency === "POINT";
        if (isPointCurrency && promoCode) {
            throw new Error("โค้ดส่วนลดใช้ได้เฉพาะสินค้าสกุลเงินบาท");
        }

        const promoData = !isPointCurrency && promoCode
            ? await validatePromoInTransaction(conn, promoCode, user.id, [
                { productId: product.id, category: product.category, subtotal: baseTotalPrice },
            ])
            : null;
        // The discount can't exceed the line itself, so the capped figure is what
        // gets charged and what the PromoUsage ledger has to record.
        const appliedDiscountSatang = Math.min(baseTotalSatang, toSatang(promoData?.discountAmount ?? 0));
        const appliedDiscount = toBaht(appliedDiscountSatang);
        const totalSatang = Math.max(0, baseTotalSatang - appliedDiscountSatang);
        const totalPrice = toBaht(totalSatang);
        const userBalance = isPointCurrency ? Number(lockedUser.pointBalance ?? 0) : Number(lockedUser.creditBalance);

        if (toSatang(userBalance) < totalSatang) {
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
        const { givenJoined, remainingData, remainingCount, isLastStock } = processStock(decryptedData, separatorType, qty);

        const orderId = crypto.randomUUID();
        await conn.execute(
            "INSERT INTO `Order` (id, userId, totalPrice, status, givenData, productId, productName, productImage) VALUES (?, ?, ?, 'COMPLETED', ?, ?, ?, ?)",
            [orderId, user.id, totalPrice, encrypt(givenJoined), product.id, product.name, product.imageUrl ?? null],
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
            "UPDATE Product SET secretData = ?, stockCount = ?, isSold = ?, orderId = ?, scheduledDeleteAt = ? WHERE id = ?",
            [
                encrypt(remainingData),
                remainingCount,
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
                "INSERT INTO PromoUsage (id, promoCodeId, userId, orderId, promoCode, discountAmount, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', UTC_TIMESTAMP(), UTC_TIMESTAMP())",
                [
                    crypto.randomUUID(),
                    promoData.id,
                    user.id,
                    orderId,
                    promoData.code,
                    appliedDiscount.toFixed(2),
                ],
            );
        }

        await conn.commit();

        return {
            order: { id: orderId },
            product,
            finalPrice: totalPrice,
            promoData: promoData ? { ...promoData, discountAmount: appliedDiscount } : null,
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
    const { conn, items, userId, promoCode, currencySettings } = params;
    const productIds = items.map((item) => item.productId);

    try {
        await conn.beginTransaction();

        const [rows] = await conn.execute(
            `SELECT ${PRODUCT_COLUMNS_SQL}
             FROM Product WHERE id IN (${productIds.map(() => "?").join(",")}) AND deletedAt IS NULL FOR UPDATE`,
            productIds,
        );
        const productList = rows as PurchaseProductRow[];
        const lockedUser = await lockPurchaseUserForUpdate(conn, userId);
        const { totalTHB, totalPoints, thbItems } = validateAndSummarizeCartProducts(
            productList,
            items,
            lockedUser,
            currencySettings,
            { checkThbBalance: false },
        );
        const appliedPromo = promoCode && totalTHB > 0
            ? await validatePromoInTransaction(conn, promoCode, userId, thbItems)
            : null;
        const discountedPriceMap = buildDiscountedThbPriceMap(
            thbItems,
            appliedPromo?.discountAmount ?? 0,
            appliedPromo ? appliedPromo.eligibleProductIds : null,
        );
        const finalTotalSatang = items.reduce(
            (sum, item) => sum + toSatang(discountedPriceMap.get(item.productId) ?? 0),
            0,
        );
        const finalTotalTHB = toBaht(finalTotalSatang);
        const appliedDiscount = appliedPromo ? sumAppliedDiscount(thbItems, discountedPriceMap) : 0;

        if (finalTotalSatang > 0 && toSatang(lockedUser.creditBalance) < finalTotalSatang) {
            throw new Error(
                `เครดิตไม่เพียงพอ (ต้องการ ${formatCurrencyAmount(finalTotalTHB, "THB", currencySettings)} แต่มี ${formatCurrencyAmount(Number(lockedUser.creditBalance), "THB", currencySettings)})`,
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
            const { givenJoined, remainingData, remainingCount, isLastStock } = processStock(
                decrypted,
                separatorType,
                item.quantity,
            );
            const orderId = crypto.randomUUID();
            const lineTotal = toBaht(toSatang(getActivePrice(product)) * item.quantity);
            const unitPrice = product.currency === "THB" || !product.currency
                ? (discountedPriceMap.get(product.id) ?? lineTotal)
                : lineTotal;

            await conn.execute(
                "INSERT INTO `Order` (id, userId, totalPrice, status, givenData, productId, productName, productImage) VALUES (?, ?, ?, 'COMPLETED', ?, ?, ?, ?)",
                [orderId, userId, String(unitPrice), encrypt(givenJoined), product.id, product.name, product.imageUrl ?? null],
            );

            await conn.execute(
                "UPDATE Product SET secretData = ?, stockCount = ?, isSold = ?, orderId = ?, scheduledDeleteAt = ? WHERE id = ?",
                [
                    encrypt(remainingData),
                    remainingCount,
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
                [Math.round(totalPoints), userId],
            );
        }

        if (appliedPromo) {
            await conn.execute(
                "UPDATE PromoCode SET usedCount = usedCount + 1 WHERE id = ?",
                [appliedPromo.id],
            );
            await conn.execute(
                "INSERT INTO PromoUsage (id, promoCodeId, userId, orderId, promoCode, discountAmount, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', UTC_TIMESTAMP(), UTC_TIMESTAMP())",
                [
                    crypto.randomUUID(),
                    appliedPromo.id,
                    userId,
                    orderResults[0]?.orderId ?? null,
                    appliedPromo.code,
                    appliedDiscount.toFixed(2),
                ],
            );
        }

        await conn.commit();

        return {
            orderResults,
            totalTHB: finalTotalTHB,
            totalPoints,
            promoCode: appliedPromo?.code ?? null,
            discountAmount: appliedDiscount,
            purchasedCount: items.reduce((sum, item) => sum + item.quantity, 0),
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}
