import { describe, expect, it, vi } from "vitest";
import {
    buildCartRefreshPayload,
    parseCartRefreshResponse,
    refreshCartItems,
} from "@/lib/client/cartRefreshClient";
import { API_ROUTES } from "@/lib/constants/apiRoutes";

function getRequestInit(fetcher: ReturnType<typeof vi.fn>) {
    return fetcher.mock.calls[0]?.[1] as RequestInit;
}

describe("lib/client/cartRefreshClient", () => {
    it("builds the cart refresh payload from local cart items", () => {
        const payload = buildCartRefreshPayload({
            items: [
                { id: "product-1", quantity: 2 },
                { id: "product-2", quantity: 0 },
            ],
        });

        expect(payload).toEqual({
            items: [
                { productId: "product-1", quantity: 2 },
                { productId: "product-2", quantity: 1 },
            ],
        });
    });

    it("posts refresh requests to the shared cart refresh endpoint", async () => {
        const responseBody = {
            success: true,
            items: [{ id: "product-1", quantity: 1 }],
        };
        const fetcher = vi.fn(async () => Response.json(responseBody));
        const payload = buildCartRefreshPayload({ items: [{ id: "product-1" }] });

        const result = await refreshCartItems(payload, { fetcher });

        expect(result).toEqual(responseBody);
        expect(fetcher).toHaveBeenCalledWith(API_ROUTES.CART_REFRESH, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify(payload),
        });
        expect(JSON.parse(String(getRequestInit(fetcher).body))).toEqual(payload);
    });

    it("parses refresh responses without changing stock metadata", async () => {
        const response = Response.json({
            success: true,
            items: [],
            missingProductIds: ["missing"],
            soldProductIds: ["sold"],
            quantityAdjustedProductIds: ["limited"],
        });

        await expect(parseCartRefreshResponse(response)).resolves.toEqual({
            success: true,
            items: [],
            missingProductIds: ["missing"],
            soldProductIds: ["sold"],
            quantityAdjustedProductIds: ["limited"],
        });
    });
});
