"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2 } from "lucide-react";
import { showPurchaseConfirm, showPurchaseSuccessModal, showWarning, showErrorAlert } from "@/lib/swal";
import { useMaintenanceStatus } from "@/hooks/useMaintenanceStatus";
import { requireAuthBeforePurchase } from "@/lib/require-auth-before-purchase";

interface BuyButtonProps {
    productId: string;
    price: number;
    disabled?: boolean;
}

export function BuyButton({ productId, price, disabled }: Readonly<BuyButtonProps>) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const maintenance = useMaintenanceStatus().purchase;
    const isBlocked = Boolean(disabled || isLoading || maintenance?.enabled);

    const handlePurchase = async () => {
        if (maintenance?.enabled) {
            showWarning(maintenance.message);
            return;
        }

        if (disabled || isLoading) return;

        const authCheck = await requireAuthBeforePurchase(router);
        if (!authCheck.allowed) {
            return;
        }

        const confirmed = await showPurchaseConfirm({
            priceText: `฿${price.toLocaleString()}`,
        });

        if (!confirmed) return;

        setIsLoading(true);

        try {
            const response = await fetch("/api/purchase", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ productId }),
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
            setIsLoading(false);
        }
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
