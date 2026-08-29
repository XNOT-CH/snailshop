import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermissionWithCsrf } from "@/lib/auth";
import { listOtherProductsForStockCheck, listProductsForStockCheck } from "@/lib/features/products/queries";
import { findTakenUsersAmong } from "@/lib/features/products/stockValidation";
import { PERMISSIONS } from "@/lib/permissions";

const MAX_USERS_PER_CHECK = 500;

/**
 * POST /api/admin/products/stock-check
 * Body: { users: string[], excludeProductId?: string }
 *
 * Answers "is any of these usernames already in another product's stock?" for a
 * named set. The create form used to pull every username in the shop on load
 * just to warn about the few being typed in.
 */
export async function POST(request: NextRequest) {
    const authCheck = await requireAnyPermissionWithCsrf(request, [
        PERMISSIONS.PRODUCT_CREATE,
        PERMISSIONS.PRODUCT_EDIT,
    ]);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const body = await request.json() as { users?: unknown; excludeProductId?: unknown };
        const users = Array.isArray(body.users)
            ? body.users.filter((user): user is string => typeof user === "string" && user.trim().length > 0)
                .map((user) => user.trim())
                .slice(0, MAX_USERS_PER_CHECK)
            : [];

        if (users.length === 0) {
            return NextResponse.json({ success: true, conflicts: {} });
        }

        const excludeProductId = typeof body.excludeProductId === "string" ? body.excludeProductId : null;
        const products = excludeProductId
            ? await listOtherProductsForStockCheck(excludeProductId)
            : await listProductsForStockCheck();

        return NextResponse.json({ success: true, conflicts: findTakenUsersAmong(users, products) });
    } catch (error) {
        console.error("[PRODUCT_STOCK_CHECK]", error);
        return NextResponse.json({ success: false, message: "Failed to check stock users" }, { status: 500 });
    }
}
