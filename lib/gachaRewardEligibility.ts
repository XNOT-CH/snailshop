export type RewardEligibilityProduct = {
    isSold?: boolean;
    orderId?: string | null;
} | null | undefined;

export type RewardEligibilityInput = {
    rewardType: string;
    rewardName?: string | null;
    rewardAmount?: string | number | null;
    product?: RewardEligibilityProduct;
};

export function isRewardEligibleForRoll(reward: RewardEligibilityInput) {
    if (reward.rewardType === "PRODUCT") {
        return Boolean(reward.product && !reward.product.isSold && !reward.product.orderId);
    }

    return Boolean(reward.rewardName && reward.rewardAmount && Number(reward.rewardAmount) > 0);
}
