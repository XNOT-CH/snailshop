import { describe, expect, it, vi } from "vitest";
import {
    fetchUserBalances,
    normalizeUserBalances,
} from "@/lib/client/userBalanceClient";
import { API_ROUTES } from "@/lib/constants/apiRoutes";

describe("lib/client/userBalanceClient", () => {
    it("normalizes missing balance fields to zero", () => {
        expect(normalizeUserBalances({ creditBalance: "150.50" as never })).toEqual({
            creditBalance: 150.5,
            pointBalance: 0,
            ticketBalance: 0,
        });
    });

    it("fetches user balances from the shared endpoint with no-store cache", async () => {
        const responseBody = {
            success: true,
            creditBalance: "1000.25",
            pointBalance: "50",
            ticketBalance: 2,
        };
        const fetcher = vi.fn(async () => Response.json(responseBody));

        const result = await fetchUserBalances({ fetcher });

        expect(result).toEqual({
            creditBalance: 1000.25,
            pointBalance: 50,
            ticketBalance: 2,
        });
        expect(fetcher).toHaveBeenCalledWith(API_ROUTES.USER_BALANCE, { cache: "no-store" });
    });

    it("returns null when response is not ok", async () => {
        await expect(
            fetchUserBalances({
                fetcher: vi.fn(async () => Response.json({ success: true }, { status: 401 })),
            }),
        ).resolves.toBeNull();
    });

    it("returns null when response success is false", async () => {
        await expect(
            fetchUserBalances({
                fetcher: vi.fn(async () => Response.json({ success: false })),
            }),
        ).resolves.toBeNull();
    });
});
