import { NextRequest, NextResponse } from "next/server";
import { and, count, countDistinct, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db, gachaRollLogs, users } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getThaiDayStartUtc, toMySQLDatetime } from "@/lib/utils/date";
import { bucketKey } from "@/lib/features/dashboard/kpiPeriods";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const ALLOWED_DAYS = [7, 30, 90];

// Rolls are bucketed by Thai local day, like the rest of the dashboard.
const rollDayKey = sql<string>`DATE_FORMAT(CONVERT_TZ(${gachaRollLogs.createdAt}, '+00:00', '+07:00'), '%Y-%m-%d')`;
const isPaidRoll = sql`${gachaRollLogs.costAmount} > 0`;

/** Player-count buckets for "how many rolls does a typical player make". */
const DISTRIBUTION_BUCKETS = [
    { key: "1", label: "1 ตา", min: 1, max: 1 },
    { key: "2-5", label: "2–5 ตา", min: 2, max: 5 },
    { key: "6-20", label: "6–20 ตา", min: 6, max: 20 },
    { key: "21+", label: "21+ ตา", min: 21, max: Infinity },
];

function countRolls(start: Date, end: Date | null) {
    const conditions = [gte(gachaRollLogs.createdAt, toMySQLDatetime(start))];
    if (end) conditions.push(lt(gachaRollLogs.createdAt, toMySQLDatetime(end)));
    return db.select({ rolls: count() }).from(gachaRollLogs).where(and(...conditions));
}

export async function GET(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const requested = Number.parseInt(request.nextUrl.searchParams.get("days") ?? "30", 10);
    const days = ALLOWED_DAYS.includes(requested) ? requested : 30;

    try {
        const now = new Date();
        const todayStart = getThaiDayStartUtc(now);
        const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
        const weekStart = new Date(todayStart.getTime() - 6 * DAY_MS);
        const previousWeekStart = new Date(todayStart.getTime() - 13 * DAY_MS);
        const rangeStart = new Date(todayStart.getTime() - (days - 1) * DAY_MS);
        const rangeCondition = gte(gachaRollLogs.createdAt, toMySQLDatetime(rangeStart));

        const [
            [{ rolls: rollsToday }],
            [{ rolls: rollsYesterday }],
            [{ rolls: rolls7d }],
            [{ rolls: rollsPrev7d }],
            [rangeTotals],
            dailyRows,
            topPlayers,
            perPlayerRolls,
        ] = await Promise.all([
            countRolls(todayStart, null),
            countRolls(yesterdayStart, todayStart),
            countRolls(weekStart, null),
            countRolls(previousWeekStart, weekStart),
            db
                .select({
                    rolls: count(),
                    paidRolls: sql<string>`COALESCE(SUM(CASE WHEN ${isPaidRoll} THEN 1 ELSE 0 END), 0)`,
                    revenue: sql<string>`COALESCE(SUM(${gachaRollLogs.costAmount}), 0)`,
                    players: countDistinct(gachaRollLogs.userId),
                })
                .from(gachaRollLogs)
                .where(rangeCondition),
            db
                .select({
                    day: rollDayKey,
                    paid: sql<string>`COALESCE(SUM(CASE WHEN ${isPaidRoll} THEN 1 ELSE 0 END), 0)`,
                    free: sql<string>`COALESCE(SUM(CASE WHEN ${isPaidRoll} THEN 0 ELSE 1 END), 0)`,
                })
                .from(gachaRollLogs)
                .where(rangeCondition)
                .groupBy(rollDayKey),
            db
                .select({
                    id: users.id,
                    username: users.username,
                    name: users.name,
                    image: users.image,
                    rolls: count(),
                    spent: sql<string>`COALESCE(SUM(${gachaRollLogs.costAmount}), 0)`,
                })
                .from(gachaRollLogs)
                .innerJoin(users, eq(gachaRollLogs.userId, users.id))
                .where(rangeCondition)
                .groupBy(users.id, users.username, users.name, users.image)
                .orderBy(desc(count()))
                .limit(10),
            db
                .select({ userId: gachaRollLogs.userId, rolls: count() })
                .from(gachaRollLogs)
                .where(rangeCondition)
                .groupBy(gachaRollLogs.userId),
        ]);

        const dailyByKey = new Map(dailyRows.map((row) => [row.day, { paid: Number(row.paid), free: Number(row.free) }]));
        const daily = Array.from({ length: days }, (_, i) => {
            const key = bucketKey(rangeStart.getTime() + i * DAY_MS, false);
            const entry = dailyByKey.get(key) ?? { paid: 0, free: 0 };
            return { date: key, paid: entry.paid, free: entry.free };
        });

        const distribution = DISTRIBUTION_BUCKETS.map((bucket) => ({
            key: bucket.key,
            label: bucket.label,
            players: perPlayerRolls.filter((row) => Number(row.rolls) >= bucket.min && Number(row.rolls) <= bucket.max).length,
        }));

        const players = Number(rangeTotals.players);
        const rangeRolls = Number(rangeTotals.rolls);

        return NextResponse.json({
            success: true,
            days,
            kpis: {
                rollsToday: Number(rollsToday),
                rollsYesterday: Number(rollsYesterday),
                rolls7d: Number(rolls7d),
                rollsPrev7d: Number(rollsPrev7d),
                rangeRolls,
                paidRolls: Number(rangeTotals.paidRolls),
                freeRolls: rangeRolls - Number(rangeTotals.paidRolls),
                revenue: Number(rangeTotals.revenue),
                players,
                avgRollsPerPlayer: players > 0 ? rangeRolls / players : 0,
            },
            daily,
            topPlayers: topPlayers.map((row) => ({
                ...row,
                rolls: Number(row.rolls),
                spent: Number(row.spent),
            })),
            distribution,
        });
    } catch (error) {
        console.error("[ADMIN_DASHBOARD_GACHA_SUMMARY]", error);
        return NextResponse.json({ success: false, message: "Failed to load gacha summary" }, { status: 500 });
    }
}
