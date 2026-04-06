import { findPromoByCode, countPromoUsageByUser, userHasCompletedOrder } from "@/lib/features/promo/queries";

type CategoryList = string[] | null | undefined;

export interface PromoRecord {
    id: string;
    code: string;
    discountType: string;
    discountValue: string | number;
    minPurchase: string | number | null;
    maxDiscount: string | number | null;
    usageLimit: number | null;
    usagePerUser?: number | null;
    usedCount: number;
    startsAt: string | Date;
    expiresAt: string | Date | null;
    applicableCategories?: CategoryList;
    excludedCategories?: CategoryList;
    isNewUserOnly?: boolean;
    isActive: boolean;
}

export interface PromoValidationContext {
    totalPrice?: number | null;
    productCategory?: string | null;
    isAuthenticated?: boolean;
    hasCompletedOrder?: boolean;
    userPromoUsageCount?: number;
    now?: Date;
}

export interface PromoValidationSuccess {
    valid: true;
    promo: PromoRecord;
    discount: number;
    discountType: string;
    discountAmount: number | null;
    maxDiscount: number | null;
    minPurchase: number | null;
    message: string;
}

export interface PromoValidationFailure {
    valid: false;
    message: string;
}

export type PromoValidationResult = PromoValidationSuccess | PromoValidationFailure;

function normalizeCategory(value: string | null | undefined) {
    return value?.trim().toUpperCase() || null;
}

function normalizeCategoryList(value: CategoryList) {
    return (Array.isArray(value) ? value : [])
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean);
}

export function getPromoValidationMessage(
    promo: PromoRecord,
    {
        totalPrice,
        productCategory,
        isAuthenticated = false,
        hasCompletedOrder = false,
        userPromoUsageCount = 0,
        now = new Date(),
    }: PromoValidationContext
) {
    if (!promo.isActive) {
        return "โค้ดนี้ถูกปิดใช้งานแล้ว";
    }

    if (now < new Date(promo.startsAt)) {
        return "โค้ดนี้ยังไม่ถึงวันเริ่มใช้งาน";
    }

    if (promo.expiresAt && now > new Date(promo.expiresAt)) {
        return "โค้ดนี้หมดอายุแล้ว";
    }

    if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
        return "โค้ดนี้ถูกใช้ครบจำนวนแล้ว";
    }

    const minPurchase = promo.minPurchase ? Number(promo.minPurchase) : null;
    if (minPurchase !== null && typeof totalPrice === "number" && totalPrice < minPurchase) {
        return `ต้องซื้อขั้นต่ำ ฿${minPurchase.toLocaleString()} เพื่อใช้โค้ดนี้`;
    }

    const normalizedCategory = normalizeCategory(productCategory);
    const excludedCategories = normalizeCategoryList(promo.excludedCategories);
    if (normalizedCategory && excludedCategories.includes(normalizedCategory)) {
        return "โค้ดนี้ไม่สามารถใช้กับหมวดสินค้านี้ได้";
    }

    const applicableCategories = normalizeCategoryList(promo.applicableCategories);
    if (applicableCategories.length > 0) {
        if (!normalizedCategory) {
            return "โค้ดนี้ต้องใช้กับสินค้าที่รองรับเท่านั้น";
        }

        if (!applicableCategories.includes(normalizedCategory)) {
            return "โค้ดนี้ใช้ได้เฉพาะบางหมวดสินค้าที่กำหนด";
        }
    }

    if (promo.isNewUserOnly) {
        if (!isAuthenticated) {
            return "โค้ดนี้สำหรับลูกค้าใหม่ กรุณาเข้าสู่ระบบก่อนใช้งาน";
        }

        if (hasCompletedOrder) {
            return "โค้ดนี้ใช้ได้เฉพาะลูกค้าใหม่เท่านั้น";
        }
    }

    if (promo.usagePerUser !== null && promo.usagePerUser !== undefined) {
        if (!isAuthenticated) {
            return "กรุณาเข้าสู่ระบบเพื่อใช้โค้ดนี้";
        }

        if (userPromoUsageCount >= promo.usagePerUser) {
            return "คุณใช้โค้ดนี้ครบสิทธิ์แล้ว";
        }
    }

    return null;
}

export function calculatePromoDiscountAmount(promo: PromoRecord, totalPrice: number | null | undefined) {
    const minPurchase = promo.minPurchase ? Number(promo.minPurchase) : null;
    if (typeof totalPrice !== "number") {
        return { minPurchase, discountAmount: null };
    }

    if (promo.discountType === "FIXED") {
        return {
            minPurchase,
            discountAmount: Math.min(totalPrice, Number(promo.discountValue)),
        };
    }

    let discountAmount = (totalPrice * Number(promo.discountValue)) / 100;
    const maxDiscount = promo.maxDiscount ? Number(promo.maxDiscount) : null;
    if (maxDiscount !== null && discountAmount > maxDiscount) {
        discountAmount = maxDiscount;
    }

    return {
        minPurchase,
        discountAmount: Math.min(totalPrice, discountAmount),
    };
}

export function buildPromoSuccessMessage(promo: PromoRecord) {
    return promo.discountType === "PERCENTAGE"
        ? `โค้ด "${promo.code}" ใช้ได้ ลด ${promo.discountValue}%`
        : `โค้ด "${promo.code}" ใช้ได้ ลด ฿${Number(promo.discountValue).toLocaleString()}`;
}

export async function getPromoUserUsageCount(promoCodeId: string, userId: string) {
    return countPromoUsageByUser(promoCodeId, userId);
}

export async function hasCompletedOrder(userId: string) {
    return userHasCompletedOrder(userId);
}

export async function validatePromoCode({
    code,
    totalPrice,
    productCategory,
    userId,
}: {
    code: string;
    totalPrice?: number | null;
    productCategory?: string | null;
    userId?: string | null;
}): Promise<PromoValidationResult> {
    const promo = await findPromoByCode(code);

    if (!promo) {
        return { valid: false, message: "โค้ดส่วนลดไม่ถูกต้อง" };
    }

    const isAuthenticated = Boolean(userId);
    const needsOrderCheck = Boolean(promo.isNewUserOnly && userId);
    const needsUsageCheck = Boolean(promo.usagePerUser !== null && promo.usagePerUser !== undefined && userId);

    const [completedOrderExists, usageCount] = await Promise.all([
        needsOrderCheck && userId ? hasCompletedOrder(userId) : Promise.resolve(false),
        needsUsageCheck && userId ? getPromoUserUsageCount(promo.id, userId) : Promise.resolve(0),
    ]);

    const errorMessage = getPromoValidationMessage(promo, {
        totalPrice,
        productCategory,
        isAuthenticated,
        hasCompletedOrder: completedOrderExists,
        userPromoUsageCount: usageCount,
    });

    if (errorMessage) {
        return { valid: false, message: errorMessage };
    }

    const { minPurchase, discountAmount } = calculatePromoDiscountAmount(promo, totalPrice);

    return {
        valid: true,
        promo,
        discount: Number(promo.discountValue),
        discountType: promo.discountType,
        discountAmount,
        maxDiscount: promo.maxDiscount ? Number(promo.maxDiscount) : null,
        minPurchase,
        message: buildPromoSuccessMessage(promo),
    };
}
