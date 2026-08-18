import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db, promoCodes, promoUsages, users } from "@/lib/db";
import { requireAnyPermissionWithCsrf, requirePermission } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { PERMISSIONS } from "@/lib/permissions";
import { getCreditCodeUsageSummary, listCreditCodeUsages } from "@/lib/features/promo/queries";

class AlreadyProcessedUsageError extends Error {
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
        throw new AlreadyProcessedUsageError();
    }
}

export async function GET(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.TOPUP_CODE_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const params = request.nextUrl.searchParams;
        const rawPage = Number.parseInt(params.get("page") || "1", 10) || 1;
        const rawPageSize = Number.parseInt(params.get("pageSize") || "20", 10) || 20;
        const search = params.get("search")?.trim() || "";
        const status = params.get("status") || "ALL";
        const startDateParam = params.get("startDate");
        const endDateParam = params.get("endDate");

        const [usages, summary] = await Promise.all([
            listCreditCodeUsages({
                search,
                status,
                startDate: startDateParam ? new Date(startDateParam) : undefined,
                endDate: endDateParam ? new Date(endDateParam) : undefined,
                page: Math.max(1, rawPage),
                pageSize: Math.min(50, Math.max(1, rawPageSize)),
            }),
            getCreditCodeUsageSummary(),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                records: usages.rows.map((row) => ({
                    id: row.id,
                    code: row.code,
                    amount: Number(row.amount),
                    status: row.status,
                    createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date(row.createdAt).toISOString(),
                    user: { username: row.username, email: row.email },
                })),
                pagination: usages.pagination,
                summary,
            },
        });
    } catch (error) {
        console.error("[ADMIN_TOPUP_CODE_USAGES]", error);
        return NextResponse.json({ success: false, message: "Failed to load topup code usages" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    // Authorize against either permission first, then re-check the one that
    // matches the requested action so a reject-only operator cannot approve
    // (and credit balance) and vice versa.
    const authCheck = await requireAnyPermissionWithCsrf(request, [PERMISSIONS.TOPUP_CODE_APPROVE, PERMISSIONS.TOPUP_CODE_REJECT]);
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

        const requiredPermission = action === "APPROVE" ? PERMISSIONS.TOPUP_CODE_APPROVE : PERMISSIONS.TOPUP_CODE_REJECT;
        const actionPermissionCheck = await requirePermission(requiredPermission);
        if (!actionPermissionCheck.success) {
            return NextResponse.json({ success: false, message: "ไม่มีสิทธิ์ดำเนินการนี้" }, { status: 403 });
        }

        const usage = await db.query.promoUsages.findFirst({
            where: eq(promoUsages.id, id),
            with: { user: true },
        });

        if (!usage) {
            return NextResponse.json({ success: false, message: "Usage record not found" }, { status: 404 });
        }

        if (usage.status !== "PENDING") {
            return NextResponse.json({ success: false, message: "Request already processed" }, { status: 400 });
        }

        const amount = Number(usage.discountAmount);

        if (action === "APPROVE") {
            try {
                await db.transaction(async (tx) => {
                    const updateResult = await tx
                        .update(promoUsages)
                        .set({ status: "COMPLETED" })
                        .where(and(eq(promoUsages.id, id), eq(promoUsages.status, "PENDING")));
                    assertSinglePendingTransition(updateResult);

                    await tx
                        .update(users)
                        .set({ creditBalance: sql`creditBalance + ${amount}` })
                        .where(eq(users.id, usage.userId));
                });
            } catch (error) {
                if (error instanceof AlreadyProcessedUsageError) {
                    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
                }

                throw error;
            }

            await auditFromRequest(request, {
                userId: authCheck.userId,
                action: AUDIT_ACTIONS.TOPUP_APPROVE,
                resource: "PromoUsage",
                resourceId: id,
                resourceName: usage.promoCode,
                details: { targetUserId: usage.userId, amount, previousStatus: "PENDING", newStatus: "COMPLETED" },
            });

            return NextResponse.json({
                success: true,
                message: `Approved! Added ฿${amount.toLocaleString()} to ${usage.user.username}'s balance`,
            });
        }

        const rejectResult = await db.transaction(async (tx) => {
            const updateResult = await tx
                .update(promoUsages)
                .set({ status: "REJECTED" })
                .where(and(eq(promoUsages.id, id), eq(promoUsages.status, "PENDING")));
            assertSinglePendingTransition(updateResult);

            // Free the slot the pending redemption had reserved against the code's usageLimit.
            await tx
                .update(promoCodes)
                .set({ usedCount: sql`GREATEST(usedCount - 1, 0)` })
                .where(eq(promoCodes.id, usage.promoCodeId));

            return updateResult;
        }).catch((error) => {
            if (error instanceof AlreadyProcessedUsageError) {
                return null;
            }
            throw error;
        });

        if (!rejectResult) {
            return NextResponse.json({ success: false, message: "Request already processed" }, { status: 400 });
        }

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.TOPUP_REJECT,
            resource: "PromoUsage",
            resourceId: id,
            resourceName: usage.promoCode,
            details: { targetUserId: usage.userId, amount, previousStatus: "PENDING", newStatus: "REJECTED" },
        });

        return NextResponse.json({ success: true, message: "Request rejected" });
    } catch (error) {
        console.error("Topup code usage approval error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Failed to process request" },
            { status: 500 }
        );
    }
}
