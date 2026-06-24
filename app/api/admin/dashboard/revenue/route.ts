import { NextRequest, NextResponse } from "next/server";
import { and, gte, isNull, sql } from "drizzle-orm";
import { db, orders } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type Granularity = "day" | "week" | "month" | "year";

const GRANULARITIES: Granularity[] = ["day", "week", "month", "year"];

// Each granularity buckets `purchasedAt` into a period whose key is a parseable
// date string (so the chart's date formatter can render it) and limits how far
// back we look.
function getBucketConfig(granularity: Granularity) {
    switch (granularity) {
        case "day":
            return {
                period: sql<string>`DATE_FORMAT(${orders.purchasedAt}, '%Y-%m-%d')`,
                start: sql`CURDATE() - INTERVAL 6 DAY`,
            };
        case "week":
            return {
                // Bucket key = Monday of the order's week.
                period: sql<string>`DATE_FORMAT(DATE_SUB(${orders.purchasedAt}, INTERVAL WEEKDAY(${orders.purchasedAt}) DAY), '%Y-%m-%d')`,
                start: sql`DATE_SUB(CURDATE(), INTERVAL 7 WEEK)`,
            };
        case "year":
            return {
                period: sql<string>`DATE_FORMAT(${orders.purchasedAt}, '%Y-01-01')`,
                start: sql`DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 4 YEAR), '%Y-01-01')`,
            };
        case "month":
        default:
            return {
                period: sql<string>`DATE_FORMAT(${orders.purchasedAt}, '%Y-%m-01')`,
                start: sql`DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%Y-%m-01')`,
            };
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
        const { period, start } = getBucketConfig(granularity);

        const rows = await db
            .select({
                date: period,
                revenue: sql<string>`COALESCE(SUM(${orders.totalPrice}), 0)`,
            })
            .from(orders)
            .where(and(isNull(orders.deletedAt), gte(orders.purchasedAt, start)))
            .groupBy(period)
            .orderBy(period);

        const data = rows.map((row) => ({ date: row.date, revenue: Number(row.revenue) }));

        return NextResponse.json({ success: true, granularity, data });
    } catch (error) {
        console.error("[ADMIN_DASHBOARD_REVENUE]", error);
        return NextResponse.json({ success: false, message: "Failed to load revenue data" }, { status: 500 });
    }
}
