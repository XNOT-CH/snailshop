import { NextRequest, NextResponse } from "next/server";
import { db, navItems } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { validateBody } from "@/lib/validations/validate";
import { partialUpdateSchema } from "@/lib/validations/partialUpdate";
import { navItemSchema } from "@/lib/validations/content";
import { PERMISSIONS } from "@/lib/permissions";
import { contentApiError } from "@/lib/features/content/apiResponse";
import { invalidateNavItemCaches } from "@/lib/cache";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.SETTINGS_EDIT);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });
    try {
        const { id } = await params;
        const result = await validateBody(request, partialUpdateSchema(navItemSchema));
        if ("error" in result) return result.error;
        const body = result.data;

        const updateData: Record<string, unknown> = {};
        if (body.label !== undefined) updateData.label = body.label;
        if (body.href !== undefined) updateData.href = body.href;
        if (body.icon !== undefined) updateData.icon = body.icon;
        if (body.isActive !== undefined) updateData.isActive = body.isActive;
        if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
        await db.update(navItems).set(updateData).where(eq(navItems.id, id));

        await invalidateNavItemCaches();
        const item = await db.query.navItems.findFirst({ where: (t, { eq }) => eq(t.id, id) });

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.SETTINGS_UPDATE,
            resource: "NavItem",
            resourceId: id,
            resourceName: item?.label,
            details: { operation: "update", changed: Object.keys(updateData) },
        });

        return NextResponse.json(item);
    } catch (error) {
        console.error("[NAV_ITEM_PUT]", error);
        return contentApiError("Failed to update nav item", { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authCheck = await requirePermissionWithCsrf(_req, PERMISSIONS.SETTINGS_EDIT);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });
    try {
        const { id } = await params;
        const existing = await db.query.navItems.findFirst({ where: (t, { eq }) => eq(t.id, id) });
        await db.delete(navItems).where(eq(navItems.id, id));

        await invalidateNavItemCaches();

        await auditFromRequest(_req, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.SETTINGS_UPDATE,
            resource: "NavItem",
            resourceId: id,
            resourceName: existing?.label,
            details: { operation: "delete", label: existing?.label, href: existing?.href },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[NAV_ITEM_DELETE]", error);
        return contentApiError("Failed to delete nav item", { status: 500 });
    }
}
