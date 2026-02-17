import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("userId")?.value;

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "กรุณาเข้าสู่ระบบก่อน" },
                { status: 401 }
            );
        }

        const now = new Date();

        // ── Today ────────────────────────────────────
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const todayCount = await db.user.count({
            where: { createdAt: { gte: todayStart } },
        });

        // ── This week (last 7 days) ──────────────────
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);

        const weekCount = await db.user.count({
            where: { createdAt: { gte: weekStart } },
        });

        // ── This month ──────────────────────────────
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const monthCount = await db.user.count({
            where: { createdAt: { gte: monthStart } },
        });

        // ── Total ────────────────────────────────────
        const totalCount = await db.user.count();

        // ── Daily trend (configurable via ?days= param, default 7) ──
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

        const usersInRange = await db.user.findMany({
            where: { createdAt: { gte: trendStart } },
            select: { createdAt: true },
        });

        for (const u of usersInRange) {
            const key = new Date(u.createdAt).toISOString().slice(0, 10);
            const existing = dailyMap.get(key);
            if (existing !== undefined) {
                dailyMap.set(key, existing + 1);
            }
        }

        const dailyTrend = Array.from(dailyMap.entries()).map(([dateStr, count]) => {
            const d = new Date(dateStr);
            const label = d.toLocaleDateString("th-TH", {
                day: "2-digit",
                month: "short",
            });
            return { date: label, rawDate: dateStr, count };
        });

        // ── Recent members (latest 20) ──────────────
        const recentMembers = await db.user.findMany({
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
                id: true,
                username: true,
                name: true,
                email: true,
                image: true,
                phone: true,
                creditBalance: true,
                createdAt: true,
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                todayCount,
                weekCount,
                monthCount,
                totalCount,
                dailyTrend,
                recentMembers: recentMembers.map((m) => ({
                    ...m,
                    creditBalance: Number(m.creditBalance),
                    createdAt: m.createdAt.toISOString(),
                })),
            },
        });
    } catch (error) {
        console.error("Members summary error:", error);
        return NextResponse.json(
            { success: false, message: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
