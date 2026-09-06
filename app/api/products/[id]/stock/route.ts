import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requirePermissionWithCsrf } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { updateProductStock } from "@/lib/features/products/mutations";
import { findProductById, listOtherProductsForStockCheck, listOtherProductsForTakenUsers } from "@/lib/features/products/queries";
import { buildProductStockTakenUsers, findProductStockUserConflict, productStockUserConflictResponseMessage } from "@/lib/features/products/stockValidation";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { invalidateProductCaches } from "@/lib/cache";
import { validateBody } from "@/lib/validations/validate";
import { stockSeparatorSchema } from "@/lib/validations/product";
import { z } from "zod";

// stockSeparator is optional so the existing contract still holds for a caller
// that only wants to rewrite the blob; the stored value is used in that case.
const updateStockSchema = z.object({
    secretData: z.string({ error: "Missing secretData" }),
    stockSeparator: stockSeparatorSchema.optional(),
});

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
        const result = await validateBody(request, updateStockSchema);
        if ("error" in result) return result.error;
        const { secretData, stockSeparator } = result.data;

        const existingProduct = await findProductById(id);
        if (!existingProduct) return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });

        // One separator decides the conflict check, the stored blob and the
        // stockCount. Resolving it once here is what keeps those three in step.
        const separator = stockSeparator ?? existingProduct.stockSeparator ?? "newline";

        const stockConflict = await findProductStockUserConflict(
            secretData,
            separator,
            () => listOtherProductsForStockCheck(id)
        );
        if (stockConflict) {
            return NextResponse.json(
                {
                    success: false,
                    message: productStockUserConflictResponseMessage(stockConflict),
                    // Named so the editor can point at the offending item instead
                    // of only saying the save failed.
                    conflict: stockConflict,
                },
                { status: 409 }
            );
        }

        await updateProductStock(id, { secretData, stockSeparator: separator });

        // stockCount and isSold just changed, and the shop reads both from cache.
        // The product PUT has always done this; this route never did.
        await invalidateProductCaches();

        if (separator !== existingProduct.stockSeparator) {
            await auditFromRequest(request, {
                userId: authCheck.userId,
                action: AUDIT_ACTIONS.PRODUCT_UPDATE,
                resource: "Product",
                resourceId: id,
                resourceName: existingProduct.name,
                details: {
                    resourceName: existingProduct.name,
                    changes: [{ field: "stockSeparator", old: existingProduct.stockSeparator, new: separator }],
                },
            });
        }

        return NextResponse.json({ success: true, message: "Stock updated" });
    } catch (error) {
        console.error("Update stock error:", error);
        return NextResponse.json({ success: false, message: "Failed to update stock" }, { status: 500 });
    }
}
