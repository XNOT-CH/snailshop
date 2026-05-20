"use client";

import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2 } from "lucide-react";
import { showWarning, showErrorAlert } from "@/lib/swal";
import { useMaintenanceStatus } from "@/hooks/useMaintenanceStatus";
import { usePurchaseProduct } from "@/hooks/usePurchaseProduct";

interface BuyButtonProps {
    productId: string;
    price: number;
    disabled?: boolean;
}

export function BuyButton({ productId, price, disabled }: Readonly<BuyButtonProps>) {
    const { isPurchasing, purchaseProduct } = usePurchaseProduct();
    const isLoading = isPurchasing(productId);
    const maintenance = useMaintenanceStatus().purchase;
    const isBlocked = Boolean(disabled || isLoading || maintenance?.enabled);

    const handlePurchase = async () => {
        if (maintenance?.enabled) {
            showWarning(maintenance.message);
            return;
        }

        if (disabled || isLoading) return;

        await purchaseProduct({
            productId,
            amount: price,
            currency: "THB",
            priceText: `฿${price.toLocaleString()}`,
            onError: async (error) => {
                await showErrorAlert(
                    "เกิดข้อผิดพลาด",
                    error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง"
                );
            },
        });
    };

    return (
        <Button
            size="lg"
            className="mt-auto w-full gap-2 text-lg"
            disabled={isBlocked}
            onClick={handlePurchase}
        >
            {isLoading ? (
                <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    กำลังดำเนินการ...
                </>
            ) : (
                <>
                    <ShoppingCart className="h-5 w-5" />
                    {maintenance?.enabled ? "ปิดปรับปรุง" : disabled ? "ไม่พร้อมจำหน่าย" : `ซื้อสินค้า - ฿${price.toLocaleString()}`}
                </>
            )}
        </Button>
    );
}
