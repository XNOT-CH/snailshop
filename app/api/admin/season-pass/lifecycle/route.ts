import { NextRequest, NextResponse } from "next/server";
import { requirePermissionWithCsrf } from "@/lib/auth";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/auditLog";
import { activateQueuedSeasonPassSubscriptions, expireSeasonPassSubscriptions } from "@/lib/seasonPass";
import { PERMISSIONS } from "@/lib/permissions";
import { seasonPassApiError } from "@/lib/features/seasonPass/apiResponse";

/**
 * Moves Season Pass subscriptions between statuses: ends the ones whose window
 * has passed, and promotes queued renewals whose window has begun.
 *
 * This used to happen only while an admin had the Season Pass overview open, so
 * a page that asks for view permission was writing rows for the whole shop and
 * every status-filtered number was only correct after someone visited.
 *
 * Protected by CRON_SECRET, same as the product auto-delete sweep.
 * Call: GET /api/admin/season-pass/lifecycle?secret=<CRON_SECRET>
 */
export async function GET(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === "production" && !cronSecret) {
        console.error("[SEASON_PASS_LIFECYCLE] Missing CRON_SECRET in production.");
        return seasonPassApiError("Server misconfigured", { status: 500 });
    }

    if (!cronSecret || secret !== cronSecret) {
        return seasonPassApiError("Invalid cron secret", { status: 401 });
    }

    return runLifecycleAndRespond(null);
}

export async function POST(request: NextRequest) {
    const permissionCheck = await requirePermissionWithCsrf(request, PERMISSIONS.SEASON_PASS_EDIT);
    if (!permissionCheck.success) {
        return seasonPassApiError(permissionCheck.error ?? "Unauthorized", { status: 401 });
    }

    return runLifecycleAndRespond(permissionCheck.userId ?? null);
}

async function runLifecycleAndRespond(actorId: string | null) {
    try {
        const expired = await expireSeasonPassSubscriptions();
        const activated = await activateQueuedSeasonPassSubscriptions();

        if (expired > 0 || activated > 0) {
            await createAuditLog({
                userId: actorId,
                action: AUDIT_ACTIONS.SEASON_PASS_LIFECYCLE_RUN,
                resource: "SeasonPassSubscription",
                resourceId: "lifecycle",
                resourceName: `หมดอายุ ${expired} • เริ่มรอบใหม่ ${activated}`,
                details: { expired, activated },
            });
        }

        return NextResponse.json({ success: true, expired, activated });
    } catch (error) {
        console.error("[SEASON_PASS_LIFECYCLE]", error);
        return seasonPassApiError(
            error instanceof Error ? error.message : "Failed to run the Season Pass lifecycle",
            { status: 500 },
        );
    }
}
