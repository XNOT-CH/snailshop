import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { listProductsForStockCheck } from "@/lib/features/products/queries";
import { buildProductStockTakenUsers } from "@/lib/features/products/stockValidation";
import { PERMISSIONS } from "@/lib/permissions";

/**
 * GET /api/products/new/stock
 * Returns all usernames already taken by existing products for create-product duplicate hints.
 */
export async function GET() {
    const authCheck = await requirePermission(PERMISSIONS.PRODUCT_CREATE);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const products = await listProductsForStockCheck();
        const takenUsers = buildProductStockTakenUsers(products);

        return NextResponse.json({ success: true, takenUsers });
    } catch (error) {
        console.error("Get taken users for new product error:", error);
        return NextResponse.json({ success: false, message: "Failed to load" }, { status: 500 });
    }
}
