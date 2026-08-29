import { NextRequest, NextResponse } from "next/server";
import { runAutoDelete } from "@/lib/autoDelete";
import { requirePermissionWithCsrf } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

// Sweeps sold-out products past their timer into the product trash (soft
// delete, recoverable). Protected by CRON_SECRET env var.
// Call: GET /api/admin/auto-delete/run?secret=<CRON_SECRET>
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;
    const isProduction = process.env.NODE_ENV === "production";
    const isCronRequest = !!cronSecret && secret === cronSecret;

    if (isProduction && !cronSecret) {
        console.error("[AUTO_DELETE_CRON] Missing CRON_SECRET in production.");
        return NextResponse.json({ success: false, message: "Server misconfigured" }, { status: 500 });
    }

    if (!isCronRequest) {
        return NextResponse.json({ success: false, message: "Invalid cron secret" }, { status: 401 });
    }

    return runAutoDeleteAndRespond();
}

export async function POST(request: NextRequest) {
    const permissionCheck = await requirePermissionWithCsrf(request, PERMISSIONS.PRODUCT_DELETE);
    if (!permissionCheck.success) {
        return NextResponse.json({ success: false, message: permissionCheck.error }, { status: 401 });
    }

    return runAutoDeleteAndRespond(permissionCheck.userId ?? null);
}

async function runAutoDeleteAndRespond(actorId: string | null = null) {
    try {
        const { deleted, names } = await runAutoDelete({ actorId });

        return NextResponse.json({
            success: true,
            message: deleted > 0 ? `Moved ${deleted} product(s) to trash` : "No products to delete",
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
