import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CartSheet } from "@/components/cart/CartSheet";
import type { CartItem } from "@/components/providers/CartContext";
import { refreshCartItems } from "@/lib/client/cartRefreshClient";
import { showPurchaseConfirm, showWarning } from "@/lib/swal";
import { requirePinForAction } from "@/lib/require-pin-for-action";

const staleItem: CartItem = {
    id: "product-1",
    name: "Cart Product",
    price: 100,
    discountPrice: null,
    currency: "THB",
    imageUrl: "/placeholder.jpg",
    category: "games",
    quantity: 1,
    stock: 3,
};

const replaceCartItems = vi.fn();
const openCart = vi.fn();
const closeCart = vi.fn();
const removeFromCart = vi.fn();
const updateQuantity = vi.fn();
const clearCart = vi.fn();

vi.mock("next/image", () => ({
    default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
        const { alt = "", ...rest } = props;
        return React.createElement("img", { ...rest, alt });
    },
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: vi.fn(),
        refresh: vi.fn(),
    }),
}));

vi.mock("@/components/providers/CartContext", () => ({
    useCart: () => ({
        items: [staleItem],
        addToCart: vi.fn(),
        removeFromCart,
        replaceCartItems,
        updateQuantity,
        clearCart,
        isInCart: vi.fn(() => true),
        isCartOpen: true,
        openCart,
        closeCart,
        itemCount: 1,
        subtotal: 100,
        total: 100,
        totalsByCurrency: { THB: 100, POINT: 0 },
        isLoading: false,
    }),
}));

vi.mock("@/components/ui/sheet", () => ({
    Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SheetContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    SheetTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/button", () => ({
    Button: ({
        children,
        ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
        <button {...props}>{children}</button>
    ),
}));

vi.mock("@/components/ui/collapsible", () => ({
    Collapsible: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/input", () => ({
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
    ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/useMaintenanceStatus", () => ({
    useMaintenanceStatus: () => ({ purchase: null }),
}));

vi.mock("@/hooks/useCurrencySettings", () => ({
    useCurrencySettings: () => null,
}));

vi.mock("@/lib/require-auth-before-purchase", () => ({
    requireAuthBeforePurchase: vi.fn(async () => ({ allowed: true })),
}));

vi.mock("@/lib/require-pin-for-action", () => ({
    requirePinForAction: vi.fn(async () => ({ allowed: true, pin: "123456" })),
}));

vi.mock("@/lib/swal", () => ({
    showPurchaseConfirm: vi.fn(async () => true),
    showPurchaseSuccessModal: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
}));

vi.mock("@/lib/client/cartRefreshClient", () => ({
    buildCartRefreshPayload: vi.fn(({ items }: { items: CartItem[] }) => ({
        items: items.map((item) => ({ productId: item.id, quantity: item.quantity || 1 })),
    })),
    refreshCartItems: vi.fn(),
}));

vi.mock("@/lib/client/cartCheckoutClient", () => ({
    buildCartCheckoutPayload: vi.fn(),
    buildCartCheckoutSuccessLabel: vi.fn(),
    checkoutCart: vi.fn(),
}));

vi.mock("@/lib/client/promoCodeClient", () => ({
    buildAppliedPromoFromValidation: vi.fn(),
    buildPromoValidationPayload: vi.fn(),
    getCartPromoProductCategory: vi.fn(),
    validatePromoCode: vi.fn(),
}));

vi.mock("@/lib/client/cartRecommendationsClient", () => ({
    fetchCartRecommendationProducts: vi.fn(async () => []),
    getFilteredCartRecommendations: vi.fn(() => []),
}));

describe("CartSheet checkout refresh", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.requestAnimationFrame = (callback: FrameRequestCallback) => {
            callback(0);
            return 0;
        };
        window.cancelAnimationFrame = vi.fn();
        vi.mocked(refreshCartItems).mockResolvedValue({
            success: true,
            items: [
                {
                    ...staleItem,
                    price: 150,
                    requestedQuantity: 1,
                    availableQuantity: 1,
                },
            ],
            missingProductIds: [],
            soldProductIds: [],
            quantityAdjustedProductIds: [],
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("updates stale cart prices and stops before purchase confirmation or PIN", async () => {
        render(<CartSheet />);

        const checkoutButtons = await screen.findAllByRole("button", { name: "ชำระเงิน 1 รายการ" });
        fireEvent.click(checkoutButtons[0]);

        await waitFor(() => {
            expect(replaceCartItems).toHaveBeenCalledWith([
                expect.objectContaining({
                    id: "product-1",
                    price: 150,
                    quantity: 1,
                    stock: 3,
                }),
            ]);
        });
        expect(showWarning).toHaveBeenCalledWith("ราคาหรือข้อมูลสินค้ามีการอัปเดต กรุณาตรวจสอบยอดใหม่ก่อนชำระเงิน");
        expect(openCart).toHaveBeenCalled();
        expect(showPurchaseConfirm).not.toHaveBeenCalled();
        expect(requirePinForAction).not.toHaveBeenCalled();
    });
});
