import { NextRequest, NextResponse } from "next/server";
import { requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { PERMISSIONS } from "@/lib/permissions";
import { validateBody } from "@/lib/validations/validate";
import { updateProductCheckboxSchema } from "@/lib/validations/productCheckbox";
import {
    deleteProductCheckbox,
    ProductCheckboxNotFoundError,
    updateProductCheckbox,
} from "@/lib/features/products/productCheckboxes";

type RouteContext = { params: Promise<{ id: string; checkboxId: string }> };

function errorResponse(error: unknown, fallback: string) {
    if (error instanceof ProductCheckboxNotFoundError) {
        return NextResponse.json({ success: false, message: error.message }, { status: 404 });
    }

    console.error(fallback, error);
    return NextResponse.json({ success: false, message: fallback }, { status: 500 });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.PRODUCT_EDIT);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
    }

    const { id, checkboxId } = await context.params;
    const result = await validateBody(request, updateProductCheckboxSchema);
    if ("error" in result) {
        return result.error;
    }

    try {
        const previous = await updateProductCheckbox(id, checkboxId, result.data);

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.PRODUCT_UPDATE,
            resource: "ProductCheckbox",
            resourceId: checkboxId,
            resourceName: result.data.title ?? previous.title,
            details: { productId: id, changed: Object.keys(result.data), change: "update" },
        });

        return NextResponse.json({ success: true, message: "บันทึกช่องติ๊กแล้ว" });
    } catch (error) {
        return errorResponse(error, "ไม่สามารถบันทึกช่องติ๊กได้");
    }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.PRODUCT_EDIT);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
    }

    const { id, checkboxId } = await context.params;

    try {
        const deleted = await deleteProductCheckbox(id, checkboxId);

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.PRODUCT_UPDATE,
            resource: "ProductCheckbox",
            resourceId: checkboxId,
            resourceName: deleted.title,
            details: { productId: id, change: "delete" },
        });

        return NextResponse.json({ success: true, message: "ลบช่องติ๊กแล้ว" });
    } catch (error) {
        return errorResponse(error, "ไม่สามารถลบช่องติ๊กได้");
    }
}
