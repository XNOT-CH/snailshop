import { NextRequest, NextResponse } from "next/server";
import { db, footerLinks } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { validateBody } from "@/lib/validations/validate";
import { footerLinkUpdateSchema } from "@/lib/validations/content";
import { PERMISSIONS } from "@/lib/permissions";
import { contentApiError } from "@/lib/features/content/apiResponse";
import { invalidateFooterCaches } from "@/lib/cache";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.SETTINGS_EDIT);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });
    try {
        const { id } = await params;
        const result = await validateBody(request, footerLinkUpdateSchema);
        if ("error" in result) return result.error;
        const body = result.data;

        const updateData: Record<string, unknown> = {};
        if (body.label !== undefined) updateData.label = body.label;
        if (body.href !== undefined) updateData.href = body.href;
        if (body.column !== undefined) updateData.column = body.column;
        if (body.openInNewTab !== undefined) updateData.openInNewTab = body.openInNewTab;
        if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
        if (body.isActive !== undefined) updateData.isActive = body.isActive;
        await db.update(footerLinks).set(updateData).where(eq(footerLinks.id, id));
        const link = await db.query.footerLinks.findFirst({ where: (t, { eq }) => eq(t.id, id) });

        await invalidateFooterCaches();

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.SETTINGS_UPDATE,
            resource: "FooterLink",
            resourceId: id,
            resourceName: link?.label,
            details: { operation: "update", changed: Object.keys(updateData) },
        });

        return NextResponse.json(link);
    } catch (error) {
        console.error("[FOOTER_LINK_PUT]", error);
        return contentApiError("Failed to update footer link", { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authCheck = await requirePermissionWithCsrf(_req, PERMISSIONS.SETTINGS_EDIT);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });
    try {
        const { id } = await params;
        const existing = await db.query.footerLinks.findFirst({ where: (t, { eq }) => eq(t.id, id) });
        await db.delete(footerLinks).where(eq(footerLinks.id, id));

        await invalidateFooterCaches();

        await auditFromRequest(_req, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.SETTINGS_UPDATE,
            resource: "FooterLink",
            resourceId: id,
            resourceName: existing?.label,
            details: { operation: "delete", label: existing?.label, href: existing?.href },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[FOOTER_LINK_DELETE]", error);
        return contentApiError("Failed to delete footer link", { status: 500 });
    }
}
