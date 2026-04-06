"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Loader2, Plus, Check, Search, Tag } from "lucide-react";
import { QuantitySelector } from "@/components/QuantitySelector";
import { useCart } from "@/components/providers/CartContext";
import { showPurchaseConfirm, showPurchaseSuccessModal, showWarning, showErrorAlert } from "@/lib/swal";
import { useMaintenanceStatus } from "@/hooks/useMaintenanceStatus";

interface ProductActionsProps {
    product: {
        id: string;
        name: string;
        price: number;
        discountPrice?: number | null;
        imageUrl: string | null;
        category: string;
    };
    disabled?: boolean;
    maxQuantity?: number;
}

export function ProductActions({ product, disabled = false, maxQuantity = 99 }: Readonly<ProductActionsProps>) {
    const router = useRouter();
    const maintenance = useMaintenanceStatus().purchase;
    const { addToCart, isInCart, isLoading: cartLoading } = useCart();
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
    } | null>(null);
    const inCart = isInCart(product.id);

    const basePrice = (product.discountPrice ?? product.price) * quantity;

    // Calculate final price after promo
    const calcFinalPrice = (total: number) => {
        if (!appliedPromo) return total;
        let discount = 0;
        if (appliedPromo.discountType === "PERCENTAGE") {
            discount = (total * appliedPromo.discountValue) / 100;
            if (appliedPromo.maxDiscount !== null && discount > appliedPromo.maxDiscount) {
                discount = appliedPromo.maxDiscount;
            }
        } else {
            discount = appliedPromo.discountValue;
        }
        return Math.max(0, Math.round((total - discount) * 100) / 100);
    };

    const finalPrice = calcFinalPrice(basePrice);

    const handleCheckPromo = async () => {
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
                });
                showWarning(data.message);
            } else {
                setAppliedPromo(null);
                showWarning(data.message || "โค้ดส่วนลดไม่ถูกต้อง");
            }
        } catch {
            showWarning("ไม่สามารถตรวจสอบโค้ดได้ กรุณาลองใหม่");
        } finally {
            setIsCheckingPromo(false);
        }
    };

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
            priceText: `฿${finalPrice.toLocaleString()}`,
            extraHtml: discountLine,
        });

        if (!confirmed) return;

        setIsBuying(true);

        try {
            const response = await fetch("/api/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: product.id, quantity, promoCode: appliedPromo?.code || undefined }),
            });

            const data = await response.json();

            if (data.success) {
                await showPurchaseSuccessModal({
                    productName: data.productName,
                });
                router.refresh();
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
        if (disabled || inCart || isAdding) return;

        setIsAdding(true);
        try {
            await addToCart({
                id: product.id,
                name: product.name,
                price: product.price,
                discountPrice: product.discountPrice,
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
                <div className="rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
            <div>
                <p className="text-sm text-muted-foreground mb-1.5">ส่วนลด</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                        placeholder="กรอกส่วนลดของท่าน"
                        value={promoCode}
                        onChange={(e) => {
                            setPromoCode(e.target.value);
                            setAppliedPromo(null); // reset if user changes code
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleCheckPromo()}
                        className={`flex-1 rounded-full bg-white border-gray-300 focus-visible:ring-blue-500 ${appliedPromo ? "border-green-400" : ""}`}
                        disabled={isProcessing}
                    />
                    <Button
                        variant="outline"
                        className="rounded-full gap-1.5 px-4 shrink-0 bg-white border-gray-300 hover:bg-gray-50 text-gray-700"
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
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm font-medium text-green-600">
                        <Tag className="h-3.5 w-3.5" />
                        ใช้โค้ด {appliedPromo.code} — ราคาลดเหลือ ฿{finalPrice.toLocaleString()}
                    </div>
                )}
            </div>


            {/* 3. Buy Now */}
            <Button
                size="lg"
                className={`w-full gap-2 text-base rounded-full font-semibold ${disabled
                    ? "bg-rose-100 text-rose-400 hover:bg-rose-100 cursor-not-allowed border border-rose-200"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
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
                        {maintenance?.enabled ? "ปิดปรับปรุงชั่วคราว" : disabled ? "สินค้าหมด 🚫" : `ซื้อเลย - ฿${finalPrice.toLocaleString()}`}
                    </>
                )}
            </Button>

            {/* 4. Add to Cart */}
            <Button
                variant="outline"
                size="lg"
                className="w-full gap-2 text-base rounded-full border-blue-400 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
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
                        <Check className="h-4 w-4" />
                        อยู่ในตะกร้าแล้ว
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
