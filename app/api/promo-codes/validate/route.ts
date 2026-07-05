import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    buildPromoSuccessMessage,
    validatePromoCode,
    type PromoLineItem,
} from "@/lib/promo";
import {
    checkPromoValidationRateLimit,
    clearPromoValidationAttempts,
    getClientIp,
    recordFailedPromoValidation,
} from "@/lib/rateLimit";

const MAX_PROMO_LINE_ITEMS = 100;

// Preview data is client-supplied, so only shape-check it here; the purchase
// transaction re-derives everything from the DB before charging.
function parsePromoLineItems(rawItems: unknown): PromoLineItem[] | null {
    if (!Array.isArray(rawItems)) {
        return null;
    }

    const parsed = rawItems
        .slice(0, MAX_PROMO_LINE_ITEMS)
        .flatMap((rawItem) => {
            if (!rawItem || typeof rawItem !== "object") {
                return [];
            }

            const { category, subtotal } = rawItem as { category?: unknown; subtotal?: unknown };
            const subtotalNumber = Number(subtotal);
            if (!Number.isFinite(subtotalNumber) || subtotalNumber < 0) {
                return [];
            }

            return [{
                category: typeof category === "string" ? category : null,
                subtotal: subtotalNumber,
            }];
        });

    return parsed.length > 0 ? parsed : null;
}

export async function POST(request: NextRequest) {
    try {
        const { code, totalPrice, productCategory, items } = await request.json();

        if (!code || typeof code !== "string") {
            return NextResponse.json({
                valid: false,
                message: "กรุณากรอกโค้ด",
            });
        }

        const session = await auth();
        const userId = session?.user?.id ?? null;
        const rateLimitIdentifier = `${getClientIp(request)}:${userId ?? "guest"}`;
        const rateLimit = checkPromoValidationRateLimit(rateLimitIdentifier);
        if (rateLimit.blocked) {
            return NextResponse.json({
                valid: false,
                message: rateLimit.message ?? "กรอกโค้ดผิดบ่อยเกินไป กรุณาลองใหม่ภายหลัง",
            }, { status: 429 });
        }

        const result = await validatePromoCode({
            code,
            totalPrice: typeof totalPrice === "number" ? totalPrice : null,
            productCategory: typeof productCategory === "string" ? productCategory : null,
            userId,
            items: parsePromoLineItems(items),
        });

        if (!result.valid) {
            recordFailedPromoValidation(rateLimitIdentifier);
            return NextResponse.json(result);
        }

        clearPromoValidationAttempts(rateLimitIdentifier);

        const { minPurchase, discountAmount } = result;
        const finalPrice = typeof totalPrice === "number"
            ? Math.max(0, Math.round((totalPrice - (discountAmount ?? 0)) * 100) / 100)
            : null;

        return NextResponse.json({
            valid: true,
            discount: Number(result.promo.discountValue),
            discountType: result.promo.discountType,
            discountAmount,
            finalPrice,
            maxDiscount: result.maxDiscount,
            minPurchase,
            usagePerUser: result.promo.usagePerUser ?? null,
            isNewUserOnly: Boolean(result.promo.isNewUserOnly),
            applicableCategories: Array.isArray(result.promo.applicableCategories)
                ? result.promo.applicableCategories
                : [],
            excludedCategories: Array.isArray(result.promo.excludedCategories)
                ? result.promo.excludedCategories
                : [],
            message: buildPromoSuccessMessage(result.promo),
        });
    } catch (error) {
        console.error("Validate promo code error:", error);
        return NextResponse.json({
            valid: false,
            message: "เกิดข้อผิดพลาด กรุณาลองใหม่",
        }, { status: 500 });
    }
}
