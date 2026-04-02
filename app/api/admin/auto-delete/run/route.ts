import { NextRequest, NextResponse } from "next/server";
import { runAutoDelete } from "@/lib/autoDelete";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

// Protected by CRON_SECRET env var
// Call: GET /api/admin/auto-delete/run?secret=<CRON_SECRET>
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction && !cronSecret) {
        console.error("[AUTO_DELETE_CRON] Missing CRON_SECRET in production.");
        return NextResponse.json({ success: false, message: "Server misconfigured" }, { status: 500 });
    }

    if (cronSecret && secret !== cronSecret) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { deleted, names } = await runAutoDelete();

        if (deleted > 0) {
            await auditFromRequest(request, {
                action: AUDIT_ACTIONS.PRODUCT_DELETE,
                resource: "Product",
                resourceId: "auto-delete",
                resourceName: `Auto-deleted ${deleted} products`,
                details: { reason: "auto_delete_cron", deletedProducts: names },
            });
        }

        return NextResponse.json({
            success: true,
            message: deleted > 0 ? `Deleted ${deleted} product(s)` : "No products to delete",
            deleted,
            products: names,
        });
    } catch (error) {
        console.error("[AUTO_DELETE_CRON]", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Failed" },
            { status: 500 }
        );
    }
}
