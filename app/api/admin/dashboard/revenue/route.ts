import { NextRequest, NextResponse } from "next/server";
import { and, gte, isNull, sql } from "drizzle-orm";
import { db, orders } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { formatDateInTimeZone, toMySQLDatetime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

type Granularity = "day" | "week" | "month" | "year";

const GRANULARITIES: Granularity[] = ["day", "week", "month", "year"];

const THAI_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

// `purchasedAt` is stored in UTC; bucket by Thai local time so the chart's
// days/weeks/months line up with the shop's business day. Numeric offsets
// work without MySQL timezone tables, and Thailand has no DST.
const purchasedAtThai = sql`CONVERT_TZ(${orders.purchasedAt}, '+00:00', '+07:00')`;

/** Today's Thai calendar date, held at UTC midnight so UTC date arithmetic is safe. */
function thaiTodayAsUtcDate(): Date {
    return new Date(`${formatDateInTimeZone(new Date())}T00:00:00Z`);
}

/** Convert a Thai calendar date (held at UTC midnight) to the UTC instant of Thai midnight. */
const thaiMidnightUtc = (thaiDate: Date) => new Date(thaiDate.getTime() - THAI_UTC_OFFSET_MS);

const dateKey = (d: Date) => d.toISOString().slice(0, 10);

// Each granularity buckets `purchasedAt` into a period whose key is a parseable
// date string (so the chart's date formatter can render it). `keys` lists every
// period in the window so periods without orders render as zero instead of
// disappearing from the chart.
function getBucketConfig(granularity: Granularity) {
    const today = thaiTodayAsUtcDate();

    switch (granularity) {
        case "day": {
            const startThai = new Date(today);
            startThai.setUTCDate(startThai.getUTCDate() - 6);
            const keys = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(startThai);
                d.setUTCDate(d.getUTCDate() + i);
                return dateKey(d);
            });
            return {
                period: sql<string>`DATE_FORMAT(${purchasedAtThai}, '%Y-%m-%d')`,
                startUtc: thaiMidnightUtc(startThai),
                keys,
            };
        }
        case "week": {
            // Bucket key = Monday of the order's Thai week.
            const monday = new Date(today);
            monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
            const startThai = new Date(monday);
            startThai.setUTCDate(startThai.getUTCDate() - 7 * 7);
            const keys = Array.from({ length: 8 }, (_, i) => {
                const d = new Date(startThai);
                d.setUTCDate(d.getUTCDate() + i * 7);
                return dateKey(d);
            });
            return {
                period: sql<string>`DATE_FORMAT(DATE_SUB(${purchasedAtThai}, INTERVAL WEEKDAY(${purchasedAtThai}) DAY), '%Y-%m-%d')`,
                startUtc: thaiMidnightUtc(startThai),
                keys,
            };
        }
        case "year": {
            const startYear = today.getUTCFullYear() - 4;
            const startThai = new Date(Date.UTC(startYear, 0, 1));
            const keys = Array.from({ length: 5 }, (_, i) => `${startYear + i}-01-01`);
            return {
                period: sql<string>`DATE_FORMAT(${purchasedAtThai}, '%Y-01-01')`,
                startUtc: thaiMidnightUtc(startThai),
                keys,
            };
        }
        case "month":
        default: {
            const startThai = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1));
            const keys = Array.from({ length: 12 }, (_, i) =>
                dateKey(new Date(Date.UTC(startThai.getUTCFullYear(), startThai.getUTCMonth() + i, 1))),
            );
            return {
                period: sql<string>`DATE_FORMAT(${purchasedAtThai}, '%Y-%m-01')`,
                startUtc: thaiMidnightUtc(startThai),
                keys,
            };
        }
    }
}

export async function GET(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const requested = request.nextUrl.searchParams.get("granularity");
    const granularity: Granularity = GRANULARITIES.includes(requested as Granularity)
        ? (requested as Granularity)
        : "month";

    try {
        const { period, startUtc, keys } = getBucketConfig(granularity);

        const rows = await db
            .select({
                date: period,
                revenue: sql<string>`COALESCE(SUM(${orders.totalPrice}), 0)`,
            })
            .from(orders)
            // Filter on the raw UTC column so the purchasedAt index stays usable.
            .where(and(isNull(orders.deletedAt), gte(orders.purchasedAt, toMySQLDatetime(startUtc))))
            .groupBy(period);

        const revenueByPeriod = new Map(rows.map((row) => [row.date, Number(row.revenue)]));
        const data = keys.map((date) => ({ date, revenue: revenueByPeriod.get(date) ?? 0 }));

        return NextResponse.json({ success: true, granularity, data });
    } catch (error) {
        console.error("[ADMIN_DASHBOARD_REVENUE]", error);
        return NextResponse.json({ success: false, message: "Failed to load revenue data" }, { status: 500 });
    }
}
