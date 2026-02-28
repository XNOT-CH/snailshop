import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

/** GET /api/gacha/grid/rewards?machineId=xxx  — fetch up to 9 active rewards for a grid machine */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const machineId = searchParams.get("machineId");

    const rewards = await db.gachaReward.findMany({
        where: {
            isActive: true,
            ...(machineId ? { gachaMachineId: machineId } : { gachaMachineId: null }),
            // Only fully-configured rewards
            OR: [
                // PRODUCT rewards with a linked product
                { rewardType: "PRODUCT", productId: { not: null } },
                // CREDIT/POINT rewards with name + amount set
                {
                    rewardType: { in: ["CREDIT", "POINT"] },
                    rewardName: { not: null },
                    rewardAmount: { not: null },
                },
            ],
        },
        take: 9,
        orderBy: { createdAt: "asc" },
        include: { product: { select: { id: true, name: true, price: true, imageUrl: true } } },
    });


    const mapped = rewards.map((r) => ({
        id: r.id,
        tier: r.tier,
        rewardType: r.rewardType,
        rewardName: r.rewardType === "PRODUCT"
            ? (r.product?.name ?? "รางวัล")
            : (r.rewardName ?? (r.rewardType === "CREDIT" ? "เครดิต" : "พอยต์")),
        rewardAmount: r.rewardAmount ? Number(r.rewardAmount) : null,
        imageUrl: r.rewardType === "PRODUCT" ? (r.product?.imageUrl ?? null) : (r.rewardImageUrl ?? null),
    }));

    return NextResponse.json({ success: true, data: mapped });
}
