import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, users } from "@/lib/db";
import { and, gte, lt, count, type SQL } from "drizzle-orm";
import { formatDateInTimeZone, getThaiDayStartUtc, mysqlDateTimeToIso, toMySQLDatetime } from "@/lib/utils/date";
import { bucketKey } from "@/lib/features/dashboard/kpiPeriods";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const THAI_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

/** UTC instant of Thai midnight on the 1st of the month containing `thaiDate` (offset in months). */
function thaiMonthStartUtc(now: Date, monthOffset = 0): Date {
    const [year, month] = formatDateInTimeZone(now).split("-").map(Number);
    return new Date(Date.UTC(year, month - 1 + monthOffset, 1) - THAI_UTC_OFFSET_MS);
}

function countBetween(start: Date, end: Date | null) {
    const conditions: SQL[] = [gte(users.createdAt, toMySQLDatetime(start))];
    if (end) conditions.push(lt(users.createdAt, toMySQLDatetime(end)));
    return db.select({ count: count() }).from(users).where(and(...conditions));
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        if ((session?.user as { role?: string })?.role !== "ADMIN") {
            return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
        }

        // All boundaries are Thai calendar days, matching the rest of the
        // admin dashboard (timestamps are stored in UTC).
        const now = new Date();
        const todayStart = getThaiDayStartUtc(now);
        const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
        const weekStart = new Date(todayStart.getTime() - 6 * DAY_MS);
        const previousWeekStart = new Date(todayStart.getTime() - 13 * DAY_MS);
        const monthStart = thaiMonthStartUtc(now);
        const previousMonthStart = thaiMonthStartUtc(now, -1);
        // Month-to-date compares against the same elapsed slice of last month,
        // capped so a long elapsed window never bleeds into this month.
        const previousMonthEnd = new Date(
            Math.min(previousMonthStart.getTime() + (now.getTime() - monthStart.getTime()), monthStart.getTime()),
        );

        const [
            [todayResult],
            [yesterdayResult],
            [weekResult],
            [previousWeekResult],
            [monthResult],
            [previousMonthResult],
            [totalResult],
        ] = await Promise.all([
            countBetween(todayStart, null),
            countBetween(yesterdayStart, todayStart),
            countBetween(weekStart, null),
            countBetween(previousWeekStart, weekStart),
            countBetween(monthStart, null),
            countBetween(previousMonthStart, previousMonthEnd),
            db.select({ count: count() }).from(users),
        ]);

        const daysParam = request.nextUrl.searchParams.get("days");
        const trendDays = Math.min(Math.max(Number.parseInt(daysParam || "7", 10) || 7, 1), 365);
        const trendStart = new Date(todayStart.getTime() - (trendDays - 1) * DAY_MS);

        const dailyMap = new Map<string, number>();
        for (let i = 0; i < trendDays; i++) {
            dailyMap.set(bucketKey(trendStart.getTime() + i * DAY_MS, false), 0);
        }

        const usersInRange = await db
            .select({ createdAt: users.createdAt })
            .from(users)
            .where(gte(users.createdAt, toMySQLDatetime(trendStart)));

        for (const u of usersInRange) {
            const iso = mysqlDateTimeToIso(u.createdAt);
            if (!iso) continue;
            const key = bucketKey(new Date(iso).getTime(), false);
            const existing = dailyMap.get(key);
            if (existing !== undefined) dailyMap.set(key, existing + 1);
        }

        const dailyTrend = Array.from(dailyMap.entries()).map(([dateStr, c]) => {
            const label = new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("th-TH", {
                day: "2-digit",
                month: "short",
                timeZone: "UTC",
            });
            return { date: label, rawDate: dateStr, count: c };
        });

        const recentMembers = await db.query.users.findMany({
            orderBy: (t, { desc }) => desc(t.createdAt),
            limit: 20,
            columns: { id: true, username: true, name: true, email: true, image: true, phone: true, creditBalance: true, createdAt: true },
        });

        return NextResponse.json({
            success: true,
            data: {
                todayCount: Number(todayResult.count),
                weekCount: Number(weekResult.count),
                monthCount: Number(monthResult.count),
                totalCount: Number(totalResult.count),
                previous: {
                    todayCount: Number(yesterdayResult.count),
                    weekCount: Number(previousWeekResult.count),
                    monthCount: Number(previousMonthResult.count),
                },
                dailyTrend,
                recentMembers: recentMembers.map((m) => ({
                    ...m,
                    creditBalance: Number(m.creditBalance),
                    createdAt: mysqlDateTimeToIso(m.createdAt) ?? m.createdAt,
                })),
            },
        });
    } catch (error) {
        console.error("Members summary error:", error);
        return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
