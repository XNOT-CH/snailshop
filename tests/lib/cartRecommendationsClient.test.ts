import { describe, expect, it, vi } from "vitest";
import {
    fetchCartRecommendationProducts,
    getFilteredCartRecommendations,
    normalizeCartRecommendationProduct,
    type CartRecommendationProduct,
} from "@/lib/client/cartRecommendationsClient";
import { API_ROUTES } from "@/lib/constants/apiRoutes";

const baseProduct = {
    id: "product-1",
    name: "Alpha",
    price: 100,
    discountPrice: null,
    currency: "THB",
    imageUrl: "/alpha.png",
    category: "games",
    isSold: false,
} satisfies CartRecommendationProduct;

describe("lib/client/cartRecommendationsClient", () => {
    it("normalizes product prices without changing null discount fields", () => {
        expect(
            normalizeCartRecommendationProduct({
                ...baseProduct,
                price: "250",
                discountPrice: null,
            }),
        ).toEqual({
            ...baseProduct,
            price: 250,
            discountPrice: null,
        });

        expect(
            normalizeCartRecommendationProduct({
                ...baseProduct,
                price: 250,
                discountPrice: "199",
            }).discountPrice,
        ).toBe(199);
    });

    it("fetches cart recommendations from the shared products list endpoint", async () => {
        const responseBody = [
            {
                ...baseProduct,
                price: "300",
                discountPrice: "250",
            },
        ];
        const fetcher = vi.fn(async () => Response.json(responseBody));

        const result = await fetchCartRecommendationProducts({ fetcher });

        expect(result).toEqual([
            {
                ...baseProduct,
                price: 300,
                discountPrice: 250,
            },
        ]);
        expect(fetcher).toHaveBeenCalledWith(API_ROUTES.PRODUCTS_LIST, { cache: "no-store" });
    });

    it("returns null when products list response is not usable", async () => {
        await expect(
            fetchCartRecommendationProducts({
                fetcher: vi.fn(async () => new Response(null, { status: 500 })),
            }),
        ).resolves.toBeNull();

        await expect(
            fetchCartRecommendationProducts({
                fetcher: vi.fn(async () => Response.json({ products: [] })),
            }),
        ).resolves.toBeNull();
    });

    it("filters sold and cart products before sorting recommendations", () => {
        const products: CartRecommendationProduct[] = [
            { ...baseProduct, id: "in-cart", name: "In cart" },
            { ...baseProduct, id: "sold", name: "Sold", isSold: true },
            { ...baseProduct, id: "available", name: "Available" },
        ];

        expect(
            getFilteredCartRecommendations(products, [{ id: "in-cart", category: "games" }]),
        ).toEqual([{ ...baseProduct, id: "available", name: "Available" }]);
    });

    it("keeps the existing recommendation ordering rules", () => {
        const products: CartRecommendationProduct[] = [
            {
                ...baseProduct,
                id: "other-big-discount",
                name: "Other big discount",
                category: "software",
                price: 500,
                discountPrice: 100,
            },
            {
                ...baseProduct,
                id: "preferred-small-discount",
                name: "Preferred small discount",
                price: 120,
                discountPrice: 100,
            },
            {
                ...baseProduct,
                id: "preferred-featured",
                name: "Preferred featured",
                price: 200,
                discountPrice: 150,
                isFeatured: true,
            },
            {
                ...baseProduct,
                id: "preferred-alpha",
                name: "Alpha preferred",
                price: 200,
                discountPrice: 150,
            },
            {
                ...baseProduct,
                id: "preferred-zeta",
                name: "Zeta preferred",
                price: 200,
                discountPrice: 150,
            },
        ];

        expect(
            getFilteredCartRecommendations(products, [{ id: "cart-item", category: "games" }])
                .map((product) => product.id),
        ).toEqual([
            "preferred-featured",
            "preferred-alpha",
            "preferred-zeta",
            "preferred-small-discount",
        ]);
    });
});
