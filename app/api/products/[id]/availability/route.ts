import { NextRequest, NextResponse } from "next/server";
import { findProductAvailabilityById } from "@/lib/features/products/queries";
import { getProductStockCount } from "@/lib/features/products/shared";

interface RouteParams { params: Promise<{ id: string }> }

/**
 * GET /api/products/[id]/availability
 * Public endpoint — returns isSold and stockCount for a given product.
 * Used by the cart to validate stock before allowing purchase.
 * Does NOT expose secretData or any sensitive information.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const product = await findProductAvailabilityById(id);

        if (!product) {
            return NextResponse.json({ found: false }, { status: 404 });
        }

        const stockCount = getProductStockCount(product.secretData, product.stockSeparator);

        return NextResponse.json({
            found: true,
            isSold: product.isSold,
            stockCount,
        });
    } catch (error) {
        console.error("[PRODUCT_AVAILABILITY_GET]", error);
        return NextResponse.json({ found: false }, { status: 500 });
    }
}
