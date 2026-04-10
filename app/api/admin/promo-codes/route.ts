import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { createPromoCode } from "@/lib/features/promo/mutations";
import { findPromoByCode, listPromoCodes } from "@/lib/features/promo/queries";
import { serializePromo } from "@/lib/features/promo/shared";
import { validateBody } from "@/lib/validations/validate";
import { promoCodeSchema } from "@/lib/validations/promoCode";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET() {
    const authCheck = await requirePermission(PERMISSIONS.PROMO_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const codes = await listPromoCodes();

        return NextResponse.json({
            success: true,
            data: codes.map((code) => serializePromo(code)),
        });
    } catch (error) {
        console.error("[PROMO_CODES_GET]", error);
        return NextResponse.json({ success: false, message: "Failed to fetch promo codes" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.PROMO_EDIT);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const result = await validateBody(request, promoCodeSchema);
        if ("error" in result) return result.error;
        const body = result.data;

        const existing = await findPromoByCode(body.code);
        if (existing) {
            return NextResponse.json({ success: false, message: "Promo code already exists" }, { status: 400 });
        }

        const createdPromo = await createPromoCode(body);

        return NextResponse.json({
            success: true,
            message: "Promo code created successfully",
            data: serializePromo(createdPromo),
        });
    } catch (error) {
        console.error("Create promo code error:", error);
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to create promo code",
        }, { status: 500 });
    }
}
