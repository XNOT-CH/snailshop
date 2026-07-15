import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq, gte, isNull, lt, sql, type SQL } from "drizzle-orm";
import { db, orders, products } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getThaiDayStartUtc, toMySQLDatetime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const ALLOWED_DAYS = [7, 30, 90];
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PRODUCTS_PER_CATEGORY = 30;

/** Start of the given Thai calendar day (yyyy-MM-dd) as a UTC instant. */
function thaiDayStartUtc(key: string): Date {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day) - 7 * 60 * 60 * 1000);
}

interface ProductRow {
    name: string;
    revenue: number;
    orders: number;
}

export async function GET(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const startParam = params.get("startDate");
    const endParam = params.get("endDate");

    // Custom Thai-day range (inclusive) wins over the preset day count.
    let rangeStart: Date;
    let rangeEnd: Date | null = null;
    if (startParam && endParam && DATE_KEY.test(startParam) && DATE_KEY.test(endParam) && startParam <= endParam) {
        rangeStart = thaiDayStartUtc(startParam);
        rangeEnd = new Date(thaiDayStartUtc(endParam).getTime() + DAY_MS);
    } else {
        const requested = Number.parseInt(params.get("days") ?? "30", 10);
        const days = ALLOWED_DAYS.includes(requested) ? requested : 30;
        rangeStart = new Date(getThaiDayStartUtc().getTime() - (days - 1) * DAY_MS);
    }

    try {
        const conditions: SQL[] = [isNull(orders.deletedAt), gte(orders.purchasedAt, toMySQLDatetime(rangeStart))];
        if (rangeEnd) {
            conditions.push(lt(orders.purchasedAt, toMySQLDatetime(rangeEnd)));
        }

        // Orders snapshot productId/productName without an FK, so a deleted product
        // leaves the join empty — those sales are grouped under "ไม่ทราบหมวดหมู่"
        // but keep their snapshotted product name.
        const rows = await db
            .select({
                category: products.category,
                productId: orders.productId,
                productName: orders.productName,
                revenue: sql<string>`COALESCE(SUM(${orders.totalPrice}), 0)`,
                orderCount: count(),
            })
            .from(orders)
            .leftJoin(products, eq(orders.productId, products.id))
            .where(and(...conditions))
            .groupBy(products.category, orders.productId, orders.productName)
            .orderBy(desc(sql`SUM(${orders.totalPrice})`));

        const byCategory = new Map<string, { name: string; revenue: number; orders: number; products: ProductRow[] }>();
        for (const row of rows) {
            const categoryName = row.category ?? "ไม่ทราบหมวดหมู่";
            let entry = byCategory.get(categoryName);
            if (!entry) {
                entry = { name: categoryName, revenue: 0, orders: 0, products: [] };
                byCategory.set(categoryName, entry);
            }
            entry.revenue += Number(row.revenue);
            entry.orders += Number(row.orderCount);
            entry.products.push({
                name: row.productName ?? "ไม่ทราบชื่อสินค้า",
                revenue: Number(row.revenue),
                orders: Number(row.orderCount),
            });
        }

        const categories = [...byCategory.values()]
            .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders)
            .map((category) => {
                // Rows arrive revenue-desc, so products are already sorted.
                if (category.products.length <= MAX_PRODUCTS_PER_CATEGORY) return category;
                const kept = category.products.slice(0, MAX_PRODUCTS_PER_CATEGORY);
                const rest = category.products.slice(MAX_PRODUCTS_PER_CATEGORY);
                kept.push({
                    name: `สินค้าอื่นๆ (${rest.length.toLocaleString("th-TH")} รายการ)`,
                    revenue: rest.reduce((sum, p) => sum + p.revenue, 0),
                    orders: rest.reduce((sum, p) => sum + p.orders, 0),
                });
                return { ...category, products: kept };
            });

        return NextResponse.json({ success: true, categories });
    } catch (error) {
        console.error("[ADMIN_DASHBOARD_CATEGORY_DISTRIBUTION]", error);
        return NextResponse.json({ success: false, message: "Failed to load category distribution" }, { status: 500 });
    }
}
