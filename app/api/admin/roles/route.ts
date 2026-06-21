import { mysqlNow } from "@/lib/utils/date";
import { NextResponse } from "next/server";
import { db, roles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requirePermission, requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { validateBody } from "@/lib/validations/validate";
import { roleSchema } from "@/lib/validations/content";
import { PERMISSIONS } from "@/lib/permissions";
import { resolveUniqueRoleCode } from "@/lib/roleCode";
import { contentApiError } from "@/lib/features/content/apiResponse";

export async function GET() {
    const authCheck = await requirePermission(PERMISSIONS.USER_MANAGE_ROLE);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });
    try {
        const roleList = await db.query.roles.findMany({ orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.createdAt)] });
        return NextResponse.json(roleList);
    } catch (error) {
        console.error("Error fetching roles:", error);
        return contentApiError("Failed to fetch roles", { status: 500 });
    }
}

export async function POST(request: Request) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.USER_MANAGE_ROLE);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });
    try {
        const result = await validateBody(request, roleSchema);
        if ("error" in result) return result.error;
        const { name, description, permissions } = result.data;

        const newId = crypto.randomUUID();
        const roleCode = await resolveUniqueRoleCode({
            name,
            fallbackSeed: newId,
            isTaken: async (code) => {
                const existing = await db.query.roles.findFirst({ where: eq(roles.code, code) });
                return Boolean(existing);
            },
        });

        await db.insert(roles).values({
            id: newId, name, code: roleCode, description: description || null,
            permissions: permissions.length > 0 ? permissions : null,
            sortOrder: 0, isSystem: false,
            createdAt: mysqlNow(),
            updatedAt: mysqlNow(),
        });
        const role = await db.query.roles.findFirst({ where: eq(roles.id, newId) });

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.ROLE_CREATE || "ROLE_CREATE", resource: "Role", resourceId: newId,
            details: { name, code: roleCode },
        });
        return NextResponse.json(role, { status: 201 });
    } catch (error) {
        console.error("Error creating role:", error);
        return contentApiError("Failed to create role", { status: 500 });
    }
}
