import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** GET /api/gacha/drop-rates?machineId=xxx
 *  Returns per-tier drop rates calculated from the probability weights
 *  of the active, fully-configured rewards for the specified machine.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const machineId = searchParams.get("machineId");

    try {
        const rewards = await db.gachaReward.findMany({
            where: {
                isActive: true,
                ...(machineId ? { gachaMachineId: machineId } : { gachaMachineId: null }),
                // Only rewards that are "complete" (have image/name)
                OR: [
                    { rewardType: "PRODUCT", productId: { not: null } },
                    {
                        rewardType: { in: ["CREDIT", "POINT"] },
                        rewardName: { not: null },
                        rewardAmount: { not: null },
                    },
                ],
            },
            select: {
                tier: true,
                probability: true,
            },
        });

        if (rewards.length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }

        // Sum weights per tier
        const tierWeights: Record<string, number> = {};
        let totalWeight = 0;
        for (const r of rewards) {
            const tier = r.tier ?? "common";
            const w = Number(r.probability ?? 1);
            tierWeights[tier] = (tierWeights[tier] ?? 0) + w;
            totalWeight += w;
        }

        // Convert weights to percentages
        const TIER_ORDER = ["legendary", "epic", "rare", "common"];
        const TIER_META: Record<string, { label: string; labelTh: string; dotCls: string; barCls: string; textCls: string }> = {
            legendary: { label: "Legendary", labelTh: "ระดับตำนาน", dotCls: "bg-red-500", barCls: "bg-red-500", textCls: "text-red-500" },
            epic: { label: "Epic", labelTh: "หายากมาก", dotCls: "bg-violet-500", barCls: "bg-violet-500", textCls: "text-violet-500" },
            rare: { label: "Rare", labelTh: "หายาก", dotCls: "bg-emerald-400", barCls: "bg-emerald-400", textCls: "text-emerald-500" },
            common: { label: "Common", labelTh: "ทั่วไป", dotCls: "bg-amber-400", barCls: "bg-amber-400", textCls: "text-amber-500" },
        };

        const data = TIER_ORDER
            .filter((tier) => tierWeights[tier] !== undefined)
            .map((tier) => ({
                tier,
                ...TIER_META[tier],
                rate: totalWeight > 0 ? Math.round((tierWeights[tier] / totalWeight) * 1000) / 10 : 0,
            }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, message: msg }, { status: 500 });
    }
}
