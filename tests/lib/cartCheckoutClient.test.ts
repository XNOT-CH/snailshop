import { describe, expect, it, vi } from "vitest";
import {
    buildCartCheckoutPayload,
    buildCartCheckoutSuccessLabel,
    checkoutCart,
    parseCartCheckoutResponse,
} from "@/lib/client/cartCheckoutClient";
import { API_ROUTES } from "@/lib/constants/apiRoutes";

function getRequestInit(fetcher: ReturnType<typeof vi.fn>) {
    return fetcher.mock.calls[0]?.[1] as RequestInit;
}

describe("lib/client/cartCheckoutClient", () => {
    it("builds the existing cart checkout payload shape", () => {
        const payload = buildCartCheckoutPayload({
            items: [
                { id: "product-1", quantity: 2 },
                { id: "product-2", quantity: 0 },
            ],
            promoCode: "SAVE10",
            pin: "123456",
        });

        expect(payload).toEqual({
            items: [
                { productId: "product-1", quantity: 2 },
                { productId: "product-2", quantity: 1 },
            ],
            promoCode: "SAVE10",
            pin: "123456",
        });
    });

    it("omits empty optional fields to preserve JSON request contract", () => {
        const payload = buildCartCheckoutPayload({
            items: [{ id: "product-1" }],
            promoCode: null,
            pin: "",
        });

        expect(JSON.stringify(payload)).toBe(
            JSON.stringify({
                items: [{ productId: "product-1", quantity: 1 }],
            }),
        );
    });

    it("posts checkout requests to the shared cart checkout endpoint", async () => {
        const responseBody = { success: true, purchasedCount: 1 };
        const fetcher = vi.fn(async () => Response.json(responseBody));
        const payload = buildCartCheckoutPayload({ items: [{ id: "product-1" }] });

        const result = await checkoutCart(payload, { fetcher });

        expect(result).toEqual(responseBody);
        expect(fetcher).toHaveBeenCalledWith(API_ROUTES.CART_CHECKOUT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        expect(JSON.parse(String(getRequestInit(fetcher).body))).toEqual(payload);
    });

    it("parses checkout responses without changing message or sold product fields", async () => {
        const response = Response.json({
            success: false,
            message: "สินค้าหมด",
            soldProductIds: ["product-1"],
        });

        await expect(parseCartCheckoutResponse(response)).resolves.toEqual({
            success: false,
            message: "สินค้าหมด",
            soldProductIds: ["product-1"],
        });
    });

    it("keeps the existing success label rules", () => {
        expect(
            buildCartCheckoutSuccessLabel({
                purchasedCount: 1,
                orders: [{ productName: "Game Item" }],
            }, "฿100"),
        ).toBe("Game Item");

        expect(
            buildCartCheckoutSuccessLabel({
                purchasedCount: 3,
                orders: [{ productName: "Game Item" }],
            }, "฿300"),
        ).toBe("3 รายการ รวม ฿300");
    });
});
