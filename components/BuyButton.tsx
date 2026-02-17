"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2 } from "lucide-react";
import { showPurchaseConfirm, showPurchaseSuccessModal, showWarning, showErrorAlert } from "@/lib/swal";

interface BuyButtonProps {
    productId: string;
    price: number;
    disabled?: boolean;
}

export function BuyButton({ productId, price, disabled }: BuyButtonProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handlePurchase = async () => {
        if (disabled || isLoading) return;

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
            setIsLoading(false);
        }
    };

    return (
        <Button
            size="lg"
            className="mt-auto w-full gap-2 text-lg"
            disabled={disabled || isLoading}
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
                    {disabled ? "ไม่พร้อมขาย" : `ซื้อเลย - ฿${price.toLocaleString()}`}
                </>
            )}
        </Button>
    );
}
