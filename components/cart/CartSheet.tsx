"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetDescription,
    SheetHeader,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Trash2, Loader2, ShoppingBag, Search, Tag, ChevronDown } from "lucide-react";
import { useCart, type CartItem as CartContextItem } from "@/components/providers/CartContext";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { CartItem } from "./CartItem";
import { CartIcon } from "./CartIcon";
import { showPurchaseSuccessModal, showPurchaseConfirm, showPurchaseFailedModal, showConfirm, showError, showSuccess, showWarning } from "@/lib/swal";
import { useMaintenanceStatus } from "@/hooks/useMaintenanceStatus";
import { useCurrencySettings } from "@/hooks/useCurrencySettings";
import {
    buildCurrencyBreakdownLabel,
    formatCurrencyAmount,
    normalizeCurrencyCode,
    type ProductCurrencyCode,
} from "@/lib/currencySettings";
import { escapeHtml } from "@/lib/sanitize";
import { requireAuthBeforePurchase } from "@/lib/require-auth-before-purchase";
import { requirePinForAction } from "@/lib/require-pin-for-action";
import {
    buildCartCheckoutPayload,
    buildCartCheckoutSuccessLabel,
    checkoutCart,
} from "@/lib/client/cartCheckoutClient";
import {
    buildCartRefreshPayload,
    refreshCartItems,
    type RefreshedCartItem,
} from "@/lib/client/cartRefreshClient";
import {
    buildAppliedPromoFromValidation,
    buildPromoValidationPayload,
    getCartPromoLineItems,
    validatePromoCode,
} from "@/lib/client/promoCodeClient";
import {
    fetchCartRecommendationProducts,
    getFilteredCartRecommendations,
    type CartRecommendationProduct,
} from "@/lib/client/cartRecommendationsClient";
import { themeClasses } from "@/lib/theme";

function normalizeOptionalPrice(value: number | null | undefined) {
    return value == null ? null : Number(value);
}

function buildSyncedCartItem(
    currentItem: CartContextItem,
    refreshedItem: RefreshedCartItem,
): CartContextItem {
    return {
        ...currentItem,
        name: refreshedItem.name,
        price: refreshedItem.price,
        discountPrice: refreshedItem.discountPrice,
        currency: refreshedItem.currency,
        imageUrl: refreshedItem.imageUrl,
        category: refreshedItem.category,
        quantity: refreshedItem.quantity,
        stock: refreshedItem.stock,
    };
}

function hasCartItemChanged(currentItem: CartContextItem, syncedItem: CartContextItem) {
    return currentItem.name !== syncedItem.name
        || Number(currentItem.price) !== Number(syncedItem.price)
        || normalizeOptionalPrice(currentItem.discountPrice) !== normalizeOptionalPrice(syncedItem.discountPrice)
        || normalizeCurrencyCode(currentItem.currency) !== normalizeCurrencyCode(syncedItem.currency)
        || currentItem.imageUrl !== syncedItem.imageUrl
        || currentItem.category !== syncedItem.category
        || (currentItem.quantity || 1) !== (syncedItem.quantity || 1)
        || currentItem.stock !== syncedItem.stock;
}

function hasCheckoutRelevantChange(currentItem: CartContextItem, syncedItem: CartContextItem) {
    return Number(currentItem.price) !== Number(syncedItem.price)
        || normalizeOptionalPrice(currentItem.discountPrice) !== normalizeOptionalPrice(syncedItem.discountPrice)
        || normalizeCurrencyCode(currentItem.currency) !== normalizeCurrencyCode(syncedItem.currency)
        || (currentItem.quantity || 1) !== (syncedItem.quantity || 1);
}

function getCartTotalsByCurrency(cartItems: CartContextItem[]) {
    return cartItems.reduce<Record<ProductCurrencyCode, number>>((accumulator, item) => {
        const currency = normalizeCurrencyCode(item.currency);
        const price = item.discountPrice ?? item.price;
        accumulator[currency] += price * (item.quantity || 1);
        return accumulator;
    }, { THB: 0, POINT: 0 });
}

function getCartItemCount(cartItems: CartContextItem[]) {
    return cartItems.reduce((count, item) => count + (item.quantity || 1), 0);
}

function CartSheetContent() {
    const router = useRouter();
    const maintenance = useMaintenanceStatus().purchase;
    const currencySettings = useCurrencySettings();
    const {
        items,
        removeFromCart,
        replaceCartItems,
        updateQuantity,
        clearCart,
        total,
        itemCount,
        totalsByCurrency,
        isCartOpen,
        openCart,
        closeCart,
    } = useCart();
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState(false);
    const [promoCode, setPromoCode] = useState("");
    const [isCheckingPromo, setIsCheckingPromo] = useState(false);
    const [recommendedProducts, setRecommendedProducts] = useState<CartRecommendationProduct[]>([]);
    const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<{
        code: string;
        discountAmount: number;
        finalPrice: number;
    } | null>(null);
    const thbTotal = totalsByCurrency.THB ?? 0;
    const pointTotal = totalsByCurrency.POINT ?? 0;

    useEffect(() => {
        setAppliedPromo(null);
    }, [items, total, pointTotal]);

    useEffect(() => {
        let isActive = true;

        async function fetchRecommendedProducts() {
            setIsRecommendationsLoading(true);
            try {
                const products = await fetchCartRecommendationProducts();
                if (!isActive || !products) {
                    return;
                }

                setRecommendedProducts(products);
            } catch (error) {
                console.error("Cart recommendation fetch error:", error);
            } finally {
                if (isActive) {
                    setIsRecommendationsLoading(false);
                }
            }
        }

        fetchRecommendedProducts();

        return () => {
            isActive = false;
        };
    }, []);

    const finalThbTotal = appliedPromo?.finalPrice ?? thbTotal;
    const finalTotals = {
        THB: finalThbTotal,
        POINT: pointTotal,
    };
    const originalTotals = items.reduce<Record<ProductCurrencyCode, number>>((accumulator, item) => {
        const currency = normalizeCurrencyCode(item.currency);
        accumulator[currency] += item.price * (item.quantity || 1);
        return accumulator;
    }, { THB: 0, POINT: 0 });
    const productDiscountTotals = items.reduce<Record<ProductCurrencyCode, number>>((accumulator, item) => {
        const currency = normalizeCurrencyCode(item.currency);
        const activePrice = item.discountPrice ?? item.price;
        accumulator[currency] += Math.max(0, (item.price - activePrice) * (item.quantity || 1));
        return accumulator;
    }, { THB: 0, POINT: 0 });
    const hasProductDiscount = Object.values(productDiscountTotals).some((amount) => amount > 0);
    const cartLineItems = items.map((item) => {
        const originalUnitPrice = item.price;
        const unitPrice = item.discountPrice ?? item.price;
        const quantity = item.quantity || 1;

        return {
            id: item.id,
            name: item.name,
            quantity,
            currency: item.currency ?? "THB",
            originalSubtotal: originalUnitPrice * quantity,
            subtotal: unitPrice * quantity,
            productDiscount: Math.max(0, (originalUnitPrice - unitPrice) * quantity),
        };
    });
    const filteredRecommendedProducts = getFilteredCartRecommendations(recommendedProducts, items);

    const handleCheckPromo = async () => {
        if (!promoCode.trim() || isCheckingPromo || items.length === 0 || thbTotal <= 0) return;

        setIsCheckingPromo(true);
        try {
            const data = await validatePromoCode(
                buildPromoValidationPayload({
                    code: promoCode,
                    totalPrice: thbTotal,
                    items: getCartPromoLineItems(items),
                }),
            );

            if (data.valid) {
                setAppliedPromo(buildAppliedPromoFromValidation({
                    code: promoCode,
                    data,
                    fallbackFinalPrice: thbTotal,
                }));
                showSuccess(data.message);
                return;
            }

            setAppliedPromo(null);
            showWarning(data.message || "โค้ดส่วนลดไม่ถูกต้อง");
        } catch (error) {
            console.error("Cart promo validation error:", error);
            showWarning("ไม่สามารถตรวจสอบโค้ดได้ กรุณาลองใหม่");
        } finally {
            setIsCheckingPromo(false);
        }
    };

    const handleClearCart = async () => {
        // Close the sheet first — its overlay sits above the confirm dialog
        closeCart();
        await new Promise((resolve) => setTimeout(resolve, 300));
        const confirmed = await showConfirm(
            "ล้างตะกร้า?",
            `สินค้าทั้งหมด ${itemCount} รายการจะถูกนำออกจากตะกร้า`,
            "ล้างตะกร้า"
        );
        if (!confirmed) {
            openCart();
            return;
        }
        clearCart();
        openCart();
    };

    const handleCheckout = async () => {
        if (maintenance?.enabled) {
            showError(maintenance.message);
            return;
        }

        if (items.length === 0) {
            showError("ตะกร้าว่างเปล่า");
            return;
        }

        const authCheck = await requireAuthBeforePurchase(router);
        if (!authCheck.allowed) {
            closeCart();
            return;
        }

        setIsCheckingOut(true);
        try {
            const refreshData = await refreshCartItems(buildCartRefreshPayload({ items }));
            if (!refreshData.success) {
                showError(refreshData.message || "ไม่สามารถตรวจสอบข้อมูลตะกร้าได้ กรุณาลองใหม่");
                return;
            }

            const refreshedItems = refreshData.items ?? [];
            const refreshedById = new Map(refreshedItems.map((item) => [item.id, item]));
            const syncedItems = items
                .map((item) => {
                    const refreshedItem = refreshedById.get(item.id);
                    return refreshedItem ? buildSyncedCartItem(item, refreshedItem) : null;
                })
                .filter((item): item is CartContextItem => item !== null);
            const removedProductIds = [
                ...(refreshData.missingProductIds ?? []),
                ...(refreshData.soldProductIds ?? []),
            ];
            const hasRemovedProducts = syncedItems.length !== items.length || removedProductIds.length > 0;
            const hasQuantityAdjustments = (refreshData.quantityAdjustedProductIds ?? []).length > 0;
            const hasItemChanges = syncedItems.some((syncedItem, index) => hasCartItemChanged(items[index], syncedItem));
            const hasRelevantChanges = hasRemovedProducts
                || hasQuantityAdjustments
                || syncedItems.some((syncedItem, index) => hasCheckoutRelevantChange(items[index], syncedItem))
                || Boolean(appliedPromo && syncedItems.some((syncedItem, index) => items[index]?.category !== syncedItem.category));

            if (hasItemChanges || hasRemovedProducts) {
                replaceCartItems(syncedItems);
            }

            if (syncedItems.length === 0) {
                setAppliedPromo(null);
                openCart();
                showError("สินค้าที่อยู่ในตะกร้าไม่พร้อมจำหน่ายแล้ว ระบบอัปเดตตะกร้าให้แล้ว");
                return;
            }

            if (hasRelevantChanges) {
                setAppliedPromo(null);
                openCart();
                if (hasRemovedProducts) {
                    showWarning("บางสินค้าไม่พร้อมจำหน่ายแล้ว ระบบอัปเดตตะกร้าให้แล้ว กรุณาตรวจสอบอีกครั้ง");
                } else if (hasQuantityAdjustments) {
                    showWarning("จำนวนสินค้าบางรายการถูกปรับตามสต็อกล่าสุด กรุณาตรวจสอบก่อนชำระเงิน");
                } else {
                    showWarning("ราคาหรือข้อมูลสินค้ามีการอัปเดต กรุณาตรวจสอบยอดใหม่ก่อนชำระเงิน");
                }
                return;
            }

            const checkoutTotalsByCurrency = getCartTotalsByCurrency(syncedItems);
            const checkoutItemCount = getCartItemCount(syncedItems);
            const checkoutFinalTotals = {
                THB: appliedPromo?.finalPrice ?? checkoutTotalsByCurrency.THB,
                POINT: checkoutTotalsByCurrency.POINT,
            };

            closeCart();
            await new Promise((r) => setTimeout(r, 300));

            const confirmed = await showPurchaseConfirm({
                productName: checkoutItemCount > 1 ? `${checkoutItemCount} รายการ` : syncedItems[0]?.name,
                priceText: buildCurrencyBreakdownLabel(checkoutFinalTotals, currencySettings),
                extraHtml: appliedPromo
                    ? `<small>โค้ดส่วนลด: <strong>${escapeHtml(appliedPromo.code)}</strong> ลด ฿${escapeHtml(appliedPromo.discountAmount.toLocaleString())}</small>`
                    : undefined,
                confirmText: "ยืนยันการสั่งซื้อ",
                cancelText: "ยกเลิก",
            });
            if (!confirmed) {
                openCart();
                return;
            }

            const pinCheck = await requirePinForAction("ยืนยัน PIN เพื่อชำระเงิน");
            if (!pinCheck.allowed) {
                openCart();
                return;
            }

            const checkoutPayload = buildCartCheckoutPayload({
                items: syncedItems,
                promoCode: appliedPromo?.code,
                pin: pinCheck.pin,
            });
            const data = await checkoutCart(checkoutPayload);

            if (data.success) {
                clearCart();
                router.refresh();
                const totalDisplay = buildCurrencyBreakdownLabel(
                    {
                        THB: Number(data.totalTHB ?? 0),
                        POINT: Number(data.totalPoints ?? 0),
                    },
                    currencySettings,
                );
                const label = buildCartCheckoutSuccessLabel(data, totalDisplay);
                const result = await showPurchaseSuccessModal({
                    productName: label,
                    title: "ซื้อสำเร็จ",
                    text: "ต้องการเข้าไปดูสินค้าที่ซื้อเลยไหม",
                    confirmText: "ไปดูสินค้าเลย",
                    cancelText: "อยู่หน้านี้",
                    showCancelButton: true,
                });
                if (result.isConfirmed) {
                    router.push("/dashboard/inventory");
                }
            } else {
                if (data.soldProductIds && Array.isArray(data.soldProductIds)) {
                    data.soldProductIds.forEach((id: string) => removeFromCart(id));
                }
                const { goTopup } = await showPurchaseFailedModal({
                    message: data.message || "ไม่สามารถซื้อได้ กรุณาลองใหม่อีกครั้ง",
                });
                if (goTopup) {
                    router.push("/dashboard/topup");
                }
            }
        } catch (error) {
            console.error("Checkout error:", error);
            await showPurchaseFailedModal({
                message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
                showTopupButton: false,
            });
        } finally {
            setIsCheckingOut(false);
        }
    };

    return (
            <Sheet open={isCartOpen} onOpenChange={(open) => (open ? openCart() : closeCart())}>
                <SheetTrigger asChild>
                    <div>
                        <CartIcon onClick={openCart} />
                    </div>
                </SheetTrigger>

                <SheetContent
                    className="flex w-full flex-col gap-0 overflow-hidden border-l border-border bg-card p-0 text-card-foreground sm:max-w-sm"
                >
                {/* Hidden title for Radix UI accessibility */}
                <SheetHeader className="sr-only">
                    <SheetTitle>ตะกร้าสินค้า</SheetTitle>
                    <SheetDescription>รายการสินค้าที่คุณเลือกไว้</SheetDescription>
                </SheetHeader>
                {/* ── Header ───────────────────────────── */}
                <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    <span className="font-bold text-base">ตะกร้าสินค้า</span>
                    {itemCount > 0 && (
                        <span className="text-xs font-normal text-muted-foreground">
                            ({itemCount} รายการ)
                        </span>
                    )}
                </div>

                {/* ── Body ─────────────────────────────── */}
                {items.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
                        <ShoppingBag className="mb-4 h-14 w-14 text-muted-foreground/30" />
                        <h3 className="text-base font-semibold text-foreground">ตะกร้าว่างเปล่า</h3>
                        <p className="mt-1 text-sm text-muted-foreground">เพิ่มสินค้าที่คุณสนใจได้เลย</p>
                        <Button
                            className="mt-6 rounded-xl px-6"
                            onClick={closeCart}
                        >
                            เลือกซื้อสินค้า
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Item list */}
                        <ScrollArea className="min-h-0 flex-1 bg-background/45">
                            <div className="px-4 py-3 flex flex-col gap-2">
                                {items.map((item) => (
                                    <CartItem
                                        key={item.id}
                                        item={item}
                                        onRemove={removeFromCart}
                                        onUpdateQuantity={updateQuantity}
                                        currencySettings={currencySettings}
                                    />
                                ))}

                                <div className="pt-3">
                                    <div className="mb-3 flex items-center gap-3">
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-border/80" />
                                        <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-muted-foreground">
                                            สินค้าที่แนะนำ
                                        </div>
                                        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-border to-border/80" />
                                    </div>

                                    {isRecommendationsLoading ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            {[1, 2].map((card) => (
                                                <div
                                                    key={card}
                                                    className={`${themeClasses.surfaceSoft} rounded-2xl border border-border/70 p-3`}
                                                >
                                                    <div className="skeleton-wave h-24 rounded-xl" />
                                                    <div className="skeleton-wave mt-3 h-4 rounded" />
                                                    <div className="skeleton-wave mt-2 h-4 w-2/3 rounded" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : filteredRecommendedProducts.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            {filteredRecommendedProducts.map((product) => {
                                                const activePrice = product.discountPrice ?? product.price;

                                                return (
                                                    <Link
                                                        key={product.id}
                                                        href={`/product/${product.id}`}
                                                        className={`${themeClasses.surfaceSoft} flex flex-col rounded-2xl border border-border/70 p-2.5 transition-transform duration-200 hover:-translate-y-0.5`}
                                                    >
                                                        <div className="relative aspect-square overflow-hidden rounded-xl bg-background/80">
                                                            <Image
                                                                src={product.imageUrl || "/placeholder.jpg"}
                                                                alt={product.name}
                                                                fill
                                                                sizes="(max-width: 640px) 45vw, 160px"
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                        <div className="mt-2 min-w-0">
                                                            <p className="truncate text-sm font-semibold text-foreground">
                                                                {product.name}
                                                            </p>
                                                            <p className="mt-1 text-sm font-bold text-primary">
                                                                {formatCurrencyAmount(activePrice, product.currency, currencySettings)}
                                                            </p>
                                                        </div>
                                                        <AddToCartButton
                                                            product={{
                                                                id: product.id,
                                                                name: product.name,
                                                                price: product.price,
                                                                discountPrice: product.discountPrice,
                                                                currency: product.currency,
                                                                imageUrl: product.imageUrl,
                                                                category: product.category,
                                                                quantity: 1,
                                                            }}
                                                            size="sm"
                                                            className="mt-2 w-full"
                                                        />
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className={`${themeClasses.surfaceSoft} rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground`}>
                                            ยังไม่มีสินค้าแนะนำเพิ่มเติมตอนนี้
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ScrollArea>

                        {/* ── Summary + Actions ─────────── */}
                        <div className="space-y-4 border-t border-border px-5 pt-4 pb-5">
                            {maintenance?.enabled && (
                                <div className={`${themeClasses.alert} rounded-xl px-3 py-2 text-sm`}>
                                    <p className="font-semibold">ระบบสั่งซื้อกำลังปิดปรับปรุงชั่วคราว</p>
                                    <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-100/80">{maintenance.message}</p>
                                </div>
                            )}
                            {/* Subtotals */}
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>รวมสินค้า ({itemCount} รายการ)</span>
                                    <span>{buildCurrencyBreakdownLabel(totalsByCurrency, currencySettings)}</span>
                                </div>
                                <Collapsible
                                    open={isOrderSummaryOpen}
                                    onOpenChange={setIsOrderSummaryOpen}
                                    className={`${themeClasses.surfaceSoft} rounded-2xl border border-border/70`}
                                >
                                    {isOrderSummaryOpen ? (
                                        <CollapsibleTrigger asChild>
                                            <button
                                                type="button"
                                                className="flex w-full items-center justify-between gap-3 p-3 text-left"
                                                aria-label="เปิดหรือปิดสรุปรายการสั่งซื้อ"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-foreground">สรุปรายการสั่งซื้อ</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        มีสินค้าอะไรบ้าง รวมกี่รายการ และยอดหลังใช้โค้ด
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="rounded-full border border-border/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                                        {items.length} สินค้า
                                                    </span>
                                                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background/80">
                                                        <ChevronDown
                                                            className="h-4 w-4 rotate-180 text-muted-foreground transition-transform duration-200"
                                                        />
                                                    </span>
                                                </div>
                                            </button>
                                        </CollapsibleTrigger>
                                    ) : (
                                        <div className="flex items-center gap-2 p-2.5">
                                            <CollapsibleTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="min-w-0 flex-1 rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-left"
                                                    aria-label="เปิดสรุปรายการสั่งซื้อ"
                                                >
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <span>{itemCount} รายการ</span>
                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div className="mt-1 flex items-baseline gap-1">
                                                        <span className="text-xl font-bold leading-none text-primary">
                                                            {formatCurrencyAmount(finalThbTotal, "THB", currencySettings)}
                                                        </span>
                                                    </div>
                                                    {appliedPromo ? (
                                                        <p className="mt-1 text-xs font-medium text-foreground">
                                                            <span>ส่วนลด </span>
                                                            <span className="text-red-500 dark:text-red-400">
                                                                ฿{appliedPromo.discountAmount.toLocaleString()}
                                                            </span>
                                                        </p>
                                                    ) : (
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            ดูสรุปรายการก่อนชำระเงิน
                                                        </p>
                                                    )}
                                                </button>
                                            </CollapsibleTrigger>

                                            <button
                                                type="button"
                                                className="shrink-0 rounded-xl bg-primary px-4 py-3 text-center text-primary-foreground shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                                                onClick={handleCheckout}
                                                disabled={isCheckingOut || maintenance?.enabled}
                                                aria-label={`ชำระเงิน ${itemCount} รายการ`}
                                            >
                                                <p className="text-lg font-bold leading-none">
                                                    {isCheckingOut ? "กำลังดำเนินการ..." : `ชำระเงิน (${itemCount})`}
                                                </p>
                                            </button>
                                        </div>
                                    )}

                                    <CollapsibleContent className="space-y-3 px-3 pb-3">
                                        <div className="space-y-2">
                                            {cartLineItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/70 px-3 py-2.5"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-foreground">
                                                            {item.name}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                                            x{item.quantity}
                                                            {item.productDiscount > 0 ? " • มีส่วนลดสินค้า" : ""}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        {item.productDiscount > 0 ? (
                                                            <p className="text-xs text-muted-foreground line-through">
                                                                {formatCurrencyAmount(item.originalSubtotal, item.currency, currencySettings)}
                                                            </p>
                                                        ) : null}
                                                        <p className="text-sm font-semibold text-foreground">
                                                            {formatCurrencyAmount(item.subtotal, item.currency, currencySettings)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-2 border-t border-dashed border-border/80 pt-3 text-sm">
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>ราคาสินค้าก่อนลด</span>
                                                <span>{buildCurrencyBreakdownLabel(originalTotals, currencySettings)}</span>
                                            </div>
                                            {hasProductDiscount ? (
                                                <div className="flex justify-between text-foreground">
                                                    <span>ส่วนลดจากสินค้า</span>
                                                    <span className="font-semibold text-red-500 dark:text-red-400">
                                                        -{buildCurrencyBreakdownLabel(productDiscountTotals, currencySettings)}
                                                    </span>
                                                </div>
                                            ) : null}
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>ค่าสินค้าหลังหักส่วนลด</span>
                                                <span>{buildCurrencyBreakdownLabel(totalsByCurrency, currencySettings)}</span>
                                            </div>
                                            {appliedPromo ? (
                                                <div className="flex justify-between text-foreground">
                                                    <span>ส่วนลดโค้ด {appliedPromo.code}</span>
                                                    <span className="font-semibold text-red-500 dark:text-red-400">
                                                        -{formatCurrencyAmount(appliedPromo.discountAmount, "THB", currencySettings)}
                                                    </span>
                                                </div>
                                            ) : null}
                                            <div className="flex items-baseline justify-between">
                                                <span className="font-semibold text-foreground">ยอดสุทธิ</span>
                                                <span className="text-base font-bold text-red-500 dark:text-red-400">
                                                    {buildCurrencyBreakdownLabel(finalTotals, currencySettings)}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="w-full rounded-xl bg-primary px-4 py-3 text-center text-base font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                                            onClick={handleCheckout}
                                            disabled={isCheckingOut || maintenance?.enabled}
                                            aria-label={`ชำระเงิน ${itemCount} รายการ`}
                                        >
                                            {isCheckingOut ? "กำลังดำเนินการ..." : `ชำระเงิน (${itemCount})`}
                                        </button>
                                    </CollapsibleContent>
                                </Collapsible>
                                {thbTotal > 0 ? (
                                    <div className={`${themeClasses.surfaceSoft} space-y-2 rounded-xl p-3`}>
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <Input
                                                placeholder="กรอกโค้ดส่วนลด"
                                                value={promoCode}
                                                onChange={(event) => {
                                                    setPromoCode(event.target.value);
                                                    setAppliedPromo(null);
                                                }}
                                                onKeyDown={(event) => event.key === "Enter" && handleCheckPromo()}
                                                className="h-10 border-border bg-background text-base text-foreground placeholder:text-muted-foreground md:text-sm"
                                                disabled={isCheckingPromo || isCheckingOut}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className={`${themeClasses.actionMuted} h-10 shrink-0`}
                                                onClick={handleCheckPromo}
                                                disabled={isCheckingPromo || !promoCode.trim() || isCheckingOut}
                                            >
                                                {isCheckingPromo ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Search className="mr-1.5 h-4 w-4" />
                                                        ตรวจสอบ
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                        {appliedPromo ? (
                                            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                                <Tag className="h-3.5 w-3.5" />
                                                <span>ใช้โค้ด {appliedPromo.code} ลด </span>
                                                <span className="text-red-500 dark:text-red-400">
                                                    {formatCurrencyAmount(appliedPromo.discountAmount, "THB", currencySettings)}
                                                </span>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>

                            {/* Clear cart */}
                            <button
                                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-destructive"
                                onClick={handleClearCart}
                                disabled={isCheckingOut}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                ล้างตะกร้า
                            </button>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}

export function CartSheet() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            setMounted(true);
        });

        return () => window.cancelAnimationFrame(frame);
    }, []);

    if (!mounted) {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="relative h-10 w-10"
                aria-label="ตะกร้าสินค้า"
                disabled
            >
                <ShoppingCart className="h-5 w-5" />
            </Button>
        );
    }

    return <CartSheetContent />;
}
