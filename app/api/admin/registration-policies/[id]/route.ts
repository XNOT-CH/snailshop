import { NextRequest, NextResponse } from "next/server";
import { db, registrationPolicies } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { validateBody } from "@/lib/validations/validate";
import { registrationPolicyUpdateSchema } from "@/lib/validations/content";
import { PERMISSIONS } from "@/lib/permissions";
import { contentApiError } from "@/lib/features/content/apiResponse";
import { invalidateRegistrationPolicyCaches } from "@/lib/cache";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.CONTENT_EDIT);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });
    try {
        const { id } = await params;
        // registrationPolicyUpdateSchema, not .partial(): a plain .partial()
        // keeps the .default() values, so toggling isActive would also write
        // sortOrder: 0 for a field the client never sent.
        const result = await validateBody(request, registrationPolicyUpdateSchema);
        if ("error" in result) return result.error;
        const body = result.data;

        const existing = await db.query.registrationPolicies.findFirst({
            where: (t, { eq }) => eq(t.id, id),
        });
        if (!existing) return contentApiError("Registration policy not found", { status: 404 });

        const updateData: Record<string, unknown> = {};
        if (body.titleTh !== undefined) updateData.titleTh = body.titleTh;
        if (body.titleEn !== undefined) updateData.titleEn = body.titleEn || null;
        if (body.contentTh !== undefined) updateData.contentTh = body.contentTh;
        if (body.contentEn !== undefined) updateData.contentEn = body.contentEn || null;
        if (body.isActive !== undefined) updateData.isActive = body.isActive;
        if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

        if (Object.keys(updateData).length > 0) {
            await db.update(registrationPolicies).set(updateData).where(eq(registrationPolicies.id, id));
        }

        await invalidateRegistrationPolicyCaches();
        const item = await db.query.registrationPolicies.findFirst({
            where: (t, { eq }) => eq(t.id, id),
        });

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.SETTINGS_UPDATE,
            resource: "RegistrationPolicy",
            resourceId: id,
            resourceName: item?.titleTh,
            details: { operation: "update", type: existing.type, changed: Object.keys(updateData) },
        });

        return NextResponse.json(item);
    } catch (error) {
        console.error("[REGISTRATION_POLICY_PUT]", error);
        return contentApiError("Failed to update registration policy", { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.CONTENT_EDIT);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });
    try {
        const { id } = await params;
        const existing = await db.query.registrationPolicies.findFirst({
            where: (t, { eq }) => eq(t.id, id),
        });
        if (!existing) return contentApiError("Registration policy not found", { status: 404 });

        await db.delete(registrationPolicies).where(eq(registrationPolicies.id, id));

        await invalidateRegistrationPolicyCaches();

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.SETTINGS_UPDATE,
            resource: "RegistrationPolicy",
            resourceId: id,
            resourceName: existing.titleTh,
            details: { operation: "delete", type: existing.type, titleTh: existing.titleTh },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[REGISTRATION_POLICY_DELETE]", error);
        return contentApiError("Failed to delete registration policy", { status: 500 });
    }
}
