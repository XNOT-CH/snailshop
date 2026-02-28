import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const logs = await db.gachaRollLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
                id: true,
                tier: true,
                rewardName: true,
                rewardImageUrl: true,
                createdAt: true,
                user: {
                    select: { username: true },
                },
                product: {
                    select: { name: true, imageUrl: true },
                },
            },
        });

        const normalised = logs.map((log: any) => ({
            id: log.id,
            tier: log.tier,
            rewardName: log.rewardName ?? log.product?.name ?? "รางวัล",
            rewardImageUrl: log.rewardImageUrl ?? log.product?.imageUrl ?? null,
            username: log.user?.username ?? "ผู้ใช้ทั่วไป",
            createdAt: log.createdAt,
        }));

        return NextResponse.json({
            success: true,
            data: normalised,
        });
    } catch (error) {
        console.error("Gacha recent winners error:", error);
        return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
