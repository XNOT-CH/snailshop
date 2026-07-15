import { and, count, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db, orders, topups } from "@/lib/db";
import { toMySQLDatetime } from "@/lib/utils/date";

export type BucketMetrics = {
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
 * Load order/topup metrics for [start, end) grouped into Thai-local buckets
 * (hourly or daily) and return a lookup by bucket key. Keys follow the format
 * produced by `bucketKey` in kpiPeriods.ts.
 */
export async function loadBucketMetrics(start: Date, end: Date, hourly: boolean) {
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
