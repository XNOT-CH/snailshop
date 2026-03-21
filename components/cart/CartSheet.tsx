"use client";

import { useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Trash2, Loader2, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/providers/CartContext";
import { CartItem } from "./CartItem";
import { CartIcon } from "./CartIcon";
import { showPurchaseSuccessModal, showPurchaseConfirm, showError } from "@/lib/swal";

export function CartSheet() {
    const router = useRouter();
    const { items, removeFromCart, updateQuantity, clearCart, total, itemCount, isLoading } = useCart();
    const [isOpen, setIsOpen] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    const handleCheckout = async () => {
        if (items.length === 0) {
            showError("ตะกร้าว่างเปล่า");
            return;
        }

        setIsOpen(false);
        await new Promise((r) => setTimeout(r, 300));

        const confirmed = await showPurchaseConfirm({
            productName: itemCount > 1 ? `${itemCount} รายการ` : items[0]?.name,
            priceText: `฿${total.toLocaleString()}`,
            confirmText: "ยืนยันการสั่งซื้อ",
            cancelText: "ยกเลิก",
        });
        if (!confirmed) {
            setIsOpen(true);
            return;
        }

        setIsCheckingOut(true);
        try {
            const response = await fetch("/api/cart/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productIds: items.map((item) => item.id) }),
            });

            const data = await response.json();

            if (data.success) {
                clearCart();
                router.refresh();
                const totalDisplay = (data.totalTHB ?? 0) + (data.totalPoints ?? 0);
                const label = data.purchasedCount === 1
                    ? data.orders?.[0]?.productName
                    : `${data.purchasedCount} รายการ รวม ฿${totalDisplay.toLocaleString()}`;
                await showPurchaseSuccessModal({ productName: label });
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
                className="w-full sm:max-w-sm flex flex-col p-0 gap-0 bg-[#0f1923] border-l border-white/10 text-white"
            >
                {/* Hidden title for Radix UI accessibility */}
                <SheetHeader className="sr-only">
                    <SheetTitle>ตะกร้าสินค้า</SheetTitle>
                    <SheetDescription>รายการสินค้าที่คุณเลือกไว้</SheetDescription>
                </SheetHeader>
                {/* ── Header ───────────────────────────── */}
                <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
                    <ShoppingCart className="h-5 w-5 text-blue-400" />
                    <span className="font-bold text-base">ตะกร้าสินค้า</span>
                    {itemCount > 0 && (
                        <span className="text-xs text-white/50 font-normal">
                            ({itemCount} รายการ)
                        </span>
                    )}
                </div>

                {/* ── Body ─────────────────────────────── */}
                {items.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
                        <ShoppingBag className="h-14 w-14 text-white/20 mb-4" />
                        <h3 className="font-semibold text-base text-white/80">ตะกร้าว่างเปล่า</h3>
                        <p className="text-sm text-white/40 mt-1">เพิ่มสินค้าที่คุณสนใจได้เลย</p>
                        <Button
                            className="mt-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-6"
                            onClick={() => setIsOpen(false)}
                        >
                            เลือกซื้อสินค้า
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Item list */}
                        <ScrollArea className="flex-1 bg-[#0a1520]">
                            <div className="px-4 py-3 flex flex-col gap-2">
                                {items.map((item) => (
                                    <CartItem
                                        key={item.id}
                                        item={item}
                                        onRemove={removeFromCart}
                                        onUpdateQuantity={updateQuantity}
                                    />
                                ))}
                            </div>
                        </ScrollArea>

                        {/* ── Summary + Actions ─────────── */}
                        <div className="border-t border-white/10 px-5 pt-4 pb-5 space-y-4">
                            {/* Subtotals */}
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between text-white/50">
                                    <span>รวมสินค้า ({itemCount} รายการ)</span>
                                    <span>฿{total.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="font-bold text-base text-white">ยอดรวมทั้งหมด</span>
                                    <span className="font-bold text-xl text-blue-400">
                                        ฿{total.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Checkout button */}
                            <Button
                                className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl gap-2"
                                onClick={handleCheckout}
                                disabled={isCheckingOut || isLoading}
                            >
                                {isCheckingOut ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        กำลังดำเนินการ...
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart className="h-4 w-4" />
                                        ชำระเงิน ฿{total.toLocaleString()}
                                    </>
                                )}
                            </Button>

                            {/* Clear cart */}
                            <button
                                className="w-full flex items-center justify-center gap-2 text-sm text-white/40 hover:text-red-400 transition-colors"
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
