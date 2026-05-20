import { describe, expect, it, vi } from "vitest";
import {
    fetchGachaHistoryActivity,
    fetchGachaRecentActivity,
} from "@/lib/client/gachaActivityClient";
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

    it("fetches gacha history from the shared endpoint", async () => {
        const responseBody = {
            success: true,
            data: {
                logs: [
                    {
                        id: "log-1",
                        tier: "common",
                        rewardName: "รางวัล",
                        rewardImageUrl: null,
                        costType: "CREDIT",
                        costAmount: 10,
                        createdAt: "2026-05-20T10:00:00.000Z",
                    },
                ],
                stats: {
                    todayCount: 1,
                    totalCount: 3,
                    topTier: "common",
                },
            },
        };
        const fetcher = vi.fn(async () => Response.json(responseBody));

        const result = await fetchGachaHistoryActivity({ fetcher });

        expect(result).toEqual(responseBody);
        expect(fetcher).toHaveBeenCalledWith(API_ROUTES.GACHA_HISTORY);
    });

    it("keeps the history non-ok behavior as a silent null response", async () => {
        const fetcher = vi.fn(async () => new Response(null, { status: 500 }));

        await expect(fetchGachaHistoryActivity({ fetcher })).resolves.toBeNull();
    });
});
