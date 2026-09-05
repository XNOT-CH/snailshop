import { mysqlNow } from "@/lib/utils/date";
import { NextRequest, NextResponse } from "next/server";
import { db, registrationPolicies } from "@/lib/db";
import { eq, max } from "drizzle-orm";
import { requirePermission, requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { validateBody } from "@/lib/validations/validate";
import {
    REGISTRATION_POLICY_TYPES,
    registrationPolicySchema,
    type RegistrationPolicyType,
} from "@/lib/validations/content";
import { PERMISSIONS } from "@/lib/permissions";
import { contentApiError } from "@/lib/features/content/apiResponse";
import { invalidateRegistrationPolicyCaches } from "@/lib/cache";

// The ?type= query param decides which list (TOS or PP) the caller sees. It is
// never taken on trust: an unknown value is a 400 rather than a silent "return
// everything", which would leak PP clauses into the TOS screen.
function readType(request: NextRequest): RegistrationPolicyType | null {
    const raw = request.nextUrl.searchParams.get("type");
    return (REGISTRATION_POLICY_TYPES as readonly string[]).includes(raw ?? "")
        ? (raw as RegistrationPolicyType)
        : null;
}

export async function GET(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.CONTENT_VIEW);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });
    try {
        const type = readType(request);
        if (!type) return contentApiError("Invalid policy type", { status: 400 });

        const items = await db.query.registrationPolicies.findMany({
            where: (t, { eq }) => eq(t.type, type),
            orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.createdAt)],
        });

        return NextResponse.json(items);
    } catch (error) {
        console.error("[REGISTRATION_POLICIES_GET]", error);
        return contentApiError("Failed to fetch registration policies", { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.CONTENT_EDIT);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });
    try {
        const result = await validateBody(request, registrationPolicySchema);
        if ("error" in result) return result.error;
        const body = result.data;

        // Sort order is per type, so the next number comes from that list only.
        const [{ maxSort }] = await db
            .select({ maxSort: max(registrationPolicies.sortOrder) })
            .from(registrationPolicies)
            .where(eq(registrationPolicies.type, body.type));
        const nextSortOrder = body.sortOrder || (maxSort ?? -1) + 1;

        const newId = crypto.randomUUID();
        await db.insert(registrationPolicies).values({
            id: newId,
            type: body.type,
            titleTh: body.titleTh,
            titleEn: body.titleEn || null,
            contentTh: body.contentTh,
            contentEn: body.contentEn || null,
            sortOrder: nextSortOrder,
            isActive: body.isActive,
            createdAt: mysqlNow(),
            updatedAt: mysqlNow(),
        });

        await invalidateRegistrationPolicyCaches();
        const item = await db.query.registrationPolicies.findFirst({
            where: (t, { eq }) => eq(t.id, newId),
        });

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.SETTINGS_UPDATE,
            resource: "RegistrationPolicy",
            resourceId: newId,
            resourceName: body.titleTh,
            details: { operation: "create", type: body.type, titleTh: body.titleTh },
        });

        return NextResponse.json(item, { status: 201 });
    } catch (error) {
        console.error("[REGISTRATION_POLICIES_POST]", error);
        return contentApiError("Failed to create registration policy", { status: 500 });
    }
}

// Bulk delete for one type — the red "ลบทั้งหมด" button in the admin toolbar.
export async function DELETE(request: NextRequest) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.CONTENT_EDIT);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });
    try {
        const type = readType(request);
        if (!type) return contentApiError("Invalid policy type", { status: 400 });

        const existing = await db.query.registrationPolicies.findMany({
            columns: { id: true },
            where: (t, { eq }) => eq(t.type, type),
        });
        await db.delete(registrationPolicies).where(eq(registrationPolicies.type, type));

        await invalidateRegistrationPolicyCaches();

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.SETTINGS_UPDATE,
            resource: "RegistrationPolicy",
            details: { operation: "delete_all", type, deleted: existing.length },
        });

        return NextResponse.json({ success: true, deleted: existing.length });
    } catch (error) {
        console.error("[REGISTRATION_POLICIES_DELETE_ALL]", error);
        return contentApiError("Failed to delete registration policies", { status: 500 });
    }
}
