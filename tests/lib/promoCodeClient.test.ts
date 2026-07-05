import { describe, expect, it, vi } from "vitest";
import {
    buildAppliedPromoFromValidation,
    buildPromoValidationPayload,
    getCartPromoLineItems,
    parsePromoValidationResponse,
    validatePromoCode,
} from "@/lib/client/promoCodeClient";
import { API_ROUTES } from "@/lib/constants/apiRoutes";

function getRequestInit(fetcher: ReturnType<typeof vi.fn>) {
    return fetcher.mock.calls[0]?.[1] as RequestInit;
}

describe("lib/client/promoCodeClient", () => {
    it("builds the existing promo validation payload shape", () => {
        expect(
            buildPromoValidationPayload({
                code: "SAVE10",
                totalPrice: 500,
                productCategory: "games",
            }),
        ).toEqual({
            code: "SAVE10",
            totalPrice: 500,
            productCategory: "games",
        });
    });

    it("keeps null productCategory when promo applies to a mixed cart", () => {
        expect(
            buildPromoValidationPayload({
                code: "SAVE10",
                totalPrice: 500,
            }),
        ).toEqual({
            code: "SAVE10",
            totalPrice: 500,
            productCategory: null,
        });
    });

    it("includes per-line items in the payload when provided", () => {
        expect(
            buildPromoValidationPayload({
                code: "SAVE10",
                totalPrice: 500,
                items: [{ category: "games", subtotal: 500 }],
            }),
        ).toEqual({
            code: "SAVE10",
            totalPrice: 500,
            productCategory: null,
            items: [{ category: "games", subtotal: 500 }],
        });
    });

    it("builds promo line items from non-point cart items using the active price", () => {
        expect(
            getCartPromoLineItems([
                { currency: "POINT", category: "points", price: 50, quantity: 2 },
                { currency: "THB", category: "games", price: 100, discountPrice: 80, quantity: 2 },
                { currency: null, category: "software", price: 300 },
            ]),
        ).toEqual([
            { category: "games", subtotal: 160 },
            { category: "software", subtotal: 300 },
        ]);
    });

    it("keeps null categories and defaults quantity to 1 for promo line items", () => {
        expect(
            getCartPromoLineItems([
                { currency: "THB", category: "", price: 100, discountPrice: null, quantity: 0 },
            ]),
        ).toEqual([
            { category: "", subtotal: 100 },
        ]);
    });

    it("maps applied promo values with the existing uppercase and numeric fallback rules", () => {
        expect(
            buildAppliedPromoFromValidation({
                code: " save10 ",
                data: {
                    discountAmount: "25",
                    finalPrice: null,
                },
                fallbackFinalPrice: 475,
            }),
        ).toEqual({
            code: "SAVE10",
            discountAmount: 25,
            finalPrice: 475,
        });
    });

    it("posts validation requests to the shared promo endpoint", async () => {
        const responseBody = {
            valid: true,
            message: "ใช้โค้ดสำเร็จ",
            discountAmount: 50,
            finalPrice: 450,
        };
        const fetcher = vi.fn(async () => Response.json(responseBody));
        const payload = buildPromoValidationPayload({
            code: "SAVE10",
            totalPrice: 500,
            productCategory: "games",
        });

        const result = await validatePromoCode(payload, { fetcher });

        expect(result).toEqual(responseBody);
        expect(fetcher).toHaveBeenCalledWith(API_ROUTES.PROMO_CODE_VALIDATE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        expect(JSON.parse(String(getRequestInit(fetcher).body))).toEqual(payload);
    });

    it("parses promo validation responses without changing messages", async () => {
        const response = Response.json({
            valid: false,
            message: "โค้ดส่วนลดไม่ถูกต้อง",
        });

        await expect(parsePromoValidationResponse(response)).resolves.toEqual({
            valid: false,
            message: "โค้ดส่วนลดไม่ถูกต้อง",
        });
    });
});
