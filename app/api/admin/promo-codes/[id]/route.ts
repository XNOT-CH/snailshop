import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { deletePromoCode, updatePromoCode } from "@/lib/features/promo/mutations";
import { findPromoByCode, findPromoById } from "@/lib/features/promo/queries";
import { serializePromo, type PromoUpdateInput } from "@/lib/features/promo/shared";
import { validateBody } from "@/lib/validations/validate";
import { promoCodeUpdateSchema } from "@/lib/validations/promoCode";
import { PERMISSIONS } from "@/lib/permissions";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
    const authCheck = await requirePermission(PERMISSIONS.PROMO_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const { id } = await params;
        const promoCode = await findPromoById(id);

        if (!promoCode) {
            return NextResponse.json({ success: false, message: "Promo code not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: serializePromo(promoCode) });
    } catch {
        return NextResponse.json({ success: false, message: "Failed to fetch promo code" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authCheck = await requirePermission(PERMISSIONS.PROMO_EDIT);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const { id } = await params;
        const result = await validateBody(request, promoCodeUpdateSchema);
        if ("error" in result) return result.error;
        const body = result.data as PromoUpdateInput;
        const existing = await findPromoById(id);

        if (!existing) {
            return NextResponse.json({ success: false, message: "Promo code not found" }, { status: 404 });
        }

        if (body.code && body.code.toUpperCase() !== existing.code) {
            const conflict = await findPromoByCode(body.code);
            if (conflict) {
                return NextResponse.json({ success: false, message: "Promo code already exists" }, { status: 400 });
            }
        }

        const updated = await updatePromoCode(id, body);

        return NextResponse.json({
            success: true,
            message: "Promo code updated successfully",
            data: updated ? serializePromo(updated) : null,
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to update promo code",
        }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    const authCheck = await requirePermission(PERMISSIONS.PROMO_EDIT);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const { id } = await params;
        const existing = await findPromoById(id);

        if (!existing) {
            return NextResponse.json({ success: false, message: "Promo code not found" }, { status: 404 });
        }

        await deletePromoCode(id);
        return NextResponse.json({ success: true, message: "Promo code deleted successfully" });
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to delete promo code",
        }, { status: 500 });
    }
}
