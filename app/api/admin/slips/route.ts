import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, topups, users } from "@/lib/db";
import { requireAnyPermission } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: NextRequest) {
    const authCheck = await requireAnyPermission([PERMISSIONS.SLIP_APPROVE, PERMISSIONS.SLIP_REJECT]);
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
            await db.transaction(async (tx) => {
                await tx.update(topups).set({ status: "APPROVED" }).where(eq(topups.id, id));
                await tx
                    .update(users)
                    .set({ creditBalance: sql`creditBalance + ${Number(topup.amount)}` })
                    .where(eq(users.id, topup.userId));
            });

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

        await db.update(topups).set({ status: "REJECTED" }).where(eq(topups.id, id));
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
