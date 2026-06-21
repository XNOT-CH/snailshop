import { describe, expect, it, vi } from "vitest";
import { fetchWithCsrf } from "@/lib/csrf-client";
import {
    buildGachaGridRewardsUrl,
    buildGachaGridRollPayload,
    fetchGachaGridRewards,
    getPaddedGridRewards,
    requestGachaGridRoll,
    type GridReward,
} from "@/lib/client/gachaGridClient";
import { API_ROUTES } from "@/lib/constants/apiRoutes";

vi.mock("@/lib/csrf-client", () => ({
    fetchWithCsrf: vi.fn(async () => Response.json({ success: true })),
}));

function getRequestInit(fetcher: ReturnType<typeof vi.fn>) {
    return fetcher.mock.calls[0]?.[1] as RequestInit;
}

function reward(id: string): GridReward {
    return {
        id,
        tier: "common",
        rewardType: "CREDIT",
        rewardName: "เครดิต",
        rewardAmount: 10,
        imageUrl: null,
    };
}

describe("lib/client/gachaGridClient", () => {
    it("builds the existing grid rewards endpoint without machine id", () => {
        expect(buildGachaGridRewardsUrl()).toBe(API_ROUTES.GACHA_GRID_REWARDS);
    });

    it("builds the existing grid rewards endpoint with machine id", () => {
        expect(buildGachaGridRewardsUrl("machine-1")).toBe(
            `${API_ROUTES.GACHA_GRID_REWARDS}?machineId=machine-1`,
        );
    });

    it("pads rewards to nine slots after filtering empty values", () => {
        const padded = getPaddedGridRewards([reward("r1"), null, undefined, reward("r2")]);

        expect(padded).toHaveLength(9);
        expect(padded.slice(0, 3)).toEqual([reward("r1"), reward("r2"), null]);
    });

    it("limits rewards to nine slots", () => {
        const padded = getPaddedGridRewards(Array.from({ length: 12 }, (_, index) => reward(`r${index}`)));

        expect(padded).toHaveLength(9);
        expect(padded.at(-1)?.id).toBe("r8");
    });

    it("fetches grid rewards from the shared endpoint", async () => {
        const responseBody = {
            success: true,
            data: [reward("r1")],
        };
        const fetcher = vi.fn(async () => Response.json(responseBody));

        const result = await fetchGachaGridRewards("machine-1", { fetcher });

        expect(result).toEqual(responseBody);
        expect(fetcher).toHaveBeenCalledWith(`${API_ROUTES.GACHA_GRID_REWARDS}?machineId=machine-1`);
    });

    it("builds the existing grid roll payload shape", () => {
        expect(buildGachaGridRollPayload("machine-1")).toEqual({ machineId: "machine-1" });
        expect(buildGachaGridRollPayload()).toEqual({ machineId: null });
    });

    it("posts grid roll requests to the shared endpoint", async () => {
        const responseBody = {
            success: true,
            data: {
                wonIndex: 0,
                rewardId: "r1",
                rewardName: "เครดิต",
                rewardType: "CREDIT",
                rewardAmount: 10,
                imageUrl: null,
                tier: "common",
            },
        };
        const fetcher = vi.fn(async () => Response.json(responseBody));
        const payload = buildGachaGridRollPayload("machine-1");

        const result = await requestGachaGridRoll(payload, { fetcher });

        expect(result).toEqual(responseBody);
        expect(fetcher).toHaveBeenCalledWith(API_ROUTES.GACHA_GRID_ROLL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        expect(JSON.parse(String(getRequestInit(fetcher).body))).toEqual(payload);
    });

    it("uses the CSRF-aware fetcher by default for grid roll requests", async () => {
        const payload = buildGachaGridRollPayload("machine-1");

        await requestGachaGridRoll(payload);

        expect(fetchWithCsrf).toHaveBeenCalledWith(API_ROUTES.GACHA_GRID_ROLL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
    });
});
