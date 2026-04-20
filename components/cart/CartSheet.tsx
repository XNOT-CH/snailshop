"use client";

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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Trash2, Loader2, ShoppingBag, Search, Tag } from "lucide-react";
import { useCart } from "@/components/providers/CartContext";
import { CartItem } from "./CartItem";
import { CartIcon } from "./CartIcon";
import { showPurchaseSuccessModal, showPurchaseConfirm, showError, showWarning } from "@/lib/swal";
import { useMaintenanceStatus } from "@/hooks/useMaintenanceStatus";
import { useCurrencySettings } from "@/hooks/useCurrencySettings";
import { buildCurrencyBreakdownLabel, formatCurrencyAmount } from "@/lib/currencySettings";
import { requireAuthBeforePurchase } from "@/lib/require-auth-before-purchase";
import { requirePinForAction } from "@/lib/require-pin-for-action";
import { themeClasses } from "@/lib/theme";

function CartSheetContent() {
    const router = useRouter();
    const maintenance = useMaintenanceStatus().purchase;
    const currencySettings = useCurrencySettings();
    const { items, removeFromCart, updateQuantity, clearCart, total, itemCount, totalsByCurrency, isLoading } = useCart();
    const [isOpen, setIsOpen] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [promoCode, setPromoCode] = useState("");
    const [isCheckingPromo, setIsCheckingPromo] = useState(false);
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

    const finalThbTotal = appliedPromo?.finalPrice ?? thbTotal;
    const finalTotals = {
        THB: finalThbTotal,
        POINT: pointTotal,
    };

    const handleCheckPromo = async () => {
        if (!promoCode.trim() || isCheckingPromo || items.length === 0 || thbTotal <= 0) return;

        setIsCheckingPromo(true);
        try {
            const categories = Array.from(
                new Set(
                    items
                        .filter((item) => (item.currency ?? "THB") !== "POINT")
                        .map((item) => item.category)
                        .filter(Boolean),
                ),
            );
            const res = await fetch("/api/promo-codes/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: promoCode,
                    totalPrice: thbTotal,
                    productCategory: categories.length === 1 ? categories[0] : null,
                }),
            });
            const data = await res.json();

            if (data.valid) {
                setAppliedPromo({
                    code: promoCode.trim().toUpperCase(),
                    discountAmount: Number(data.discountAmount ?? 0),
                    finalPrice: Number(data.finalPrice ?? thbTotal),
                });
                showWarning(data.message);
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
            setIsOpen(false);
            return;
        }

        setIsOpen(false);
        await new Promise((r) => setTimeout(r, 300));

        const confirmed = await showPurchaseConfirm({
            productName: itemCount > 1 ? `${itemCount} รายการ` : items[0]?.name,
            priceText: buildCurrencyBreakdownLabel(finalTotals, currencySettings),
            extraHtml: appliedPromo
                ? `<small>โค้ดส่วนลด: <strong>${appliedPromo.code}</strong> ลด ฿${appliedPromo.discountAmount.toLocaleString()}</small>`
                : undefined,
            confirmText: "ยืนยันการสั่งซื้อ",
            cancelText: "ยกเลิก",
        });
        if (!confirmed) {
            setIsOpen(true);
            return;
        }

        const pinCheck = await requirePinForAction("ยืนยัน PIN เพื่อชำระเงิน");
        if (!pinCheck.allowed) {
            setIsOpen(true);
            return;
        }

        setIsCheckingOut(true);
        try {
            const response = await fetch("/api/cart/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productIds: items.map((item) => item.id),
                    promoCode: appliedPromo?.code || undefined,
                    pin: pinCheck.pin || undefined,
                }),
            });

            const data = await response.json();

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
                const label = data.purchasedCount === 1
                    ? data.orders?.[0]?.productName
                    : `${data.purchasedCount} รายการ รวม ${totalDisplay}`;
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
                showError(`ไม่สามารถซื้อได้: ${data.message}`);
                if (data.soldProductIds && Array.isArray(data.soldProductIds)) {
                    data.soldProductIds.forEach((id: string) => removeFromCart(id));
                }
            }
        } catch (error) {
            console.error("Checkout error:", error);
            showError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsCheckingOut(false);
        }
    };

    return (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <div>
                        <CartIcon onClick={() => setIsOpen(true)} />
                    </div>
                </SheetTrigger>

                <SheetContent
                    className="w-full sm:max-w-sm flex flex-col p-0 gap-0 border-l border-border bg-card text-card-foreground"
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
                            onClick={() => setIsOpen(false)}
                        >
                            เลือกซื้อสินค้า
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Item list */}
                        <ScrollArea className="flex-1 bg-background/45">
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
                                                className="h-10 border-border bg-background text-sm text-foreground placeholder:text-muted-foreground"
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
                                            <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-500 dark:text-emerald-300">
                                                <Tag className="h-3.5 w-3.5" />
                                                ใช้โค้ด {appliedPromo.code} ลด {formatCurrencyAmount(appliedPromo.discountAmount, "THB", currencySettings)}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                                {appliedPromo ? (
                                    <div className="flex justify-between text-emerald-500 dark:text-emerald-300">
                                        <span>ส่วนลด</span>
                                        <span>-{formatCurrencyAmount(appliedPromo.discountAmount, "THB", currencySettings)}</span>
                                    </div>
                                ) : null}
                                <div className="flex justify-between items-baseline">
                                    <span className="text-base font-bold text-foreground">ยอดรวมทั้งหมด</span>
                                    <span className="text-xl font-bold text-primary">
                                        {buildCurrencyBreakdownLabel(finalTotals, currencySettings)}
                                    </span>
                                </div>
                            </div>

                            {/* Checkout button */}
                            <Button
                                className="w-full h-12 gap-2 rounded-xl text-base font-semibold"
                                onClick={handleCheckout}
                                disabled={isCheckingOut || isLoading || maintenance?.enabled}
                            >
                                {isCheckingOut ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        กำลังดำเนินการ...
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart className="h-4 w-4" />
                                        {maintenance?.enabled
                                            ? "ปิดปรับปรุงชั่วคราว"
                                            : `ชำระเงิน ${buildCurrencyBreakdownLabel(finalTotals, currencySettings)}`}
                                    </>
                                )}
                            </Button>

                            {/* Clear cart */}
                            <button
                                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-destructive"
                                onClick={clearCart}
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
