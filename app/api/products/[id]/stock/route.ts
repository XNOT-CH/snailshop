import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requirePermissionWithCsrf } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { updateProductStock } from "@/lib/features/products/mutations";
import { findProductById, listOtherProductsForStockCheck, listOtherProductsForTakenUsers } from "@/lib/features/products/queries";
import { buildProductStockTakenUsers, findProductStockUserConflict, productStockUserConflictResponseMessage } from "@/lib/features/products/stockValidation";

interface RouteParams { params: Promise<{ id: string }> }

/**
 * GET /api/products/[id]/stock
 * Returns all usernames already taken by OTHER products (for real-time duplicate check in UI).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
    const authCheck = await requirePermission(PERMISSIONS.PRODUCT_VIEW);
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });

    try {
        const { id } = await params;
        const otherProducts = await listOtherProductsForTakenUsers(id);
        const takenUsers = buildProductStockTakenUsers(otherProducts);

        return NextResponse.json({ success: true, takenUsers });
    } catch (error) {
        console.error("Get taken users error:", error);
        return NextResponse.json({ success: false, message: "Failed to load" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.PRODUCT_EDIT);
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });

    try {
        const { id } = await params;
        const body = await request.json();
        const { secretData } = body;

        if (secretData === undefined) {
            return NextResponse.json({ success: false, message: "Missing secretData" }, { status: 400 });
        }

        const existingProduct = await findProductById(id);
        if (!existingProduct) return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });

        const stockConflict = await findProductStockUserConflict(
            secretData,
            existingProduct.stockSeparator,
            () => listOtherProductsForStockCheck(id)
        );
        if (stockConflict) {
            return NextResponse.json(
                { success: false, message: productStockUserConflictResponseMessage(stockConflict) },
                { status: 409 }
            );
        }

        await updateProductStock(id, secretData, existingProduct.stockSeparator);

        return NextResponse.json({ success: true, message: "Stock updated" });
    } catch (error) {
        console.error("Update stock error:", error);
        return NextResponse.json({ success: false, message: "Failed to update stock" }, { status: 500 });
    }
}

