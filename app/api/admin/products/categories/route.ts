import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { listProductCategories } from "@/lib/features/products/queries";
import { PERMISSIONS } from "@/lib/permissions";

/**
 * GET /api/admin/products/categories
 * The categories already in use, so the product forms can offer them instead of
 * leaving a blank box where a typo silently creates a new one.
 */
export async function GET() {
    const authCheck = await requirePermission(PERMISSIONS.PRODUCT_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        return NextResponse.json({ success: true, categories: await listProductCategories() });
    } catch (error) {
        console.error("[PRODUCT_CATEGORIES]", error);
        return NextResponse.json({ success: false, message: "Failed to load categories" }, { status: 500 });
    }
}
