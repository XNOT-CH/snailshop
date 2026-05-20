"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { showSuccess, showError, showInfo } from "@/lib/swal";
import { normalizeCurrencyCode, type ProductCurrencyCode } from "@/lib/currencySettings";
import { requireAuthBeforePurchase } from "@/lib/require-auth-before-purchase";

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
    replaceCartItems: (nextItems: CartItem[]) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    isInCart: (productId: string) => boolean;
    isCartOpen: boolean;
    openCart: () => void;
    closeCart: () => void;
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
    initialAuthenticated?: boolean;
}

function readStoredCart(): CartItem[] {
    if (typeof window === "undefined") {
        return [];
    }

    try {
        const savedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (!savedCart) {
            return [];
        }

        const parsedCart = JSON.parse(savedCart);
        return Array.isArray(parsedCart) ? parsedCart : [];
    } catch (error) {
        console.error("Failed to read cart from localStorage:", error);
        return [];
    }
}

export function CartProvider({
    children,
    initialAuthenticated = false,
}: Readonly<CartProviderProps>) {
    const router = useRouter();
    const [items, setItems] = useState<CartItem[]>(() => initialAuthenticated ? readStoredCart() : []);
    const itemsRef = React.useRef(items);
    const pendingAddIdsRef = React.useRef<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(initialAuthenticated);
    const [isCartOpen, setIsCartOpen] = useState(false);

    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    useEffect(() => {
        setIsAuthenticated(initialAuthenticated);

        if (initialAuthenticated) {
            setItems(readStoredCart());
            return;
        }

        setItems([]);
        try {
            localStorage.removeItem(CART_STORAGE_KEY);
        } catch (error) {
            console.error("Failed to clear cart for guest session:", error);
        }
    }, [initialAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }

        const handleStorage = (event: StorageEvent) => {
            if (event.key === CART_STORAGE_KEY) {
                setItems(readStoredCart());
            }
        };

        window.addEventListener("storage", handleStorage);

        return () => {
            window.removeEventListener("storage", handleStorage);
        };
    }, [isAuthenticated]);

    // Save cart to localStorage whenever items change
    useEffect(() => {
        if (isAuthenticated) {
            try {
                localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
            } catch (error) {
                console.error("Failed to save cart to localStorage:", error);
            }
        }
    }, [items, isAuthenticated]);

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
        const authCheck = await requireAuthBeforePurchase(router);
        if (!authCheck.allowed) {
            return false;
        }

        const requestedQuantity = product.quantity;
        if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
            showError("จำนวนสินค้าต้องเป็นจำนวนเต็มบวก");
            return false;
        }

        // Check if already in cart
        if (itemsRef.current.some((item) => item.id === product.id)) {
            showInfo(`สินค้านี้อยู่ในตะกร้าแล้ว: ${product.name}`);
            return false;
        }

        if (pendingAddIdsRef.current.has(product.id)) {
            showInfo(`กำลังเพิ่มลงตะกร้า: ${product.name}`);
            return false;
        }

        pendingAddIdsRef.current.add(product.id);

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
            const stockCount = Number(data.stockCount);
            const hasStockCount = Number.isFinite(stockCount);
            if (data.isSold || (hasStockCount && stockCount <= 0)) {
                showError(`สินค้านี้หมดแล้ว: ${product.name}`);
                return false;
            }
            if (hasStockCount && requestedQuantity > stockCount) {
                showError(`สต็อกไม่เพียงพอ (เหลือ ${stockCount} รายการ)`);
                return false;
            }

            if (itemsRef.current.some((item) => item.id === product.id)) {
                showInfo(`สินค้านี้อยู่ในตะกร้าแล้ว: ${product.name}`);
                return false;
            }

            // Add to cart with actual stock count so QuantitySelector can cap correctly
            const cartItem = {
                ...product,
                quantity: requestedQuantity,
                stock: hasStockCount ? stockCount : undefined,
            };
            setItems((prev) => {
                if (prev.some((item) => item.id === product.id)) {
                    return prev;
                }

                const nextItems = [...prev, cartItem];
                itemsRef.current = nextItems;
                return nextItems;
            });
            showSuccess(`เพิ่มลงตะกร้าแล้ว: ${product.name}`);
            return true;
        } catch (error) {
            console.error("Failed to validate product:", error);
            showError("ไม่สามารถตรวจสอบสินค้าได้");
            return false;
        } finally {
            pendingAddIdsRef.current.delete(product.id);
            setIsLoading(false);
        }
    }, [router]);

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

    const replaceCartItems = useCallback((nextItems: CartItem[]) => {
        itemsRef.current = nextItems;
        setItems(nextItems);
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

    const openCart = useCallback(() => {
        setIsCartOpen(true);
    }, []);

    const closeCart = useCallback(() => {
        setIsCartOpen(false);
    }, []);

    const cartTotals = React.useMemo(() => {
        const totalsByCurrency = items.reduce<Record<ProductCurrencyCode, number>>((accumulator, item) => {
            const currency = normalizeCurrencyCode(item.currency);
            const price = item.discountPrice ?? item.price;
            accumulator[currency] += price * (item.quantity || 1);
            return accumulator;
        }, { THB: 0, POINT: 0 });
        const subtotal = totalsByCurrency.THB;

        return {
            itemCount: items.reduce((count, item) => count + (item.quantity || 1), 0),
            subtotal,
            total: subtotal,
            totalsByCurrency,
        };
    }, [items]);

    const value: CartContextType = React.useMemo(() => ({
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        replaceCartItems,
        clearCart,
        isInCart,
        isCartOpen,
        openCart,
        closeCart,
        itemCount: cartTotals.itemCount,
        subtotal: cartTotals.subtotal,
        total: cartTotals.total,
        totalsByCurrency: cartTotals.totalsByCurrency,
        isLoading,
    }), [items, addToCart, updateQuantity, removeFromCart, replaceCartItems, clearCart, isInCart, isCartOpen, openCart, closeCart, cartTotals, isLoading]);

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
