import { NextRequest, NextResponse } from "next/server";
import { and, gte, isNull, sql, type SQL } from "drizzle-orm";
import { db, orders } from "@/lib/db";
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

export async function GET(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const requested = request.nextUrl.searchParams.get("range");
    const range: Range = RANGES.includes(requested as Range) ? (requested as Range) : "30d";

    try {
        const conditions: SQL[] = [isNull(orders.deletedAt)];

        if (range !== "all") {
            const days = RANGE_DAYS[range];
            const start = new Date(getThaiDayStartUtc().getTime() - (days - 1) * 24 * 60 * 60 * 1000);
            conditions.push(gte(orders.purchasedAt, toMySQLDatetime(start)));
        }

        // Orders snapshot productName/productImage at purchase time, so grouping by
        // name keeps working after the product row is deleted. NULL names are legacy
        // rows from before the snapshot columns existed.
        const rows = await db
            .select({
                productName: sql<string | null>`${orders.productName}`,
                productImage: sql<string | null>`MAX(${orders.productImage})`,
                units: sql<string>`COUNT(*)`,
                revenue: sql<string>`COALESCE(SUM(${orders.totalPrice}), 0)`,
            })
            .from(orders)
            .where(and(...conditions))
            .groupBy(orders.productName)
            .orderBy(sql`SUM(${orders.totalPrice}) DESC`)
            .limit(10);

        const data = rows.map((row) => ({
            productName: row.productName ?? "(ไม่มีชื่อสินค้า)",
            productImage: row.productImage,
            units: Number(row.units),
            revenue: Number(row.revenue),
        }));

        return NextResponse.json({ success: true, range, data });
    } catch (error) {
        console.error("[ADMIN_DASHBOARD_BEST_SELLERS]", error);
        return NextResponse.json({ success: false, message: "Failed to load best sellers" }, { status: 500 });
    }
}
