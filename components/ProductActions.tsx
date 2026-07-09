"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ShoppingCart, Loader2, Plus, Search, Tag } from "lucide-react";
import { QuantitySelector } from "@/components/QuantitySelector";
import { useCart } from "@/components/providers/CartContext";
import { showWarning, showErrorAlert } from "@/lib/swal";
import { useMaintenanceStatus } from "@/hooks/useMaintenanceStatus";
import { formatCurrencyAmount, normalizeCurrencyCode, type PublicCurrencySettings } from "@/lib/currencySettings";
import { escapeHtml } from "@/lib/sanitize";
import { themeClasses } from "@/lib/theme";
import {
    buildAppliedPromoFromValidation,
    buildPromoValidationPayload,
    validatePromoCode,
} from "@/lib/client/promoCodeClient";
import { usePurchaseProduct } from "@/hooks/usePurchaseProduct";

interface ProductActionsProps {
    product: {
        id: string;
        name: string;
        price: number;
        discountPrice?: number | null;
        currency?: string | null;
        imageUrl: string | null;
        category: string;
    };
    disabled?: boolean;
    maxQuantity?: number;
    currencySettings?: PublicCurrencySettings;
}

export function ProductActions({
    product,
    disabled = false,
    maxQuantity = 99,
    currencySettings,
}: Readonly<ProductActionsProps>) {
    const maintenance = useMaintenanceStatus().purchase;
    const { addToCart, isInCart, isLoading: cartLoading, openCart } = useCart();
    const { isPurchasing, purchaseProduct } = usePurchaseProduct();
    const [quantity, setQuantity] = useState(1);
    const [isAdding, setIsAdding] = useState(false);
    const [promoCode, setPromoCode] = useState("");
    const [isCheckingPromo, setIsCheckingPromo] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<{
        code: string;
        discountType: string;
        discountValue: number;
        maxDiscount: number | null;
        discountAmount: number;
        finalPrice: number | null;
    } | null>(null);
    const inCart = isInCart(product.id);
    const isBuying = isPurchasing(product.id);
    const normalizedCurrency = normalizeCurrencyCode(product.currency);
    const isPointCurrency = normalizedCurrency === "POINT";
    const hasAppliedPromo = Boolean(appliedPromo);

    const basePrice = (product.discountPrice ?? product.price) * quantity;

    // Calculate final price after promo
    const calcFinalPrice = (total: number) => {
        if (!appliedPromo) return total;
        if (typeof appliedPromo.finalPrice === "number" && Number.isFinite(appliedPromo.finalPrice)) {
            return appliedPromo.finalPrice;
        }
        return Math.max(0, Math.round((total - appliedPromo.discountAmount) * 100) / 100);
    };

    const finalPrice = calcFinalPrice(basePrice);

    const validatePromo = useCallback(async (options?: { silent?: boolean }) => {
        const silent = options?.silent ?? false;

        if (!promoCode.trim() || isCheckingPromo) return;
        setIsCheckingPromo(true);
        try {
            const data = await validatePromoCode(
                buildPromoValidationPayload({
                    code: promoCode,
                    totalPrice: basePrice,
                    productCategory: product.category,
                }),
            );
            if (data.valid) {
                const appliedPromoData = buildAppliedPromoFromValidation({
                    code: promoCode,
                    data,
                    fallbackFinalPrice: basePrice,
                });
                setAppliedPromo({
                    code: appliedPromoData.code,
                    discountType: data.discountType,
                    discountValue: data.discount,
                    maxDiscount: data.maxDiscount,
                    discountAmount: appliedPromoData.discountAmount,
                    finalPrice: appliedPromoData.finalPrice,
                });
                if (!silent) {
                    showWarning(data.message);
                }
            } else {
                setAppliedPromo(null);
                if (!silent) {
                    showWarning(data.message || "โค้ดส่วนลดไม่ถูกต้อง");
                }
            }
        } catch {
            if (!silent) {
                showWarning("ไม่สามารถตรวจสอบโค้ดได้ กรุณาลองใหม่");
            }
        } finally {
            setIsCheckingPromo(false);
        }
    }, [basePrice, isCheckingPromo, product.category, promoCode]);

    const handleCheckPromo = async () => {
        await validatePromo();
    };

    useEffect(() => {
        if (!hasAppliedPromo || !promoCode.trim() || isPointCurrency) {
            return;
        }

        void validatePromo({ silent: true });
    }, [basePrice, hasAppliedPromo, isPointCurrency, promoCode, validatePromo]);

    // Buy Now handler
    const handlePurchase = async () => {
        if (maintenance?.enabled) {
            showWarning(maintenance.message);
            return;
        }

        if (disabled || isBuying) return;

        const discountLine = appliedPromo
            ? `<small>โค้ดส่วนลด: <strong>${escapeHtml(appliedPromo.code)}</strong> (ราคาเดิม ฿${escapeHtml(basePrice.toLocaleString())})</small>`
            : `<small>จำนวน: <strong>${escapeHtml(quantity.toString())}</strong> ชิ้น</small>`;

        await purchaseProduct({
            productId: product.id,
            productName: product.name,
            amount: finalPrice,
            currency: normalizedCurrency,
            currencySettings,
            quantity,
            promoCode: appliedPromo?.code || undefined,
            priceText: formatCurrencyAmount(finalPrice, normalizedCurrency, currencySettings),
            extraHtml: discountLine,
            onError: async (error) => {
                await showErrorAlert(
                    "เกิดข้อผิดพลาด",
                    error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง"
                );
            },
        });
    };


    // Add to Cart handler
    const handleAddToCart = async () => {
        if (disabled || isAdding) return;

        if (inCart) {
            openCart();
            return;
        }

        setIsAdding(true);
        try {
            await addToCart({
                id: product.id,
                name: product.name,
                price: product.price,
                discountPrice: product.discountPrice,
                currency: normalizedCurrency,
                imageUrl: product.imageUrl,
                category: product.category,
                quantity: quantity,
            });
        } finally {
            setIsAdding(false);
        }
    };

    const isProcessing = isBuying || isAdding || cartLoading;

    return (
        <div className="space-y-4">
            {maintenance?.enabled && (
                <div className={`${themeClasses.alert} rounded-3xl px-4 py-3 text-sm`}>
                    <p className="font-semibold">ระบบสั่งซื้อกำลังปิดปรับปรุงชั่วคราว</p>
                    <p className="mt-1 text-xs text-amber-800/90">{maintenance.message}</p>
                </div>
            )}
            {inCart ? (
                <div className="space-y-3">
                    <div className="rounded-3xl border border-primary/25 bg-primary/5 px-4 py-3 text-left text-sm shadow-sm">
                        <div className="flex gap-3">
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <CheckCircle2 className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="font-semibold text-foreground">สินค้านี้อยู่ในตะกร้าแล้ว</p>
                                <p className="mt-1 text-muted-foreground">
                                    ไปที่ตะกร้าเพื่อตรวจสอบจำนวนสินค้า ใช้ส่วนลด และชำระเงิน
                                </p>
                            </div>
                        </div>
                    </div>
                    <Button
                        type="button"
                        size="lg"
                        className="w-full gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-[0_18px_36px_-24px_rgba(15,23,42,0.28)] hover:bg-primary/90"
                        disabled={cartLoading}
                        onClick={openCart}
                    >
                        <ShoppingCart className="h-5 w-5" />
                        ไปที่ตะกร้า
                    </Button>
                </div>
            ) : (
                <>
                    {/* 1. Quantity Selector */}
                    {!disabled && (
                        <div className="flex justify-center">
                            <QuantitySelector
                                value={quantity}
                                onChange={setQuantity}
                                min={1}
                                max={maxQuantity}
                                size="md"
                                disabled={isProcessing}
                                label="จำนวนสินค้า"
                            />
                        </div>
                    )}

                    {/* 2. Promo Code */}
                    {!isPointCurrency && (
                        <div>
                            <p className="text-sm text-muted-foreground mb-1.5">ส่วนลด</p>
                            <div className="flex">
                                <Input
                                    placeholder="กรอกส่วนลดของท่าน"
                                    value={promoCode}
                                    onChange={(e) => {
                                        setPromoCode(e.target.value);
                                        setAppliedPromo(null);
                                    }}
                                    onKeyDown={(e) => e.key === "Enter" && handleCheckPromo()}
                                    className={`flex-1 rounded-l-xl rounded-r-none border-r-0 border-border/80 bg-background/90 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/35 ${appliedPromo ? "border-primary" : ""}`}
                                    disabled={isProcessing}
                                />
                                <Button
                                    variant="outline"
                                    className="shrink-0 rounded-l-none rounded-r-xl gap-1.5 px-4 border border-primary/45 bg-primary/10 font-medium text-primary hover:bg-primary/20 hover:text-primary"
                                    onClick={handleCheckPromo}
                                    disabled={isCheckingPromo || !promoCode.trim()}
                                >
                                    {isCheckingPromo && (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    )}
                                    {!isCheckingPromo && (
                                        <Search className="h-4 w-4" />
                                    )}
                                    ตรวจสอบ
                                </Button>
                            </div>
                            {appliedPromo && (
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                                    <Tag className="h-3.5 w-3.5" />
                                    <span>ใช้โค้ด {appliedPromo.code} — ราคาลดเหลือ </span>
                                    <span className="text-red-500 dark:text-red-400">
                                        {formatCurrencyAmount(finalPrice, normalizedCurrency, currencySettings)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}


                    {/* 3. Buy Now */}
                    <Button
                        size="lg"
                        className={`w-full gap-2 h-12 text-base rounded-xl font-bold ${disabled
                            ? "cursor-not-allowed border border-border/70 bg-accent/40 text-muted-foreground hover:bg-accent/40"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}
                        disabled={disabled || isBuying || maintenance?.enabled}
                        onClick={handlePurchase}
                    >
                        {isBuying && (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                กำลังดำเนินการ...
                            </>
                        )}
                        {!isBuying && (
                            <>
                                <ShoppingCart className="h-5 w-5" />
                                {maintenance?.enabled
                                    ? "ปิดปรับปรุงชั่วคราว"
                                    : disabled
                                        ? "สินค้าหมด"
                                        : `ซื้อทันที - ${formatCurrencyAmount(finalPrice, normalizedCurrency, currencySettings)}`}
                            </>
                        )}
                    </Button>

                    {/* 4. Add to Cart */}
                    <Button
                        variant="outline"
                        size="lg"
                        className="w-full gap-2 h-10 rounded-xl border-border/60 bg-transparent text-sm font-medium text-muted-foreground shadow-none hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                        disabled={disabled || isAdding || cartLoading}
                        onClick={handleAddToCart}
                    >
                        {isAdding && (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                กำลังเพิ่ม...
                            </>
                        )}
                        {!isAdding && (
                            <>
                                <Plus className="h-4 w-4" />
                                เพิ่มลงตะกร้า
                            </>
                        )}
                    </Button>
                </>
            )}
        </div>
    );
}
