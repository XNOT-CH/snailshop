import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    buildPromoSuccessMessage,
    calculatePromoDiscountAmount,
    validatePromoCode,
} from "@/lib/promo";
import {
    checkPromoValidationRateLimit,
    clearPromoValidationAttempts,
    getClientIp,
    recordFailedPromoValidation,
} from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
    try {
        const { code, totalPrice, productCategory } = await request.json();

        if (!code || typeof code !== "string") {
            return NextResponse.json({
                valid: false,
                message: "กรุณากรอกโค้ดส่วนลด",
            });
        }

        const session = await auth();
        const userId = session?.user?.id ?? null;
        const identifier = userId ? `user:${userId}` : `ip:${getClientIp(request)}`;

        const limit = checkPromoValidationRateLimit(identifier);
        if (limit.blocked) {
            return NextResponse.json({
                valid: false,
                message: limit.message || "กรุณาลองใหม่ภายหลัง",
            }, { status: 429 });
        }

        const result = await validatePromoCode({
            code,
            totalPrice: typeof totalPrice === "number" ? totalPrice : null,
            productCategory: typeof productCategory === "string" ? productCategory : null,
            userId,
        });

        if (!result.valid) {
            recordFailedPromoValidation(identifier);
            return NextResponse.json(result);
        }

        clearPromoValidationAttempts(identifier);

        const { minPurchase, discountAmount } = calculatePromoDiscountAmount(
            result.promo,
            typeof totalPrice === "number" ? totalPrice : null
        );

        return NextResponse.json({
            valid: true,
            discount: Number(result.promo.discountValue),
            discountType: result.promo.discountType,
            discountAmount,
            maxDiscount: result.promo.maxDiscount ? Number(result.promo.maxDiscount) : null,
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
