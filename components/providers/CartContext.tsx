"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { showSuccess, showError, showInfo } from "@/lib/swal";
import { normalizeCurrencyCode, type ProductCurrencyCode } from "@/lib/currencySettings";

// Cart item interface
export interface CartItem {
    id: string;
    name: string;
    price: number;
    discountPrice?: number | null;
    currency?: string | null;
    imageUrl: string | null;
    category: string;
    quantity: number;
    stock?: number; // actual available stock count
}

// Cart context type
interface CartContextType {
    items: CartItem[];
    addToCart: (product: CartItem) => Promise<boolean>;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    isInCart: (productId: string) => boolean;
    itemCount: number;
    subtotal: number;
    total: number;
    totalsByCurrency: Record<ProductCurrencyCode, number>;
    isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CART_STORAGE_KEY = "gamestore_cart";

interface CartProviderProps {
    children: ReactNode;
}

export function CartProvider({ children }: Readonly<CartProviderProps>) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load cart from localStorage on mount
    useEffect(() => {
        try {
            const savedCart = localStorage.getItem(CART_STORAGE_KEY);
            if (savedCart) {
                const parsedCart = JSON.parse(savedCart);
                if (Array.isArray(parsedCart)) {
                    setItems(parsedCart);
                }
            }
        } catch (error) {
            console.error("Failed to load cart from localStorage:", error);
        }
        setIsInitialized(true);
    }, []);

    // Save cart to localStorage whenever items change
    useEffect(() => {
        if (isInitialized) {
            try {
                localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
            } catch (error) {
                console.error("Failed to save cart to localStorage:", error);
            }
        }
    }, [items, isInitialized]);

    // Update item quantity
    const updateQuantity = useCallback((productId: string, quantity: number) => {
        if (quantity < 1) return;
        setItems((prev) =>
            prev.map((item) => {
                if (item.id !== productId) return item;
                // Cap quantity at available stock if known
                const maxQty = item.stock != null && item.stock > 0 ? item.stock : 99;
                const clampedQty = Math.min(quantity, maxQty);
                return { ...item, quantity: clampedQty };
            })
        );
    }, []);

    // Add item to cart with stock validation
    const addToCart = useCallback(async (product: CartItem): Promise<boolean> => {
        // Check if already in cart
        if (items.some((item) => item.id === product.id)) {
            showInfo(`สินค้านี้อยู่ในตะกร้าแล้ว: ${product.name}`);
            return false;
        }

        // Validate stock via public availability API
        setIsLoading(true);
        try {
            const response = await fetch(`/api/products/${product.id}/availability`);
            if (!response.ok) {
                showError("ไม่พบสินค้านี้");
                return false;
            }

            const data = await response.json();
            if (!data.found) {
                showError("ไม่พบสินค้านี้");
                return false;
            }
            if (data.isSold || data.stockCount === 0) {
                showError(`สินค้านี้หมดแล้ว: ${product.name}`);
                return false;
            }

            // Add to cart with actual stock count so QuantitySelector can cap correctly
            setItems((prev) => [...prev, { ...product, quantity: product.quantity || 1, stock: data.stockCount }]);
            showSuccess(`เพิ่มลงตะกร้าแล้ว: ${product.name}`);
            return true;
        } catch (error) {
            console.error("Failed to validate product:", error);
            showError("ไม่สามารถตรวจสอบสินค้าได้");
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [items]);

    // Remove item from cart
    const removeFromCart = useCallback((productId: string) => {
        setItems((prev) => {
            const item = prev.find((i) => i.id === productId);
            if (item) {
                showInfo(`นำออกจากตะกร้าแล้ว: ${item.name}`);
            }
            return prev.filter((i) => i.id !== productId);
        });
    }, []);

    // Clear all items from cart
    const clearCart = useCallback(() => {
        setItems([]);
        showInfo("ล้างตะกร้าแล้ว");
    }, []);

    // Check if item is in cart
    const isInCart = useCallback((productId: string): boolean => {
        return items.some((item) => item.id === productId);
    }, [items]);

    // Calculate item count (total quantities)
    const itemCount = items.reduce((count, item) => count + (item.quantity || 1), 0);

    // Calculate subtotal (using discount price if available, multiplied by quantity)
    const subtotal = items.reduce((sum, item) => {
        const price = item.discountPrice ?? item.price;
        return normalizeCurrencyCode(item.currency) === "THB"
            ? sum + price * (item.quantity || 1)
            : sum;
    }, 0);

    // Total (same as subtotal for now, can add fees/discounts later)
    const total = subtotal;
    const totalsByCurrency = items.reduce<Record<ProductCurrencyCode, number>>((accumulator, item) => {
        const currency = normalizeCurrencyCode(item.currency);
        const price = item.discountPrice ?? item.price;
        accumulator[currency] += price * (item.quantity || 1);
        return accumulator;
    }, { THB: 0, POINT: 0 });

    const value: CartContextType = React.useMemo(() => ({
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        isInCart,
        itemCount,
        subtotal,
        total,
        totalsByCurrency,
        isLoading,
    }), [items, addToCart, updateQuantity, removeFromCart, clearCart, isInCart, itemCount, subtotal, total, totalsByCurrency, isLoading]);

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}

// Custom hook to use cart context
export function useCart(): CartContextType {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
