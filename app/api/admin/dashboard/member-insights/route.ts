import { NextRequest, NextResponse } from "next/server";
import { and, count, countDistinct, desc, eq, gte, isNull, lt, or, sql } from "drizzle-orm";
import { db, orders, users } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getThaiDayStartUtc, mysqlDateTimeToIso, toMySQLDatetime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

type SpenderRange = "30d" | "all";

const hasCredit = sql`${users.creditBalance} > 0`;

export async function GET(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const spenderRange: SpenderRange = request.nextUrl.searchParams.get("spenders") === "all" ? "all" : "30d";

    try {
        const now = new Date();
        const todayStart = toMySQLDatetime(getThaiDayStartUtc(now));
        const weekStart = toMySQLDatetime(new Date(getThaiDayStartUtc(now).getTime() - 6 * DAY_MS));
        const cutoff30d = toMySQLDatetime(new Date(now.getTime() - 30 * DAY_MS));

        const liveOrders = isNull(orders.deletedAt);
        const spenderConditions = spenderRange === "30d" ? and(liveOrders, gte(orders.purchasedAt, cutoff30d)) : liveOrders;
        const atRiskCondition = and(hasCredit, or(isNull(users.lastLoginAt), lt(users.lastLoginAt, cutoff30d)));

        const [
            [{ activeToday }],
            [{ active7d }],
            [{ totalMembers }],
            [{ buyers }],
            [{ creditHolders, creditOutstanding }],
            topSpenders,
            atRiskUsers,
            [{ atRiskCount, atRiskCredit }],
            [{ newRevenue, returningRevenue }],
        ] = await Promise.all([
            db.select({ activeToday: count() }).from(users).where(gte(users.lastLoginAt, todayStart)),
            db.select({ active7d: count() }).from(users).where(gte(users.lastLoginAt, weekStart)),
            db.select({ totalMembers: count() }).from(users),
            db.select({ buyers: countDistinct(orders.userId) }).from(orders).where(liveOrders),
            db
                .select({
                    creditHolders: count(),
                    creditOutstanding: sql<string>`COALESCE(SUM(${users.creditBalance}), 0)`,
                })
                .from(users)
                .where(hasCredit),
            db
                .select({
                    id: users.id,
                    username: users.username,
                    name: users.name,
                    image: users.image,
                    creditBalance: users.creditBalance,
                    totalSpent: sql<string>`COALESCE(SUM(${orders.totalPrice}), 0)`,
                    orderCount: count(),
                })
                .from(orders)
                .innerJoin(users, eq(orders.userId, users.id))
                .where(spenderConditions)
                .groupBy(users.id, users.username, users.name, users.image, users.creditBalance)
                .orderBy(desc(sql`SUM(${orders.totalPrice})`))
                .limit(10),
            db
                .select({
                    id: users.id,
                    username: users.username,
                    name: users.name,
                    image: users.image,
                    creditBalance: users.creditBalance,
                    lastLoginAt: users.lastLoginAt,
                })
                .from(users)
                .where(atRiskCondition)
                .orderBy(desc(users.creditBalance))
                .limit(10),
            db
                .select({
                    atRiskCount: count(),
                    atRiskCredit: sql<string>`COALESCE(SUM(${users.creditBalance}), 0)`,
                })
                .from(users)
                .where(atRiskCondition),
            // Revenue in the last 30 days split by whether the buyer signed up
            // within those 30 days (new) or earlier (returning).
            db
                .select({
                    newRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${users.createdAt} >= ${cutoff30d} THEN ${orders.totalPrice} ELSE 0 END), 0)`,
                    returningRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${users.createdAt} < ${cutoff30d} THEN ${orders.totalPrice} ELSE 0 END), 0)`,
                })
                .from(orders)
                .innerJoin(users, eq(orders.userId, users.id))
                .where(and(liveOrders, gte(orders.purchasedAt, cutoff30d))),
        ]);

        return NextResponse.json({
            success: true,
            spenderRange,
            activeToday: Number(activeToday),
            active7d: Number(active7d),
            totalMembers: Number(totalMembers),
            buyers: Number(buyers),
            creditHolders: Number(creditHolders),
            creditOutstanding: Number(creditOutstanding),
            topSpenders: topSpenders.map((row) => ({
                ...row,
                creditBalance: Number(row.creditBalance),
                totalSpent: Number(row.totalSpent),
                orderCount: Number(row.orderCount),
            })),
            atRisk: {
                count: Number(atRiskCount),
                credit: Number(atRiskCredit),
                users: atRiskUsers.map((row) => ({
                    ...row,
                    creditBalance: Number(row.creditBalance),
                    lastLoginAt: row.lastLoginAt ? mysqlDateTimeToIso(row.lastLoginAt) : null,
                })),
            },
            newVsReturning: {
                newRevenue: Number(newRevenue),
                returningRevenue: Number(returningRevenue),
            },
        });
    } catch (error) {
        console.error("[ADMIN_DASHBOARD_MEMBER_INSIGHTS]", error);
        return NextResponse.json({ success: false, message: "Failed to load member insights" }, { status: 500 });
    }
}
