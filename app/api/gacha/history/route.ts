import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { db, gachaRollLogs } from "@/lib/db";
import { eq, and, gte, lte, desc, count, sql } from "drizzle-orm";

function toMySQLDatetime(d: Date) { return d.toISOString().slice(0, 19).replace("T", " "); }

export async function GET() {
    const authCheck = await isAuthenticated();
    if (!authCheck.success || !authCheck.userId) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const logs = await db.query.gachaRollLogs.findMany({
            where: eq(gachaRollLogs.userId, authCheck.userId),
            orderBy: (t, { desc }) => desc(t.createdAt),
            limit: 20,
            columns: { id: true, tier: true, rewardName: true, rewardImageUrl: true, costType: true, costAmount: true, createdAt: true },
            with: { product: { columns: { name: true, imageUrl: true } } },
        });

        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);

        const [{ count: todayCount }] = await db.select({ count: count() }).from(gachaRollLogs)
            .where(and(eq(gachaRollLogs.userId, authCheck.userId), gte(gachaRollLogs.createdAt, toMySQLDatetime(startOfDay))));

        const [{ count: totalCount }] = await db.select({ count: count() }).from(gachaRollLogs)
            .where(eq(gachaRollLogs.userId, authCheck.userId));

        // groupBy replacement: get tier counts using raw SQL aggregate
        const tierCountsRaw = await db.select({ tier: gachaRollLogs.tier, cnt: count() })
            .from(gachaRollLogs)
            .where(eq(gachaRollLogs.userId, authCheck.userId))
            .groupBy(gachaRollLogs.tier)
            .orderBy(sql`count(*) desc`)
            .limit(1);
        const topTier = tierCountsRaw[0]?.tier ?? null;

        const normalised = logs.map((log: any) => ({
            id: log.id, tier: log.tier,
            rewardName: log.rewardName ?? log.product?.name ?? "รางวัล",
            rewardImageUrl: log.rewardImageUrl ?? log.product?.imageUrl ?? null,
            costType: log.costType, costAmount: Number(log.costAmount), createdAt: log.createdAt,
        }));

        return NextResponse.json({
            success: true,
            data: { logs: normalised, stats: { todayCount: Number(todayCount), totalCount: Number(totalCount), topTier } },
        });
    } catch (error) {
        console.error("Gacha history error:", error);
        return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
