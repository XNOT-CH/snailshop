import { NextRequest, NextResponse } from "next/server";
import { db, navItems } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { validateBody } from "@/lib/validations/validate";
import { navItemsReorderSchema } from "@/lib/validations/content";
import { PERMISSIONS } from "@/lib/permissions";
import { contentApiError } from "@/lib/features/content/apiResponse";
import { invalidateNavItemCaches } from "@/lib/cache";

export async function POST(request: NextRequest) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.SETTINGS_EDIT);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });
    try {
        const result = await validateBody(request, navItemsReorderSchema);
        if ("error" in result) return result.error;
        const { orders } = result.data;

        await Promise.all(
            orders.map(({ id, sortOrder }) =>
                db.update(navItems).set({ sortOrder }).where(eq(navItems.id, id)),
            ),
        );

        await invalidateNavItemCaches();

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.SETTINGS_UPDATE,
            resource: "NavItem",
            details: { operation: "reorder", order: orders.map((o) => o.id) },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[NAV_ITEMS_REORDER]", error);
        return contentApiError("Failed to reorder nav items", { status: 500 });
    }
}
