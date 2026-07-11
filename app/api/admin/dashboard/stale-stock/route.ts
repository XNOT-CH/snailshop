import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gt, gte, isNull, lt, notExists, or, sql } from "drizzle-orm";
import { db, orders, products } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { mysqlDateTimeToIso, toMySQLDatetime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const ALLOWED_DAYS = [30, 60, 90];

// Stock value uses the effective sale price and the cached stock count.
const stuckValue = sql<string>`COALESCE(${products.discountPrice}, ${products.price}) * COALESCE(${products.stockCount}, 0)`;

export async function GET(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const requested = Number.parseInt(request.nextUrl.searchParams.get("days") ?? "30", 10);
    const days = ALLOWED_DAYS.includes(requested) ? requested : 30;

    try {
        const cutoff = toMySQLDatetime(new Date(Date.now() - days * DAY_MS));

        // Stale = still listed, has (or may have) stock, existed before the
        // window, and sold nothing inside it.
        const staleConditions = and(
            eq(products.isSold, false),
            or(isNull(products.stockCount), gt(products.stockCount, 0)),
            lt(products.createdAt, cutoff),
            notExists(
                db
                    .select({ one: sql`1` })
                    .from(orders)
                    .where(
                        and(
                            eq(orders.productId, products.id),
                            isNull(orders.deletedAt),
                            gte(orders.purchasedAt, cutoff),
                        ),
                    ),
            ),
        );

        const lastSoldAt = sql<string | null>`(
            SELECT MAX(${orders.purchasedAt}) FROM ${orders}
            WHERE ${orders.productId} = ${products.id} AND ${orders.deletedAt} IS NULL
        )`;

        const [rows, [totals]] = await Promise.all([
            db
                .select({
                    id: products.id,
                    name: products.name,
                    imageUrl: products.imageUrl,
                    category: products.category,
                    price: sql<string>`COALESCE(${products.discountPrice}, ${products.price})`,
                    stockCount: products.stockCount,
                    stuckValue,
                    lastSoldAt,
                    createdAt: products.createdAt,
                })
                .from(products)
                .where(staleConditions)
                .orderBy(desc(stuckValue))
                .limit(10),
            db
                .select({
                    staleCount: sql<number>`COUNT(*)`,
                    totalStuckValue: sql<string>`COALESCE(SUM(${stuckValue}), 0)`,
                })
                .from(products)
                .where(staleConditions),
        ]);

        return NextResponse.json({
            success: true,
            days,
            staleCount: Number(totals.staleCount),
            totalStuckValue: Number(totals.totalStuckValue),
            items: rows.map((row) => ({
                ...row,
                price: Number(row.price),
                stockCount: row.stockCount === null ? null : Number(row.stockCount),
                stuckValue: Number(row.stuckValue),
                lastSoldAt: row.lastSoldAt ? mysqlDateTimeToIso(row.lastSoldAt) : null,
                createdAt: mysqlDateTimeToIso(row.createdAt) ?? row.createdAt,
            })),
        });
    } catch (error) {
        console.error("[ADMIN_DASHBOARD_STALE_STOCK]", error);
        return NextResponse.json({ success: false, message: "Failed to load stale stock" }, { status: 500 });
    }
}
