import { describe, it, expect, vi } from "vitest";

// purchase.ts pulls in the db module at import time; these helpers are pure and
// don't touch it, so a hollow mock is enough to load the file.
vi.mock("@/lib/db", () => ({ rawDbPool: { getConnection: vi.fn() } }));

import {
    buildCartThbPromoItems,
    buildDiscountedThbPriceMap,
    getActivePrice,
    sumAppliedDiscount,
    validateAndSummarizeCartProducts,
    type PurchaseProductRow,
} from "@/lib/features/orders/purchase";
import { toSatang } from "@/lib/money";

function product(overrides: Partial<PurchaseProductRow> & { id: string }): PurchaseProductRow {
    return {
        name: `product-${overrides.id}`,
        price: "0",
        currency: "THB",
        isSold: false,
        ...overrides,
    };
}

describe("getActivePrice", () => {
    it("prefers a real discount price", () => {
        expect(getActivePrice(product({ id: "a", price: "100.00", discountPrice: "80.00" }))).toBe(80);
    });

    it("falls back to the full price when there is no discount", () => {
        expect(getActivePrice(product({ id: "a", price: "100.00", discountPrice: null }))).toBe(100);
        expect(getActivePrice(product({ id: "a", price: "100.00" }))).toBe(100);
    });

    it("ignores a zero discount price instead of giving the product away", () => {
        expect(getActivePrice(product({ id: "a", price: "100.00", discountPrice: "0.00" }))).toBe(100);
        expect(getActivePrice(product({ id: "a", price: "100.00", discountPrice: 0 }))).toBe(100);
    });
});

describe("buildCartThbPromoItems", () => {
    it("keeps a quantity subtotal exact for a price with satang", () => {
        const items = buildCartThbPromoItems(
            [product({ id: "a", price: "0.07" })],
            [{ productId: "a", quantity: 3 }],
        );

        expect(0.07 * 3).not.toBe(0.21);
        expect(items[0].subtotal).toBe(0.21);
    });

    it("excludes non-THB lines", () => {
        const items = buildCartThbPromoItems(
            [product({ id: "a", price: "10" }), product({ id: "b", price: "20", currency: "POINT" })],
            [{ productId: "a", quantity: 1 }, { productId: "b", quantity: 1 }],
        );

        expect(items.map((item) => item.productId)).toEqual(["a"]);
    });
});

describe("validateAndSummarizeCartProducts", () => {
    const user = { id: "u1", creditBalance: "0.21", pointBalance: 0 };

    it("lets a customer whose balance exactly covers a satang cart through", () => {
        const productList = [
            product({ id: "a", price: "0.07" }),
            product({ id: "b", price: "0.07" }),
            product({ id: "c", price: "0.07" }),
        ];
        const items = productList.map((entry) => ({ productId: entry.id, quantity: 1 }));

        const summary = validateAndSummarizeCartProducts(productList, items, user);
        expect(summary.totalTHB).toBe(0.21);
    });

    it("still rejects a cart the balance cannot cover", () => {
        const productList = [product({ id: "a", price: "0.22" })];

        expect(() => validateAndSummarizeCartProducts(
            productList,
            [{ productId: "a", quantity: 1 }],
            user,
        )).toThrow(/เครดิตไม่เพียงพอ/);
    });
});

describe("buildDiscountedThbPriceMap", () => {
    const threeTens = [
        { productId: "a", subtotal: 10 },
        { productId: "b", subtotal: 10 },
        { productId: "c", subtotal: 10 },
    ];

    function chargedSatang(map: Map<string, number>, items: typeof threeTens) {
        return items.reduce((sum, item) => sum + toSatang(map.get(item.productId) ?? item.subtotal), 0);
    }

    it("gives the full discount even when a line caps at its own subtotal", () => {
        // The old last-line-takes-the-remainder split lost a satang here and
        // charged ฿0.02 for a cart the promo had reduced to ฿0.01.
        const map = buildDiscountedThbPriceMap(threeTens, 29.99);
        expect(chargedSatang(map, threeTens)).toBe(1);
        expect(sumAppliedDiscount(threeTens, map)).toBe(29.99);
    });

    it("distributes an evenly divisible discount proportionally", () => {
        const map = buildDiscountedThbPriceMap(threeTens, 3);
        expect(map.get("a")).toBe(9);
        expect(map.get("b")).toBe(9);
        expect(map.get("c")).toBe(9);
    });

    it("never discounts more than the eligible total", () => {
        const map = buildDiscountedThbPriceMap(threeTens, 500);
        expect(chargedSatang(map, threeTens)).toBe(0);
        expect(sumAppliedDiscount(threeTens, map)).toBe(30);
    });

    it("leaves ineligible lines at full price", () => {
        const map = buildDiscountedThbPriceMap(threeTens, 5, ["a"]);
        expect(map.get("a")).toBe(5);
        expect(map.get("b")).toBe(10);
        expect(map.get("c")).toBe(10);
        expect(sumAppliedDiscount(threeTens, map)).toBe(5);
    });

    it("returns untouched prices when there is no discount", () => {
        const map = buildDiscountedThbPriceMap(threeTens, 0);
        expect(chargedSatang(map, threeTens)).toBe(3000);
        expect(sumAppliedDiscount(threeTens, map)).toBe(0);
    });
});
