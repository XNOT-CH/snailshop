import { describe, expect, it } from "vitest";
import {
    buildGachaChosenRewardId,
    getGachaRollRewardDetails,
    getGachaRewardTier,
    mapEligibleGachaRewardsToProductLite,
    mapGachaRewardToProductLite,
} from "@/lib/features/gacha/rewards";

describe("lib/features/gacha/rewards", () => {
    it("maps product rewards to the existing GachaProductLite shape", () => {
        expect(mapGachaRewardToProductLite({
            id: "reward-1",
            rewardType: "PRODUCT",
            tier: "rare",
            product: {
                id: "product-1",
                name: "Rare Sword",
                price: "199.50",
                imageUrl: "/uploads/reward.png",
                isSold: false,
                orderId: null,
            },
        })).toEqual({
            id: "product-1",
            name: "Rare Sword",
            price: 199.5,
            imageUrl: "/uploads/reward.png",
            tier: "rare",
        });
    });

    it("maps currency rewards with reward id, amount, image, and custom point label", () => {
        expect(mapGachaRewardToProductLite({
            id: "reward-2",
            rewardType: "POINT",
            rewardName: null,
            rewardAmount: "50",
            rewardImageUrl: "/uploads/point.png",
            tier: null,
        }, { name: "เหรียญ" })).toEqual({
            id: "reward:reward-2",
            name: "เหรียญ",
            price: 50,
            imageUrl: "/uploads/point.png",
            tier: "common",
        });
    });

    it("keeps explicit reward names ahead of generated labels", () => {
        expect(mapGachaRewardToProductLite({
            id: "reward-3",
            rewardType: "CREDIT",
            rewardName: "เครดิตโบนัส",
            rewardAmount: 25,
            rewardImageUrl: null,
            tier: "epic",
        }).name).toBe("เครดิตโบนัส");
    });

    it("filters in only rewards that are eligible for roll", () => {
        const mapped = mapEligibleGachaRewardsToProductLite([
            {
                id: "product-reward",
                rewardType: "PRODUCT",
                tier: "legendary",
                product: {
                    id: "product-2",
                    name: "Legendary Card",
                    price: 500,
                    imageUrl: null,
                    isSold: false,
                    orderId: null,
                },
            },
            {
                id: "sold-product",
                rewardType: "PRODUCT",
                tier: "rare",
                product: {
                    id: "product-3",
                    name: "Sold Card",
                    price: 100,
                    imageUrl: null,
                    isSold: true,
                    orderId: null,
                },
            },
            {
                id: "missing-amount",
                rewardType: "TICKET",
                rewardName: "ตั๋ว",
                rewardAmount: 0,
                rewardImageUrl: null,
                tier: "common",
            },
            {
                id: "ticket-reward",
                rewardType: "TICKET",
                rewardName: "ตั๋วพิเศษ",
                rewardAmount: 3,
                rewardImageUrl: null,
                tier: "common",
            },
        ]);

        expect(mapped).toHaveLength(2);
        expect(mapped.map((reward) => reward.id)).toEqual(["product-2", "reward:ticket-reward"]);
    });

    it("preserves the old tier fallback behavior", () => {
        expect(getGachaRewardTier(null)).toBe("common");
        expect(getGachaRewardTier(undefined)).toBe("common");
        expect(getGachaRewardTier("rare")).toBe("rare");
    });

    it("builds chosen reward ids using the existing product and reward fallbacks", () => {
        expect(buildGachaChosenRewardId({
            id: "reward-4",
            rewardType: "PRODUCT",
            productId: "product-4",
            product: { id: "product-fallback" },
        })).toBe("product-4");

        expect(buildGachaChosenRewardId({
            id: "reward-5",
            rewardType: "PRODUCT",
            productId: null,
            product: { id: "product-5" },
        })).toBe("product-5");

        expect(buildGachaChosenRewardId({
            id: "reward-6",
            rewardType: "PRODUCT",
            productId: null,
            product: null,
        })).toBe("reward:reward-6");

        expect(buildGachaChosenRewardId({
            id: "reward-7",
            rewardType: "CREDIT",
            productId: "ignored-product",
            product: { id: "ignored-product-2" },
        })).toBe("reward:reward-7");
    });

    it("gets roll reward details for product rewards with existing fallbacks", () => {
        expect(getGachaRollRewardDetails({
            rewardType: "PRODUCT",
            product: { name: "Prize Product", imageUrl: "" },
            rewardAmount: 10,
        })).toEqual({
            rewardName: "Prize Product",
            imageUrl: null,
            rewardAmount: 10,
        });

        expect(getGachaRollRewardDetails({
            rewardType: "PRODUCT",
            product: null,
            rewardAmount: null,
        })).toEqual({
            rewardName: "รางวัล",
            imageUrl: null,
            rewardAmount: null,
        });
    });

    it("gets roll reward details for currency rewards with existing name and amount rules", () => {
        expect(getGachaRollRewardDetails({
            rewardType: "POINT",
            rewardName: "",
            rewardAmount: 0,
            rewardImageUrl: "",
        }, { name: "เหรียญ" })).toEqual({
            rewardName: "เหรียญ",
            imageUrl: null,
            rewardAmount: null,
        });

        expect(getGachaRollRewardDetails({
            rewardType: "TICKET",
            rewardName: "ตั๋วโบนัส",
            rewardAmount: "3",
            rewardImageUrl: "/ticket.png",
        })).toEqual({
            rewardName: "ตั๋วโบนัส",
            imageUrl: "/ticket.png",
            rewardAmount: 3,
        });
    });
});
