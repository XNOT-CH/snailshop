import { NextResponse } from "next/server";

import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { getGachaRewardTypeLabel } from "@/lib/gachaCost";
import { isRewardEligibleForRoll } from "@/lib/gachaRewardEligibility";
import { fetchActiveGridRewards } from "@/lib/gachaRewardQueries";

/** GET /api/gacha/grid/rewards?machineId=xxx  — fetch up to 9 active rewards for a grid machine */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const machineId = searchParams.get("machineId");
    const currencySettings = await getCurrencySettings().catch(() => null);

    const rewards = await fetchActiveGridRewards(machineId);
    const mapped = rewards.filter(isRewardEligibleForRoll).map((r) => {
        let rewardName = "รางวัล";
        if (r.rewardType === "PRODUCT") {
            rewardName = r.product?.name ?? "รางวัล";
        } else if (r.rewardName) {
            rewardName = r.rewardName;
        } else if (r.rewardType === "CREDIT") {
            rewardName = "เครดิต";
        } else if (r.rewardType === "POINT" || r.rewardType === "TICKET") {
            rewardName = getGachaRewardTypeLabel(r.rewardType, currencySettings);
        }

        return {
            id: r.id,
            tier: r.tier,
            rewardType: r.rewardType,
            rewardName,
            rewardAmount: r.rewardAmount ? Number(r.rewardAmount) : null,
            imageUrl: r.rewardType === "PRODUCT" ? (r.product?.imageUrl ?? null) : (r.rewardImageUrl ?? null),
        };
    });

    return NextResponse.json({ success: true, data: mapped });
}
