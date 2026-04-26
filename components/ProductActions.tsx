"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Loader2, Plus, Search, Tag } from "lucide-react";
import { QuantitySelector } from "@/components/QuantitySelector";
import { useCart } from "@/components/providers/CartContext";
import { showPurchaseConfirm, showPurchaseSuccessModal, showWarning, showErrorAlert } from "@/lib/swal";
import { useMaintenanceStatus } from "@/hooks/useMaintenanceStatus";
import { formatCurrencyAmount, normalizeCurrencyCode, type PublicCurrencySettings } from "@/lib/currencySettings";
import { preparePurchase } from "@/lib/prepare-purchase";
import { themeClasses } from "@/lib/theme";

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
    const router = useRouter();
    const maintenance = useMaintenanceStatus().purchase;
    const { addToCart, isInCart, isLoading: cartLoading, openCart } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [isBuying, setIsBuying] = useState(false);
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
            const res = await fetch(`/api/promo-codes/validate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: promoCode,
                    totalPrice: basePrice,
                    productCategory: product.category,
                }),
            });
            const data = await res.json();
            if (data.valid) {
                setAppliedPromo({
                    code: promoCode.trim().toUpperCase(),
                    discountType: data.discountType,
                    discountValue: data.discount,
                    maxDiscount: data.maxDiscount,
                    discountAmount: Number(data.discountAmount ?? 0),
                    finalPrice: typeof data.finalPrice === "number" ? data.finalPrice : Number(data.finalPrice ?? basePrice),
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
            ? `<small>โค้ดส่วนลด: <strong>${appliedPromo.code}</strong> (ราคาเดิม ฿${basePrice.toLocaleString()})</small>`
            : `<small>จำนวน: <strong>${quantity}</strong> ชิ้น</small>`;

        const confirmed = await showPurchaseConfirm({
            productName: product.name,
            priceText: formatCurrencyAmount(finalPrice, normalizedCurrency, currencySettings),
            extraHtml: discountLine,
        });

        if (!confirmed) return;

        const purchaseCheck = await preparePurchase({
            router,
            amount: finalPrice,
            currency: normalizedCurrency,
            currencySettings,
            pinActionLabel: "ยืนยัน PIN เพื่อซื้อสินค้า",
        });
        if (!purchaseCheck.allowed) return;

        setIsBuying(true);

        try {
            const response = await fetch("/api/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: product.id,
                    quantity,
                    promoCode: appliedPromo?.code || undefined,
                    pin: purchaseCheck.pin,
                }),
            });

            const data = await response.json();

            if (data.success) {
                const result = await showPurchaseSuccessModal({
                    productName: data.productName,
                    title: "ซื้อสำเร็จ",
                    text: "ต้องการเข้าไปดูสินค้าที่ซื้อเลยไหม",
                    confirmText: "ไปดูสินค้าเลย",
                    cancelText: "อยู่หน้านี้",
                    showCancelButton: true,
                });
                router.refresh();
                if (result.isConfirmed) {
                    router.push("/dashboard/inventory");
                }
            } else {
                showWarning(data.message);
            }
        } catch (error) {
            await showErrorAlert(
                "เกิดข้อผิดพลาด",
                error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง"
            );
        } finally {
            setIsBuying(false);
        }
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
                <div className={`${themeClasses.alert} rounded-2xl px-4 py-3 text-sm`}>
                    <p className="font-semibold">ระบบสั่งซื้อกำลังปิดปรับปรุงชั่วคราว</p>
                    <p className="mt-1 text-xs text-amber-800/90">{maintenance.message}</p>
                </div>
            )}
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
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                            placeholder="กรอกส่วนลดของท่าน"
                            value={promoCode}
                            onChange={(e) => {
                                setPromoCode(e.target.value);
                                setAppliedPromo(null);
                            }}
                            onKeyDown={(e) => e.key === "Enter" && handleCheckPromo()}
                            className={`flex-1 rounded-full border-border/80 bg-background/90 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/35 ${appliedPromo ? "border-primary" : ""}`}
                            disabled={isProcessing}
                        />
                        <Button
                            variant="outline"
                            className={`${themeClasses.actionMuted} shrink-0 rounded-full gap-1.5 px-4 hover:text-primary`}
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
                className={`w-full gap-2 text-base rounded-full font-semibold ${disabled
                    ? "cursor-not-allowed border border-border/70 bg-accent/40 text-muted-foreground hover:bg-accent/40"
                    : "bg-primary text-primary-foreground shadow-[0_18px_36px_-24px_rgba(88,166,255,0.7)] hover:bg-primary/90"
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
                                ? "สินค้าหมด 🚫"
                                : `ซื้อเลย - ${formatCurrencyAmount(finalPrice, normalizedCurrency, currencySettings)}`}
                    </>
                )}
            </Button>

            {/* 4. Add to Cart */}
            <Button
                variant="outline"
                size="lg"
                className="w-full gap-2 rounded-full border-primary/45 bg-transparent text-base text-primary hover:bg-primary/10 hover:text-primary"
                disabled={disabled || isAdding || cartLoading}
                onClick={handleAddToCart}
            >
                {isAdding && (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        กำลังเพิ่ม...
                    </>
                )}
                {!isAdding && inCart && (
                    <>
                        <ShoppingCart className="h-4 w-4" />
                        ดูในตะกร้า
                    </>
                )}
                {!isAdding && !inCart && (
                    <>
                        <Plus className="h-4 w-4" />
                        เพิ่มลงตะกร้า
                    </>
                )}
            </Button>
        </div>
    );
}
