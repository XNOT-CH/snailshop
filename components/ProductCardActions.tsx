"use client";

import { memo, useCallback, useMemo } from "react";
import Link from "next/link";
import { Eye, Loader2, ShoppingCart } from "lucide-react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { useCart } from "@/components/providers/CartContext";
import { Button } from "@/components/ui/button";
import { useMaintenanceStatus, type MaintenanceEntry } from "@/hooks/useMaintenanceStatus";
import { usePurchaseProduct } from "@/hooks/usePurchaseProduct";
import { formatCurrencyAmount, type PublicCurrencySettings } from "@/lib/currencySettings";
import { escapeHtml } from "@/lib/sanitize";
import { showError, showWarning } from "@/lib/swal";
import { themeClasses } from "@/lib/theme";

interface ProductCardActionsProps {
    id: string;
    image: string;
    title: string;
    price: number;
    activePrice: number;
    hasDiscount: boolean;
    currency?: string | null;
    category: string;
    isUnavailable: boolean;
    isSold: boolean;
    currencySettings?: PublicCurrencySettings;
    initialPurchaseMaintenance?: MaintenanceEntry;
}

export const ProductCardActions = memo(function ProductCardActions({
    id,
    image,
    title,
    price,
    activePrice,
    hasDiscount,
    currency = "THB",
    category,
    isUnavailable,
    isSold,
    currencySettings,
    initialPurchaseMaintenance,
}: Readonly<ProductCardActionsProps>) {
    const initialMaintenance = useMemo(
        () => initialPurchaseMaintenance ? { purchase: initialPurchaseMaintenance } : undefined,
        [initialPurchaseMaintenance],
    );
    const maintenance = useMaintenanceStatus(initialMaintenance).purchase;
    const { isInCart, openCart } = useCart();
    const { isPurchasing, purchaseProduct } = usePurchaseProduct();
    const inCart = isInCart(id);
    const isLoading = isPurchasing(id);
    const primaryActionLabel = inCart ? "ดูตะกร้า" : "ซื้อทันที";
    const cartProduct = useMemo(
        () => ({
            id,
            name: title,
            price,
            discountPrice: hasDiscount ? activePrice : undefined,
            currency,
            imageUrl: image,
            category,
            quantity: 1,
        }),
        [activePrice, category, currency, hasDiscount, id, image, price, title],
    );
    const handleBuy = useCallback(async () => {
        if (inCart) {
            openCart();
            return;
        }

        if (maintenance?.enabled) {
            showWarning(maintenance.message);
            return;
        }

        if (isUnavailable || isLoading) return;

        await purchaseProduct({
            productId: id,
            productName: title,
            amount: activePrice,
            currency,
            currencySettings,
            priceText: formatCurrencyAmount(activePrice, currency, currencySettings),
            extraHtml: hasDiscount
                ? `<span class="text-sm text-gray-500 line-through">ราคาปกติ: ${escapeHtml(formatCurrencyAmount(price, currency, currencySettings))}</span>`
                : undefined,
            onError: () => {
                showError("เกิดข้อผิดพลาดในการสั่งซื้อ กรุณาลองใหม่อีกครั้ง");
            },
        });
    }, [
        activePrice,
        currency,
        currencySettings,
        hasDiscount,
        id,
        inCart,
        isLoading,
        isUnavailable,
        maintenance,
        openCart,
        price,
        purchaseProduct,
        title,
    ]);

    return (
        <div className="grid grid-cols-2 gap-2 mt-3">
            {isUnavailable ? (
                <Button variant="outline" className="col-span-2 w-full border-border/80 bg-accent/40 text-foreground" disabled>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {isSold ? "ขายแล้ว" : "สินค้าหมด"}
                </Button>
            ) : (
                <>
                    <Button
                        className="col-span-2 h-9 w-full rounded-xl text-[13px] font-semibold sm:h-10 sm:text-sm"
                        onClick={() => void handleBuy()}
                        disabled={isLoading || maintenance?.enabled}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                กำลังซื้อ...
                            </>
                        ) : (
                            <>
                                <ShoppingCart className="mr-1.5 h-4 w-4 sm:mr-2" />
                                {maintenance?.enabled
                                    ? "ปิดปรับปรุง"
                                    : primaryActionLabel}
                            </>
                        )}
                    </Button>
                    <AddToCartButton
                        product={cartProduct}
                        className={`${themeClasses.actionMuted} storefront-product-action w-full`}
                        showText={false}
                        size="icon"
                    />
                </>
            )}
            <Link href={`/product/${id}`} prefetch={false} className="block">
                <Button variant="outline" size="icon" className={`${themeClasses.actionMuted} storefront-product-action w-full`} aria-label={`ดูรายละเอียด ${title}`}>
                    <Eye className="h-4 w-4" />
                </Button>
            </Link>
        </div>
    );
});
