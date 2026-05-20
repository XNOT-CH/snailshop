import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CartProvider, useCart, type CartItem } from "@/components/providers/CartContext";
import { showError, showSuccess } from "@/lib/swal";

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: vi.fn(),
        refresh: vi.fn(),
    }),
}));

vi.mock("@/lib/require-auth-before-purchase", () => ({
    requireAuthBeforePurchase: vi.fn(async () => ({ allowed: true })),
}));

vi.mock("@/lib/swal", () => ({
    showError: vi.fn(),
    showInfo: vi.fn(),
    showSuccess: vi.fn(),
}));

const product: CartItem = {
    id: "product-1",
    name: "Test Product",
    price: 100,
    currency: "THB",
    imageUrl: "/product.webp",
    category: "games",
    quantity: 1,
};

function CartHarness({ item }: Readonly<{ item: CartItem }>) {
    const { addToCart, items } = useCart();

    return (
        <>
            <button type="button" onClick={() => void addToCart(item)}>
                add
            </button>
            <output data-testid="items">{JSON.stringify(items)}</output>
        </>
    );
}

function renderCart(item: CartItem) {
    render(
        <CartProvider initialAuthenticated>
            <CartHarness item={item} />
        </CartProvider>,
    );
}

describe("CartProvider addToCart", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    it("rejects requested quantity when it exceeds available stock", async () => {
        globalThis.fetch = vi.fn(async () => Response.json({
            found: true,
            isSold: false,
            stockCount: 2,
        })) as unknown as typeof fetch;

        renderCart({ ...product, quantity: 3 });
        fireEvent.click(screen.getByRole("button", { name: "add" }));

        await waitFor(() => {
            expect(showError).toHaveBeenCalledWith("สต็อกไม่เพียงพอ (เหลือ 2 รายการ)");
        });
        expect(showSuccess).not.toHaveBeenCalled();
        expect(JSON.parse(screen.getByTestId("items").textContent ?? "[]")).toEqual([]);
    });

    it("stores the requested quantity and server stock count when stock is sufficient", async () => {
        globalThis.fetch = vi.fn(async () => Response.json({
            found: true,
            isSold: false,
            stockCount: 5,
        })) as unknown as typeof fetch;

        renderCart({ ...product, quantity: 2 });
        fireEvent.click(screen.getByRole("button", { name: "add" }));

        await waitFor(() => {
            expect(showSuccess).toHaveBeenCalledWith("เพิ่มลงตะกร้าแล้ว: Test Product");
        });
        const items = JSON.parse(screen.getByTestId("items").textContent ?? "[]") as CartItem[];
        expect(items).toHaveLength(1);
        expect(items[0]).toMatchObject({
            id: "product-1",
            quantity: 2,
            stock: 5,
        });
    });
});
