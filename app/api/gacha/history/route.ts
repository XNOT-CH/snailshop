import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
    const authCheck = await isAuthenticated();
    if (!authCheck.success || !authCheck.userId) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const logs = await db.gachaRollLog.findMany({
            where: { userId: authCheck.userId },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
                id: true,
                tier: true,
                rewardName: true,
                rewardImageUrl: true,
                costType: true,
                costAmount: true,
                createdAt: true,
                product: {
                    select: { name: true, imageUrl: true },
                },
            },
        });

        // Stats: today count and total count
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        const todayCount = await db.gachaRollLog.count({
            where: { userId: authCheck.userId, createdAt: { gte: startOfDay } },
        });

        const totalCount = await db.gachaRollLog.count({
            where: { userId: authCheck.userId },
        });

        // Find most common tier overall
        const tierCounts = await db.gachaRollLog.groupBy({
            by: ["tier"],
            where: { userId: authCheck.userId },
            _count: { tier: true },
            orderBy: { _count: { tier: "desc" } },
            take: 1,
        });
        const topTier = tierCounts[0]?.tier ?? null;

        // Normalise logs (fallback to product name/image if rewardName is null)
        const normalised = logs.map((log: any) => ({
            id: log.id,
            tier: log.tier,
            rewardName: log.rewardName ?? log.product?.name ?? "รางวัล",
            rewardImageUrl: log.rewardImageUrl ?? log.product?.imageUrl ?? null,
            costType: log.costType,
            costAmount: Number(log.costAmount),
            createdAt: log.createdAt,
        }));

        return NextResponse.json({
            success: true,
            data: {
                logs: normalised,
                stats: { todayCount, totalCount, topTier },
            },
        });
    } catch (error) {
        console.error("Gacha history error:", error);
        return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
