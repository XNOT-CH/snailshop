import { NextRequest, NextResponse } from "next/server";
import { requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { invalidateProductCaches } from "@/lib/cache";
import { restoreProduct } from "@/lib/features/products/mutations";
import { findProductById } from "@/lib/features/products/queries";
import { PERMISSIONS } from "@/lib/permissions";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.PRODUCT_DELETE);
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });

    try {
        const { id } = await params;
        const product = await findProductById(id);
        if (!product || !product.deletedAt) return NextResponse.json({ success: false, message: "Product not found in trash" }, { status: 404 });

        await restoreProduct(id);

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.PRODUCT_RESTORE, resource: "Product", resourceId: id, resourceName: product.name,
            details: { resourceName: product.name },
        });

        await invalidateProductCaches();

        return NextResponse.json({ success: true, message: "Product restored successfully" });
    } catch (error) {
        console.error("Restore product error:", error);
        return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Failed to restore product" }, { status: 500 });
    }
}
