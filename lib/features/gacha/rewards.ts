import type { PublicCurrencySettings } from "@/lib/currencySettings";
import { getGachaRewardTypeLabel } from "@/lib/gachaCost";
import type { GachaProductLite, GachaTier } from "@/lib/gachaGrid";
import { isRewardEligibleForRoll } from "@/lib/gachaRewardEligibility";

export type GachaRewardProductMappingInput = {
    id: string;
    name: string;
    price?: string | number | null;
    imageUrl?: string | null;
    isSold?: boolean;
    orderId?: string | null;
};

export type GachaRewardMappingInput = {
    id: string;
    rewardType: string;
    rewardName?: string | null;
    rewardAmount?: string | number | null;
    rewardImageUrl?: string | null;
    tier?: string | null;
    product?: GachaRewardProductMappingInput | null;
};

export type GachaRewardIdentityInput = {
    id: string;
    rewardType: string;
    productId?: string | null;
    product?: {
        id: string;
    } | null;
};

export type GachaRollRewardDetailsInput = {
    rewardType: string;
    product?: {
        name?: string;
        imageUrl?: string | null;
    } | null;
    rewardName?: string | null;
    rewardAmount?: string | number | null;
    rewardImageUrl?: string | null;
};

export function getGachaRewardTier(tier: string | null | undefined): GachaTier {
    return (tier as GachaTier) ?? "common";
}

export function buildGachaChosenRewardId(reward: GachaRewardIdentityInput) {
    if (reward.rewardType === "PRODUCT") {
        return reward.productId ?? reward.product?.id ?? `reward:${reward.id}`;
    }

    return `reward:${reward.id}`;
}

export function getGachaRollRewardDetails(
    reward: GachaRollRewardDetailsInput,
    currencySettings?: Partial<PublicCurrencySettings> | null,
) {
    let rewardName: string;
    if (reward.rewardType === "PRODUCT") {
        rewardName = reward.product?.name ?? "รางวัล";
    } else if (reward.rewardName) {
        rewardName = reward.rewardName;
    } else {
        rewardName = getGachaRewardTypeLabel(reward.rewardType, currencySettings);
    }

    const imageUrl = reward.rewardType === "PRODUCT" ? reward.product?.imageUrl : reward.rewardImageUrl;
    const rewardAmountStr = reward.rewardAmount ? String(reward.rewardAmount) : null;
    const rewardAmount = rewardAmountStr ? Number(rewardAmountStr) : null;

    return { rewardName, imageUrl: imageUrl || null, rewardAmount };
}

export function mapGachaRewardToProductLite(
    reward: GachaRewardMappingInput,
    currencySettings?: Partial<PublicCurrencySettings> | null,
): GachaProductLite {
    if (reward.rewardType === "PRODUCT" && reward.product) {
        return {
            id: reward.product.id,
            name: reward.product.name,
            price: Number(reward.product.price),
            imageUrl: reward.product.imageUrl ?? null,
            tier: getGachaRewardTier(reward.tier),
        };
    }

    return {
        id: `reward:${reward.id}`,
        name: reward.rewardName ?? getGachaRewardTypeLabel(reward.rewardType, currencySettings),
        price: Number(reward.rewardAmount ?? 0),
        imageUrl: reward.rewardImageUrl ?? null,
        tier: getGachaRewardTier(reward.tier),
    };
}

export function mapEligibleGachaRewardsToProductLite<T extends GachaRewardMappingInput>(
    rewards: readonly T[],
    currencySettings?: Partial<PublicCurrencySettings> | null,
): GachaProductLite[] {
    return rewards
        .filter((reward) => isRewardEligibleForRoll(reward))
        .map((reward) => mapGachaRewardToProductLite(reward, currencySettings));
}
