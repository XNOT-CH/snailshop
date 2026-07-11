import { NextResponse } from "next/server";
import { and, gte, isNull, sql } from "drizzle-orm";
import { db, orders } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getThaiDayStartUtc, toMySQLDatetime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;

// Bucket by Thai local time so peak hours match the shop's business day
// (same CONVERT_TZ approach as the revenue route; Thailand has no DST).
const purchasedAtThai = sql`CONVERT_TZ(${orders.purchasedAt}, '+00:00', '+07:00')`;

export async function GET() {
    const authCheck = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    try {
        const start = new Date(getThaiDayStartUtc().getTime() - (WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000);

        const rows = await db
            .select({
                // WEEKDAY: 0 = Monday … 6 = Sunday
                weekday: sql<number>`WEEKDAY(${purchasedAtThai})`,
                hour: sql<number>`HOUR(${purchasedAtThai})`,
                orderCount: sql<string>`COUNT(*)`,
                revenue: sql<string>`COALESCE(SUM(${orders.totalPrice}), 0)`,
            })
            .from(orders)
            // Filter on the raw UTC column so the purchasedAt index stays usable.
            .where(and(isNull(orders.deletedAt), gte(orders.purchasedAt, toMySQLDatetime(start))))
            .groupBy(sql`WEEKDAY(${purchasedAtThai})`, sql`HOUR(${purchasedAtThai})`);

        const data = rows.map((row) => ({
            weekday: Number(row.weekday),
            hour: Number(row.hour),
            orders: Number(row.orderCount),
            revenue: Number(row.revenue),
        }));

        return NextResponse.json({ success: true, windowDays: WINDOW_DAYS, data });
    } catch (error) {
        console.error("[ADMIN_DASHBOARD_SALES_HEATMAP]", error);
        return NextResponse.json({ success: false, message: "Failed to load sales heatmap" }, { status: 500 });
    }
}
