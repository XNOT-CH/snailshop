import { NextRequest, NextResponse } from "next/server";
import { db, registrationPolicies } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { validateBody } from "@/lib/validations/validate";
import { registrationPolicyReorderSchema } from "@/lib/validations/content";
import { PERMISSIONS } from "@/lib/permissions";
import { contentApiError } from "@/lib/features/content/apiResponse";
import { invalidateRegistrationPolicyCaches } from "@/lib/cache";

export async function POST(request: NextRequest) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.CONTENT_EDIT);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });
    try {
        const result = await validateBody(request, registrationPolicyReorderSchema);
        if ("error" in result) return result.error;
        const { orders } = result.data;

        await Promise.all(
            orders.map(({ id, sortOrder }) =>
                db.update(registrationPolicies).set({ sortOrder }).where(eq(registrationPolicies.id, id)),
            ),
        );

        await invalidateRegistrationPolicyCaches();

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.SETTINGS_UPDATE,
            resource: "RegistrationPolicy",
            details: { operation: "reorder", order: orders.map((o) => o.id) },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[REGISTRATION_POLICIES_REORDER]", error);
        return contentApiError("Failed to reorder registration policies", { status: 500 });
    }
}
