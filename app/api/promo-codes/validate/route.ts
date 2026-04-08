import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    buildPromoSuccessMessage,
    calculatePromoDiscountAmount,
    validatePromoCode,
} from "@/lib/promo";

export async function POST(request: NextRequest) {
    try {
        const { code, totalPrice, productCategory } = await request.json();

        if (!code || typeof code !== "string") {
            return NextResponse.json({
                valid: false,
                message: "กรุณากรอกโค้ด",
            });
        }

        const session = await auth();
        const userId = session?.user?.id ?? null;

        const result = await validatePromoCode({
            code,
            totalPrice: typeof totalPrice === "number" ? totalPrice : null,
            productCategory: typeof productCategory === "string" ? productCategory : null,
            userId,
        });

        if (!result.valid) {
            return NextResponse.json(result);
        }

        const { minPurchase, discountAmount } = calculatePromoDiscountAmount(
            result.promo,
            typeof totalPrice === "number" ? totalPrice : null
        );
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
