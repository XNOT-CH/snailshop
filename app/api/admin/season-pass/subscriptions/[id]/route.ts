import { NextRequest, NextResponse } from "next/server";
import { requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import {
    cancelSeasonPassSubscription,
    extendSeasonPassSubscription,
} from "@/lib/features/seasonPass/adminActions";
import { seasonPassApiError } from "@/lib/features/seasonPass/apiResponse";
import { PERMISSIONS } from "@/lib/permissions";

interface RouteParams { params: Promise<{ id: string }> }

/**
 * POST /api/admin/season-pass/subscriptions/[id]
 * Body: { action: "extend", days } | { action: "cancel", refund }
 *
 * The admin side was read-only, so "I paid and got nothing" could only be
 * answered by editing rows by hand — with no record of who did what.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.SEASON_PASS_EDIT);
    if (!authCheck.success) {
        return seasonPassApiError(authCheck.error ?? "Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => null) as
        | { action?: string; days?: number; refund?: boolean }
        | null;

    if (!body?.action) {
        return seasonPassApiError("ไม่พบคำสั่งที่ต้องการทำ", { status: 400 });
    }

    if (body.action === "extend") {
        const result = await extendSeasonPassSubscription(id, Number(body.days));
        if (!result.ok) {
            return seasonPassApiError(result.message, { status: result.status });
        }

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.SEASON_PASS_SUBSCRIPTION_EXTEND,
            resource: "SeasonPassSubscription",
            resourceId: id,
            resourceName: `ต่ออายุ ${result.days} วัน`,
            details: {
                resourceName: `ต่ออายุ ${result.days} วัน`,
                targetUserId: result.subscription.userId,
                changes: [{ field: "endAt", old: result.previousEndAt, new: result.endAt }],
            },
        });

        return NextResponse.json({ success: true, endAt: result.endAt, days: result.days });
    }

    if (body.action === "cancel") {
        const result = await cancelSeasonPassSubscription(id, { refund: Boolean(body.refund) });
        if (!result.ok) {
            return seasonPassApiError(result.message, { status: result.status });
        }

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.SEASON_PASS_SUBSCRIPTION_CANCEL,
            resource: "SeasonPassSubscription",
            resourceId: id,
            resourceName: result.refundAmount > 0 ? `ยกเลิกและคืน ${result.refundAmount} เครดิต` : "ยกเลิกโดยไม่คืนเครดิต",
            details: {
                resourceName: result.refundAmount > 0 ? `ยกเลิกและคืน ${result.refundAmount} เครดิต` : "ยกเลิกโดยไม่คืนเครดิต",
                targetUserId: result.subscription.userId,
                refundAmount: result.refundAmount,
            },
        });

        return NextResponse.json({ success: true, refundAmount: result.refundAmount });
    }

    return seasonPassApiError("คำสั่งไม่ถูกต้อง", { status: 400 });
}
