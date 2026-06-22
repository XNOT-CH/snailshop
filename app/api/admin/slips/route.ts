import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db, topups, users } from "@/lib/db";
import { requireAnyPermissionWithCsrf, requirePermission } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { PERMISSIONS } from "@/lib/permissions";

class AlreadyProcessedTopupError extends Error {
    constructor() {
        super("Request already processed");
    }
}

function getAffectedRows(result: unknown): number | null {
    if (Array.isArray(result)) {
        return getAffectedRows(result[0]);
    }

    if (!result || typeof result !== "object") {
        return null;
    }

    const maybeResult = result as { affectedRows?: unknown; rowsAffected?: unknown };
    if (typeof maybeResult.affectedRows === "number") {
        return maybeResult.affectedRows;
    }

    if (typeof maybeResult.rowsAffected === "number") {
        return maybeResult.rowsAffected;
    }

    return null;
}

function assertSinglePendingTransition(result: unknown) {
    if (getAffectedRows(result) !== 1) {
        throw new AlreadyProcessedTopupError();
    }
}

export async function PATCH(request: NextRequest) {
    // Authorize against any slip permission first, then re-check the
    // permission that matches the requested action so a reject-only operator
    // cannot approve (and credit balance) and vice versa.
    const authCheck = await requireAnyPermissionWithCsrf(request, [PERMISSIONS.SLIP_APPROVE, PERMISSIONS.SLIP_REJECT]);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const { id, action } = await request.json();
        if (!id || !action) {
            return NextResponse.json({ success: false, message: "Missing id or action" }, { status: 400 });
        }

        if (!["APPROVE", "REJECT"].includes(action)) {
            return NextResponse.json({ success: false, message: "Invalid action. Use APPROVE or REJECT" }, { status: 400 });
        }

        const requiredPermission = action === "APPROVE" ? PERMISSIONS.SLIP_APPROVE : PERMISSIONS.SLIP_REJECT;
        const actionPermissionCheck = await requirePermission(requiredPermission);
        if (!actionPermissionCheck.success) {
            return NextResponse.json({ success: false, message: "ไม่มีสิทธิ์ดำเนินการนี้" }, { status: 403 });
        }

        const topup = await db.query.topups.findFirst({
            where: eq(topups.id, id),
            with: { user: true },
        });

        if (!topup) {
            return NextResponse.json({ success: false, message: "Topup request not found" }, { status: 404 });
        }

        if (topup.status !== "PENDING") {
            return NextResponse.json({ success: false, message: "Request already processed" }, { status: 400 });
        }

        if (action === "APPROVE") {
            // Keep the balance credit and status change atomic.
            try {
                await db.transaction(async (tx) => {
                    const updateResult = await tx
                        .update(topups)
                        .set({ status: "APPROVED" })
                        .where(and(
                            eq(topups.id, id),
                            eq(topups.status, "PENDING"),
                        ));
                    assertSinglePendingTransition(updateResult);

                    await tx
                        .update(users)
                        .set({ creditBalance: sql`creditBalance + ${Number(topup.amount)}` })
                        .where(eq(users.id, topup.userId));
                });
            } catch (error) {
                if (error instanceof AlreadyProcessedTopupError) {
                    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
                }

                throw error;
            }

            await auditFromRequest(request, {
                userId: authCheck.userId,
                action: AUDIT_ACTIONS.TOPUP_APPROVE,
                resource: "TopupRequest",
                resourceId: id,
                resourceName: topup.user.username,
                details: {
                    targetUserId: topup.userId,
                    amount: Number(topup.amount),
                    previousStatus: topup.status,
                    newStatus: "APPROVED",
                },
            });

            return NextResponse.json({
                success: true,
                message: `Approved! Added ฿${Number(topup.amount).toLocaleString()} to ${topup.user.username}'s balance`,
            });
        }

        const rejectResult = await db
            .update(topups)
            .set({ status: "REJECTED" })
            .where(and(
                eq(topups.id, id),
                eq(topups.status, "PENDING"),
            ));
        if (getAffectedRows(rejectResult) !== 1) {
            return NextResponse.json({ success: false, message: "Request already processed" }, { status: 400 });
        }
        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.TOPUP_REJECT,
            resource: "TopupRequest",
            resourceId: id,
            resourceName: topup.user.username,
            details: {
                targetUserId: topup.userId,
                amount: Number(topup.amount),
                previousStatus: topup.status,
                newStatus: "REJECTED",
            },
        });

        return NextResponse.json({ success: true, message: "Request rejected" });
    } catch (error) {
        console.error("Slip approval error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Failed to process request" },
            { status: 500 }
        );
    }
}
