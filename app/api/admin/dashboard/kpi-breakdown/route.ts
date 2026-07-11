import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db, orders, topups } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { toMySQLDatetime } from "@/lib/utils/date";
import { KPI_RANGE_DAYS, getKpiPeriodBounds, type ComparableKpiRange } from "@/lib/features/dashboard/kpiPeriods";

export const dynamic = "force-dynamic";

const COMPARABLE_RANGES: ComparableKpiRange[] = ["today", "7d", "30d"];

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const THAI_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

type BucketMetrics = {
    revenue: number;
    orders: number;
    aov: number;
    topup: number;
    netInflow: number;
};

// Timestamps are stored in UTC; bucket by Thai local time so days line up with
// the shop's business day. Numeric offsets work without MySQL timezone tables,
// and Thailand has no DST.
const thaiTime = (column: unknown) => sql`CONVERT_TZ(${column}, '+00:00', '+07:00')`;

/**
 * Bucket key for the bucket starting at UTC instant `t`: the Thai-local
 * ISO date ("2026-07-11") for daily buckets or date-hour ("2026-07-11T09")
 * for hourly ones. Matches the DATE_FORMAT patterns below.
 */
const bucketKey = (t: number, hourly: boolean) =>
    new Date(t + THAI_UTC_OFFSET_MS).toISOString().slice(0, hourly ? 13 : 10);

async function loadBucketRows(start: Date, end: Date, hourly: boolean) {
    const format = hourly ? "%Y-%m-%dT%H" : "%Y-%m-%d";
    const orderKey = sql<string>`DATE_FORMAT(${thaiTime(orders.purchasedAt)}, ${format})`;
    const topupKey = sql<string>`DATE_FORMAT(${thaiTime(topups.createdAt)}, ${format})`;

    const [orderRows, topupRows] = await Promise.all([
        db
            .select({ key: orderKey, revenue: sql<string>`COALESCE(SUM(${orders.totalPrice}), 0)`, orderCount: count() })
            .from(orders)
            // Filter on the raw UTC column so the purchasedAt index stays usable.
            .where(
                and(
                    isNull(orders.deletedAt),
                    gte(orders.purchasedAt, toMySQLDatetime(start)),
                    lt(orders.purchasedAt, toMySQLDatetime(end)),
                ),
            )
            .groupBy(orderKey),
        db
            .select({ key: topupKey, total: sql<string>`COALESCE(SUM(${topups.amount}), 0)` })
            .from(topups)
            .where(
                and(
                    eq(topups.status, "APPROVED"),
                    gte(topups.createdAt, toMySQLDatetime(start)),
                    lt(topups.createdAt, toMySQLDatetime(end)),
                ),
            )
            .groupBy(topupKey),
    ]);

    const revenueByKey = new Map(orderRows.map((row) => [row.key, { revenue: Number(row.revenue), orders: Number(row.orderCount) }]));
    const topupByKey = new Map(topupRows.map((row) => [row.key, Number(row.total)]));

    return (key: string): BucketMetrics => {
        const order = revenueByKey.get(key) ?? { revenue: 0, orders: 0 };
        const topup = topupByKey.get(key) ?? 0;
        return {
            revenue: order.revenue,
            orders: order.orders,
            aov: order.orders > 0 ? order.revenue / order.orders : 0,
            topup,
            netInflow: topup - order.revenue,
        };
    };
}

export async function GET(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const requested = request.nextUrl.searchParams.get("range");
    const range: ComparableKpiRange = COMPARABLE_RANGES.includes(requested as ComparableKpiRange)
        ? (requested as ComparableKpiRange)
        : "7d";

    try {
        const { currentStart, currentEnd, previousStart, previousEnd } = getKpiPeriodBounds(range);
        const hourly = range === "today";
        const bucketMs = hourly ? HOUR_MS : DAY_MS;
        const shift = KPI_RANGE_DAYS[range] * DAY_MS;
        const bucketCount = hourly
            ? Math.floor((currentEnd.getTime() - currentStart.getTime()) / HOUR_MS) + 1
            : KPI_RANGE_DAYS[range];

        const [currentMetrics, previousMetrics] = await Promise.all([
            loadBucketRows(currentStart, currentEnd, hourly),
            loadBucketRows(previousStart, previousEnd, hourly),
        ]);

        const points = Array.from({ length: bucketCount }, (_, i) => {
            const currentBucketStart = currentStart.getTime() + i * bucketMs;
            const date = bucketKey(currentBucketStart, hourly);
            const previousDate = bucketKey(currentBucketStart - shift, hourly);
            return {
                date,
                previousDate,
                current: currentMetrics(date),
                previous: previousMetrics(previousDate),
            };
        });

        return NextResponse.json({ success: true, range, granularity: hourly ? "hour" : "day", points });
    } catch (error) {
        console.error("[ADMIN_DASHBOARD_KPI_BREAKDOWN]", error);
        return NextResponse.json({ success: false, message: "Failed to load KPI breakdown" }, { status: 500 });
    }
}
