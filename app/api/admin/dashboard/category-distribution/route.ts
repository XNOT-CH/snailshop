import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db, orders, products } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getThaiDayStartUtc, toMySQLDatetime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const ALLOWED_DAYS = [7, 30, 90];

export async function GET(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const requested = Number.parseInt(request.nextUrl.searchParams.get("days") ?? "30", 10);
    const days = ALLOWED_DAYS.includes(requested) ? requested : 30;

    try {
        const rangeStart = new Date(getThaiDayStartUtc().getTime() - (days - 1) * DAY_MS);

        // Orders snapshot productId without an FK, so a deleted product leaves the
        // join empty — those sales are grouped under "ไม่ทราบหมวดหมู่".
        const rows = await db
            .select({
                category: products.category,
                revenue: sql<string>`COALESCE(SUM(${orders.totalPrice}), 0)`,
                orderCount: count(),
            })
            .from(orders)
            .leftJoin(products, eq(orders.productId, products.id))
            .where(and(isNull(orders.deletedAt), gte(orders.purchasedAt, toMySQLDatetime(rangeStart))))
            .groupBy(products.category)
            .orderBy(desc(sql`SUM(${orders.totalPrice})`));

        const categories = rows.map((row) => ({
            name: row.category ?? "ไม่ทราบหมวดหมู่",
            revenue: Number(row.revenue),
            orders: Number(row.orderCount),
        }));

        return NextResponse.json({ success: true, days, categories });
    } catch (error) {
        console.error("[ADMIN_DASHBOARD_CATEGORY_DISTRIBUTION]", error);
        return NextResponse.json({ success: false, message: "Failed to load category distribution" }, { status: 500 });
    }
}
