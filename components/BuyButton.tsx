"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2 } from "lucide-react";
import { showPurchaseConfirm, showPurchaseSuccessModal, showWarning, showErrorAlert } from "@/lib/swal";
import { useMaintenanceStatus } from "@/hooks/useMaintenanceStatus";

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

        const confirmed = await showPurchaseConfirm({
            priceText: `เธฟ${price.toLocaleString()}`,
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
                "เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”",
                error instanceof Error ? error.message : "เธเธฃเธธเธ“เธฒเธฅเธญเธเนเธซเธกเนเธญเธตเธเธเธฃเธฑเนเธ"
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
                    เธเธณเธฅเธฑเธเธ”เธณเน€เธเธดเธเธเธฒเธฃ...
                </>
            ) : (
                <>
                    <ShoppingCart className="h-5 w-5" />
                    {maintenance?.enabled ? "ปิดปรับปรุงชั่วคราว" : disabled ? "เนเธกเนเธเธฃเนเธญเธกเธเธฒเธข" : `เธเธทเนเธญเน€เธฅเธข - เธฟ${price.toLocaleString()}`}
                </>
            )}
        </Button>
    );
}
