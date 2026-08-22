import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const dbMock = vi.hoisted(() => ({
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
    db: {
        select: dbMock.select,
    },
    products: {
        id: "id",
        name: "name",
        price: "price",
        discountPrice: "discountPrice",
        currency: "currency",
        imageUrl: "imageUrl",
        category: "category",
        isSold: "isSold",
        stockCount: "stockCount",
        secretData: "secretData",
        stockSeparator: "stockSeparator",
    },
}));

vi.mock("drizzle-orm", () => ({
    inArray: vi.fn((_column, values) => ({ values })),
    and: vi.fn((...args) => ({ args })),
    isNull: vi.fn((value) => ({ isNull: value })),
}));

vi.mock("@/lib/features/products/shared", () => ({
    getProductStockCount: vi.fn((secretData: string | null | undefined) => {
        if (!secretData) {
            return 0;
        }

        return secretData.split("\n").filter(Boolean).length;
    }),
}));

const mkReq = (body: object) =>
    new NextRequest("http://localhost/api/cart/refresh", {
        method: "POST",
        body: JSON.stringify(body),
    });

function product(overrides: Partial<{
    id: string;
    name: string;
    price: string;
    discountPrice: string | null;
    currency: string | null;
    imageUrl: string | null;
    category: string;
    isSold: boolean;
    stockCount: number | null;
    secretData: string | null;
    stockSeparator: string | null;
}> = {}) {
    return {
        id: "product-1",
        name: "Product 1",
        price: "100",
        discountPrice: null,
        currency: "THB",
        imageUrl: "/product.webp",
        category: "games",
        isSold: false,
        stockCount: 3,
        secretData: "code1\ncode2\ncode3",
        stockSeparator: "newline",
        ...overrides,
    };
}

describe("API: /api/cart/refresh (POST)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        dbMock.where.mockResolvedValue([]);
        dbMock.from.mockReturnValue({ where: dbMock.where });
        dbMock.select.mockReturnValue({ from: dbMock.from });
    });

    it("returns refreshed product data with quantity capped by current stock", async () => {
        dbMock.where.mockResolvedValue([
            product({ id: "product-1", price: "150.50", discountPrice: "120", stockCount: 2 }),
        ]);
        const { POST } = await import("@/app/api/cart/refresh/route");

        const res = await POST(mkReq({
            items: [{ productId: "product-1", quantity: 3 }],
        }));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toMatchObject({
            success: true,
            quantityAdjustedProductIds: ["product-1"],
            missingProductIds: [],
            soldProductIds: [],
        });
        expect(body.items[0]).toMatchObject({
            id: "product-1",
            price: 150.5,
            discountPrice: 120,
            quantity: 2,
            stock: 2,
            requestedQuantity: 3,
            availableQuantity: 2,
        });
    });

    it("reports sold and missing products without returning purchasable items", async () => {
        dbMock.where.mockResolvedValue([
            product({ id: "sold-product", isSold: true, stockCount: 1 }),
        ]);
        const { POST } = await import("@/app/api/cart/refresh/route");

        const res = await POST(mkReq({
            items: [
                { productId: "sold-product", quantity: 1 },
                { productId: "missing-product", quantity: 1 },
            ],
        }));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.items).toEqual([]);
        expect(body.soldProductIds).toEqual(["sold-product"]);
        expect(body.missingProductIds).toEqual(["missing-product"]);
    });

    it("returns 400 when item quantity is invalid", async () => {
        const { POST } = await import("@/app/api/cart/refresh/route");

        const res = await POST(mkReq({
            items: [{ productId: "product-1", quantity: 0 }],
        }));

        expect(res.status).toBe(400);
        expect((await res.json()).message).toContain("จำนวน");
    });

    it("returns 400 when requested quantity exceeds the checkout limit", async () => {
        const { POST } = await import("@/app/api/cart/refresh/route");

        const res = await POST(mkReq({
            items: [{ productId: "product-1", quantity: 51 }],
        }));

        expect(res.status).toBe(400);
        expect((await res.json()).message).toContain("50");
    });
});
