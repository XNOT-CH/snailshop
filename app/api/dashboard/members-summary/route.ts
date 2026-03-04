import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, users } from "@/lib/db";
import { gte } from "drizzle-orm";
import { count } from "drizzle-orm";

export const dynamic = "force-dynamic";

function toMySQLStr(d: Date) {
    return d.toISOString().slice(0, 19).replace("T", " ");
}

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("userId")?.value;

        if (!userId) {
            return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
        }

        const now = new Date();

        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [[todayResult], [weekResult], [monthResult], [totalResult]] = await Promise.all([
            db.select({ count: count() }).from(users).where(gte(users.createdAt, toMySQLStr(todayStart))),
            db.select({ count: count() }).from(users).where(gte(users.createdAt, toMySQLStr(weekStart))),
            db.select({ count: count() }).from(users).where(gte(users.createdAt, toMySQLStr(monthStart))),
            db.select({ count: count() }).from(users),
        ]);

        const todayCount = Number(todayResult.count);
        const weekCount = Number(weekResult.count);
        const monthCount = Number(monthResult.count);
        const totalCount = Number(totalResult.count);

        const daysParam = request.nextUrl.searchParams.get("days");
        const trendDays = Math.min(Math.max(parseInt(daysParam || "7", 10) || 7, 1), 365);

        const trendStart = new Date(now);
        trendStart.setDate(now.getDate() - (trendDays - 1));
        trendStart.setHours(0, 0, 0, 0);

        const dailyMap = new Map<string, number>();
        for (let i = 0; i < trendDays; i++) {
            const d = new Date(trendStart);
            d.setDate(trendStart.getDate() + i);
            dailyMap.set(d.toISOString().slice(0, 10), 0);
        }

        const usersInRange = await db.select({ createdAt: users.createdAt }).from(users).where(gte(users.createdAt, toMySQLStr(trendStart)));

        for (const u of usersInRange) {
            const key = new Date(u.createdAt).toISOString().slice(0, 10);
            const existing = dailyMap.get(key);
            if (existing !== undefined) dailyMap.set(key, existing + 1);
        }

        const dailyTrend = Array.from(dailyMap.entries()).map(([dateStr, c]) => {
            const d = new Date(dateStr);
            const label = d.toLocaleDateString("th-TH", { day: "2-digit", month: "short" });
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
                todayCount, weekCount, monthCount, totalCount, dailyTrend,
                recentMembers: recentMembers.map((m) => ({
                    ...m,
                    creditBalance: Number(m.creditBalance),
                    createdAt: typeof m.createdAt === "string" ? m.createdAt : new Date(m.createdAt as any).toISOString(),
                })),
            },
        });
    } catch (error) {
        console.error("Members summary error:", error);
        return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
