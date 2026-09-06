import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { PERMISSIONS } from "@/lib/permissions";
import { validateBody } from "@/lib/validations/validate";
import { createProductCheckboxSchema } from "@/lib/validations/productCheckbox";
import {
    createProductCheckbox,
    listProductCheckboxes,
} from "@/lib/features/products/productCheckboxes";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
    const authCheck = await requirePermission(PERMISSIONS.PRODUCT_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        const checkboxes = await listProductCheckboxes(id);
        return NextResponse.json({ success: true, checkboxes });
    } catch (error) {
        console.error("List product checkboxes error:", error);
        return NextResponse.json({ success: false, message: "ไม่สามารถโหลดช่องติ๊กได้" }, { status: 500 });
    }
}

export async function POST(request: NextRequest, context: RouteContext) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.PRODUCT_EDIT);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
    }

    const { id } = await context.params;
    const result = await validateBody(request, createProductCheckboxSchema);
    if ("error" in result) {
        return result.error;
    }

    try {
        const checkboxId = await createProductCheckbox(id, result.data);

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.PRODUCT_UPDATE,
            resource: "ProductCheckbox",
            resourceId: checkboxId,
            resourceName: result.data.title,
            details: { productId: id, isRequired: result.data.isRequired ?? true, change: "create" },
        });

        return NextResponse.json({ success: true, id: checkboxId, message: "เพิ่มช่องติ๊กแล้ว" }, { status: 201 });
    } catch (error) {
        console.error("Create product checkbox error:", error);
        return NextResponse.json({ success: false, message: "ไม่สามารถเพิ่มช่องติ๊กได้" }, { status: 500 });
    }
}
