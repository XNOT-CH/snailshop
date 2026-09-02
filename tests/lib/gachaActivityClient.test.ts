import { describe, expect, it, vi } from "vitest";
import { fetchGachaRecentActivity } from "@/lib/client/gachaActivityClient";
import { API_ROUTES } from "@/lib/constants/apiRoutes";

describe("lib/client/gachaActivityClient", () => {
    it("fetches recent gacha activity from the shared endpoint", async () => {
        const responseBody = {
            success: true,
            data: [
                {
                    id: "log-1",
                    tier: "legendary",
                    rewardName: "รางวัล",
                    rewardImageUrl: null,
                    username: "player",
                    createdAt: "2026-05-20T10:00:00.000Z",
                },
            ],
        };
        const fetcher = vi.fn(async () => Response.json(responseBody));

        const result = await fetchGachaRecentActivity({ fetcher });

        expect(result).toEqual(responseBody);
        expect(fetcher).toHaveBeenCalledWith(API_ROUTES.GACHA_RECENT);
    });

    it("keeps the recent activity non-ok behavior as a thrown fetch error", async () => {
        const fetcher = vi.fn(async () => new Response(null, { status: 500 }));

        await expect(fetchGachaRecentActivity({ fetcher })).rejects.toThrow("Failed to fetch recent logs");
    });
});
