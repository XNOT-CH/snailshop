import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, gte, isNull, lt, sql, type SQL } from "drizzle-orm";
import { db, orders, topups } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getThaiDayStartUtc, toMySQLDatetime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

type Range = "today" | "7d" | "30d" | "all";

const RANGES: Range[] = ["today", "7d", "30d", "all"];

const RANGE_DAYS: Record<Exclude<Range, "all">, number> = {
    today: 1,
    "7d": 7,
    "30d": 30,
};

type PeriodMetrics = {
    revenue: number;
    orders: number;
    aov: number;
    topup: number;
    netInflow: number;
};

/**
 * Current period = the last N Thai calendar days including today (today is
 * partial). Previous period = the N full days immediately before, so the
 * delta compares equal-length windows.
 */
function getPeriodBounds(range: Exclude<Range, "all">) {
    const days = RANGE_DAYS[range];
    const todayStart = getThaiDayStartUtc();
    const DAY_MS = 24 * 60 * 60 * 1000;

    const currentStart = new Date(todayStart.getTime() - (days - 1) * DAY_MS);
    const previousStart = new Date(currentStart.getTime() - days * DAY_MS);

    return { currentStart, previousStart, currentEnd: null, previousEnd: currentStart };
}

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

    const [[orderRow], [topupRow]] = await Promise.all([
        db
            .select({ revenue: sql<string>`COALESCE(SUM(${orders.totalPrice}), 0)`, orderCount: count() })
            .from(orders)
            .where(and(...orderConditions)),
        db
            .select({ total: sql<string>`COALESCE(SUM(${topups.amount}), 0)` })
            .from(topups)
            .where(and(...topupConditions)),
    ]);

    const revenue = Number(orderRow.revenue);
    const orderCount = Number(orderRow.orderCount);
    const topup = Number(topupRow.total);

    return {
        revenue,
        orders: orderCount,
        aov: orderCount > 0 ? revenue / orderCount : 0,
        topup,
        netInflow: topup - revenue,
    };
}

export async function GET(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const requested = request.nextUrl.searchParams.get("range");
    const range: Range = RANGES.includes(requested as Range) ? (requested as Range) : "7d";

    try {
        if (range === "all") {
            const current = await loadPeriodMetrics(null, null);
            return NextResponse.json({ success: true, range, current, previous: null });
        }

        const { currentStart, currentEnd, previousStart, previousEnd } = getPeriodBounds(range);
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
