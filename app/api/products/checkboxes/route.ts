import { NextRequest, NextResponse } from "next/server";
import { MAX_CART_QUANTITY } from "@/lib/constants/cart";
import { listCheckboxesForProducts } from "@/lib/features/products/productCheckboxes";

/**
 * GET /api/products/checkboxes?ids=a,b,c
 * Public endpoint — the consent boxes for several products at once, which is
 * what the cart needs before it can let checkout run. Titles and descriptions
 * are already shown on the product page, so nothing here is sensitive.
 */
export async function GET(request: NextRequest) {
    try {
        const ids = (request.nextUrl.searchParams.get("ids") ?? "")
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
            .slice(0, MAX_CART_QUANTITY);

        if (ids.length === 0) {
            return NextResponse.json({ success: true, checkboxes: [] }, { headers: { "Cache-Control": "no-store" } });
        }

        const checkboxes = await listCheckboxesForProducts(ids);
        return NextResponse.json({ success: true, checkboxes }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("[PRODUCT_CHECKBOXES_GET]", error);
        return NextResponse.json({ success: false, checkboxes: [] }, { status: 500 });
    }
}
