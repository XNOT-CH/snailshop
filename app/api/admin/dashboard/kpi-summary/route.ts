import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, gte, isNull, lt, sql, type SQL } from "drizzle-orm";
import { db, orders, topups } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { toMySQLDatetime } from "@/lib/utils/date";
import { KPI_RANGES, getKpiPeriodBounds, type KpiRange } from "@/lib/features/dashboard/kpiPeriods";
import { getSeasonPassRevenueTotal } from "@/lib/seasonPass";

export const dynamic = "force-dynamic";

type PeriodMetrics = {
    revenue: number;
    orders: number;
    aov: number;
    topup: number;
    netInflow: number;
    /** Part of `revenue` and `orders`, kept separate so the UI can break it out. */
    seasonPassRevenue: number;
    seasonPassSales: number;
};

async function loadPeriodMetrics(start: Date | null, end: Date | null): Promise<PeriodMetrics> {
    const orderConditions: SQL[] = [isNull(orders.deletedAt)];
    const topupConditions: SQL[] = [eq(topups.status, "APPROVED")];

    if (start) {
        orderConditions.push(gte(orders.purchasedAt, toMySQLDatetime(start)));
        topupConditions.push(gte(topups.createdAt, toMySQLDatetime(start)));
    }
    if (end) {
        orderConditions.push(lt(orders.purchasedAt, toMySQLDatetime(end)));
        topupConditions.push(lt(topups.createdAt, toMySQLDatetime(end)));
    }

    const [[orderRow], [topupRow], seasonPass] = await Promise.all([
        db
            .select({ revenue: sql<string>`COALESCE(SUM(${orders.totalPrice}), 0)`, orderCount: count() })
            .from(orders)
            .where(and(...orderConditions)),
        db
            .select({ total: sql<string>`COALESCE(SUM(${topups.amount}), 0)` })
            .from(topups)
            .where(and(...topupConditions)),
        // Season Pass sales are credit spend like any order, but they live in
        // their own table and were missing from every revenue number here.
        getSeasonPassRevenueTotal(start ?? undefined, end ?? undefined),
    ]);

    const revenue = Number(orderRow.revenue) + seasonPass.revenue;
    const orderCount = Number(orderRow.orderCount) + seasonPass.sales;
    const topup = Number(topupRow.total);

    return {
        revenue,
        orders: orderCount,
        aov: orderCount > 0 ? revenue / orderCount : 0,
        topup,
        netInflow: topup - revenue,
        seasonPassRevenue: seasonPass.revenue,
        seasonPassSales: seasonPass.sales,
    };
}

export async function GET(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const requested = request.nextUrl.searchParams.get("range");
    const range: KpiRange = KPI_RANGES.includes(requested as KpiRange) ? (requested as KpiRange) : "7d";

    try {
        if (range === "all") {
            const current = await loadPeriodMetrics(null, null);
            return NextResponse.json({ success: true, range, current, previous: null });
        }

        const { currentStart, currentEnd, previousStart, previousEnd } = getKpiPeriodBounds(range);
        const [current, previous] = await Promise.all([
            loadPeriodMetrics(currentStart, currentEnd),
            loadPeriodMetrics(previousStart, previousEnd),
        ]);

        return NextResponse.json({ success: true, range, current, previous });
    } catch (error) {
        console.error("[ADMIN_DASHBOARD_KPI_SUMMARY]", error);
        return NextResponse.json({ success: false, message: "Failed to load KPI summary" }, { status: 500 });
    }
}
