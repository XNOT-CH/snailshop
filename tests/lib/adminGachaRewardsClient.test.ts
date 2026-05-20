import { describe, expect, it, vi } from "vitest";
import {
    createAdminGachaReward,
    deleteAdminGachaReward,
    fetchAdminGachaRewards,
    parseAdminGachaRewardsResponse,
    updateAdminGachaReward,
    uploadAdminGachaRewardImage,
} from "@/lib/client/adminGachaRewardsClient";
import { API_ROUTES } from "@/lib/constants/apiRoutes";

function getRequestInit(fetcher: ReturnType<typeof vi.fn>) {
    return fetcher.mock.calls[0]?.[1] as RequestInit;
}

function getSentFormData(fetcher: ReturnType<typeof vi.fn>) {
    return getRequestInit(fetcher).body as FormData;
}

describe("lib/client/adminGachaRewardsClient", () => {
    it("fetches admin gacha rewards from the shared endpoint", async () => {
        const responseBody = { success: true, data: [{ id: "reward-1" }] };
        const fetcher = vi.fn(async () => Response.json(responseBody));

        const result = await fetchAdminGachaRewards({ fetcher });

        expect(result.data).toEqual(responseBody);
        expect(fetcher).toHaveBeenCalledWith(API_ROUTES.ADMIN_GACHA_REWARDS, {});
    });

    it("keeps the machineId query contract when fetching machine rewards", async () => {
        const fetcher = vi.fn(async () => Response.json({ success: true, data: [] }));

        await fetchAdminGachaRewards({ machineId: "machine 1", fetcher });

        expect(fetcher).toHaveBeenCalledWith(
            `${API_ROUTES.ADMIN_GACHA_REWARDS}?machineId=machine%201`,
            {},
        );
    });

    it("creates rewards with JSON request bodies", async () => {
        const payload = { rewardType: "POINT", rewardAmount: 100 };
        const fetcher = vi.fn(async () => Response.json({ success: true }));

        await createAdminGachaReward(payload, { fetcher });

        expect(fetcher).toHaveBeenCalledWith(API_ROUTES.ADMIN_GACHA_REWARDS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
    });

    it("updates and deletes reward detail endpoints", async () => {
        const updateFetcher = vi.fn(async () => Response.json({ success: true }));
        const deleteFetcher = vi.fn(async () => Response.json({ success: true }));

        await updateAdminGachaReward("reward-1", { tier: "rare" }, { fetcher: updateFetcher });
        await deleteAdminGachaReward("reward-1", { fetcher: deleteFetcher });

        expect(updateFetcher).toHaveBeenCalledWith(API_ROUTES.adminGachaReward("reward-1"), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tier: "rare" }),
        });
        expect(deleteFetcher).toHaveBeenCalledWith(API_ROUTES.adminGachaReward("reward-1"), {
            method: "DELETE",
        });
    });

    it("uploads reward images with the existing file field", async () => {
        const file = new File(["image"], "reward.png", { type: "image/png" });
        const fetcher = vi.fn(async () =>
            Response.json({
                success: true,
                url: "/uploads/gacha-rewards/reward.webp",
                filename: "reward.webp",
            }),
        );

        const result = await uploadAdminGachaRewardImage(file, { fetcher });

        expect(result.data.url).toBe("/uploads/gacha-rewards/reward.webp");
        expect(result.data.filename).toBe("reward.webp");
        expect(fetcher).toHaveBeenCalledWith(API_ROUTES.ADMIN_GACHA_REWARDS_UPLOAD_IMAGE, {
            method: "POST",
            body: expect.any(FormData),
        });
        expect(getSentFormData(fetcher).get("file")).toBe(file);
    });

    it("parses admin gacha rewards responses without changing message fields", async () => {
        const response = Response.json({
            success: false,
            message: "เพิ่มรางวัลไม่สำเร็จ",
        });

        await expect(parseAdminGachaRewardsResponse(response)).resolves.toEqual({
            success: false,
            message: "เพิ่มรางวัลไม่สำเร็จ",
        });
    });
});
