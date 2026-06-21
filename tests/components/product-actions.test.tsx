import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductActions } from "@/components/ProductActions";

const cartMocks = vi.hoisted(() => ({
    addToCart: vi.fn(async () => true),
    inCart: false,
    openCart: vi.fn(),
}));

vi.mock("@/components/providers/CartContext", () => ({
    useCart: () => ({
        addToCart: cartMocks.addToCart,
        isInCart: () => cartMocks.inCart,
        isLoading: false,
        openCart: cartMocks.openCart,
    }),
}));

vi.mock("@/hooks/useMaintenanceStatus", () => ({
    useMaintenanceStatus: () => ({ purchase: undefined }),
}));

vi.mock("@/hooks/usePurchaseProduct", () => ({
    usePurchaseProduct: () => ({
        isPurchasing: () => false,
        purchaseProduct: vi.fn(),
    }),
}));

const product = {
    id: "product-1",
    name: "Test Product",
    price: 100,
    currency: "THB",
    imageUrl: "/product.webp",
    category: "games",
};

function renderProductActions() {
    render(<ProductActions product={product} />);
}

describe("ProductActions", () => {
    beforeEach(() => {
        cartMocks.addToCart.mockClear();
        cartMocks.inCart = false;
        cartMocks.openCart.mockClear();
    });

    it("shows buy and add-to-cart controls when the product is not in the cart", () => {
        renderProductActions();

        expect(screen.getByText("จำนวนสินค้า")).toBeInTheDocument();
        expect(screen.getByText("ส่วนลด")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /ซื้อทันที/ })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "เพิ่มลงตะกร้า" })).toBeInTheDocument();
    });

    it("shows a clear cart state and hides duplicate purchase controls when already in cart", () => {
        cartMocks.inCart = true;

        renderProductActions();

        expect(screen.getByText("สินค้านี้อยู่ในตะกร้าแล้ว")).toBeInTheDocument();
        expect(screen.getByText("ไปที่ตะกร้าเพื่อตรวจสอบจำนวนสินค้า ใช้ส่วนลด และชำระเงิน")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "ไปที่ตะกร้า" })).toBeInTheDocument();
        expect(screen.queryByText("จำนวนสินค้า")).not.toBeInTheDocument();
        expect(screen.queryByText("ส่วนลด")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /ซื้อทันที/ })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "เพิ่มลงตะกร้า" })).not.toBeInTheDocument();
    });
});
