import { NextRequest, NextResponse } from "next/server";
import { db, products } from "@/lib/db";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";
import { getStockCount } from "@/lib/stock";

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
        const product = await db.query.products.findFirst({
            where: eq(products.id, id),
            columns: {
                id: true,
                isSold: true,
                secretData: true,
                stockSeparator: true,
            },
        });

        if (!product) {
            return NextResponse.json({ found: false }, { status: 404 });
        }

        let stockCount = 0;
        try {
            const decrypted = decrypt(product.secretData ?? "");
            stockCount = getStockCount(decrypted, product.stockSeparator ?? "newline");
        } catch {
            stockCount = 0;
        }

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
