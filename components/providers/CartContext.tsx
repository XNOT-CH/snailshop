"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { showSuccess, showError, showInfo } from "@/lib/swal";
import { normalizeCurrencyCode, type ProductCurrencyCode } from "@/lib/currencySettings";
import { toBaht, toSatang } from "@/lib/money";
import { requireAuthBeforePurchase } from "@/lib/require-auth-before-purchase";
import { MAX_CART_QUANTITY } from "@/lib/constants/cart";

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
    totalsByCurrency: Record<ProductCurrencyCode, number>;
    isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/** Where carts used to live: one key for the whole browser, no account in it. */
export const CART_STORAGE_KEY = "gamestore_cart";

/** Carts are stored per account so two people on one browser never see each other's. */
export function getCartStorageKey(userId: string | null | undefined): string | null {
    return userId ? `${CART_STORAGE_KEY}:${userId}` : null;
}

interface CartProviderProps {
    children: ReactNode;
    initialAuthenticated?: boolean;
    userId?: string | null;
}

function readCartAtKey(storageKey: string): CartItem[] {
    if (typeof window === "undefined") {
        return [];
    }

    try {
        const savedCart = localStorage.getItem(storageKey);
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

/**
 * Reads this account's cart, moving over anything left under the old shared key
 * the first time. Without the move, shipping the per-account key would empty
 * every existing customer's cart — the thing this change exists to prevent.
 */
function readStoredCart(storageKey: string): CartItem[] {
    const stored = readCartAtKey(storageKey);
    if (stored.length > 0) {
        return stored;
    }

    const legacy = readCartAtKey(CART_STORAGE_KEY);
    if (legacy.length === 0) {
        return [];
    }

    try {
        localStorage.setItem(storageKey, JSON.stringify(legacy));
        localStorage.removeItem(CART_STORAGE_KEY);
    } catch (error) {
        console.error("Failed to move the cart to its per-account key:", error);
    }

    return legacy;
}

export function CartProvider({
    children,
    initialAuthenticated = false,
    userId = null,
}: Readonly<CartProviderProps>) {
    const router = useRouter();
    const [items, setItems] = useState<CartItem[]>([]);
    const itemsRef = React.useRef(items);
    const pendingAddIdsRef = React.useRef<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(initialAuthenticated);
    const [isCartHydrated, setIsCartHydrated] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);

    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    const storageKey = getCartStorageKey(userId);

    useEffect(() => {
        setIsAuthenticated(initialAuthenticated);

        if (initialAuthenticated && storageKey) {
            setItems(readStoredCart(storageKey));
            setIsCartHydrated(true);
            return;
        }

        // A signed-out visitor sees an empty cart, but the stored one is left
        // alone: a session that lapsed overnight used to wipe it for good.
        setItems([]);
        setIsCartHydrated(true);
    }, [initialAuthenticated, storageKey]);

    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }

        const handleStorage = (event: StorageEvent) => {
            if (storageKey && event.key === storageKey) {
                setItems(readCartAtKey(storageKey));
            }
        };

        window.addEventListener("storage", handleStorage);

        return () => {
            window.removeEventListener("storage", handleStorage);
        };
    }, [isAuthenticated, storageKey]);

    // Save cart to localStorage whenever items change
    useEffect(() => {
        if (isAuthenticated && isCartHydrated && storageKey) {
            try {
                localStorage.setItem(storageKey, JSON.stringify(items));
            } catch (error) {
                console.error("Failed to save cart to localStorage:", error);
            }
        }
    }, [items, isAuthenticated, isCartHydrated, storageKey]);

    // Update item quantity
    const updateQuantity = useCallback((productId: string, quantity: number) => {
        if (quantity < 1) return;
        setItems((prev) =>
            prev.map((item) => {
                if (item.id !== productId) return item;
                // Cap quantity at available stock if known
                const maxQty = item.stock != null && item.stock > 0 ? item.stock : MAX_CART_QUANTITY;
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

        if (authCheck.unverified) {
            // The cart is only stored for a signed-in account, so an item added
            // here would disappear on reload without a word.
            showError("ตรวจสอบสถานะการเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
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
        const item = itemsRef.current.find((i) => i.id === productId);
        if (!item) {
            return;
        }

        const nextItems = itemsRef.current.filter((i) => i.id !== productId);
        itemsRef.current = nextItems;
        setItems(nextItems);
        showInfo(`นำออกจากตะกร้าแล้ว: ${item.name}`);
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
        // Totalled in satang and with the same active-price rule the checkout
        // uses, so the number shown here is the number the server will charge.
        const satangByCurrency = items.reduce<Record<ProductCurrencyCode, number>>((accumulator, item) => {
            const currency = normalizeCurrencyCode(item.currency);
            const discountPrice = Number(item.discountPrice ?? Number.NaN);
            const price = Number.isFinite(discountPrice) && discountPrice > 0 ? discountPrice : item.price;
            accumulator[currency] += toSatang(price) * (item.quantity || 1);
            return accumulator;
        }, { THB: 0, POINT: 0 });
        const totalsByCurrency: Record<ProductCurrencyCode, number> = {
            THB: toBaht(satangByCurrency.THB),
            POINT: toBaht(satangByCurrency.POINT),
        };

        // No single "total": a cart can hold both currencies, and one number
        // could only ever be half the answer.
        return {
            itemCount: items.reduce((count, item) => count + (item.quantity || 1), 0),
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
