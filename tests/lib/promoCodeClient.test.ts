import { describe, expect, it, vi } from "vitest";
import {
    buildAppliedPromoFromValidation,
    buildPromoValidationPayload,
    getCartPromoProductCategory,
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

    it("selects a single cart category only from non-point items", () => {
        expect(
            getCartPromoProductCategory([
                { currency: "POINT", category: "points" },
                { currency: "THB", category: "games" },
                { currency: null, category: "games" },
            ]),
        ).toBe("games");
    });

    it("returns null for mixed or missing cart categories", () => {
        expect(
            getCartPromoProductCategory([
                { currency: "THB", category: "games" },
                { currency: "THB", category: "software" },
            ]),
        ).toBeNull();

        expect(
            getCartPromoProductCategory([
                { currency: "POINT", category: "points" },
                { currency: "THB", category: "" },
            ]),
        ).toBeNull();
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
