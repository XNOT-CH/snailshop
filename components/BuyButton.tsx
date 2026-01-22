"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertModal } from "@/components/ui/AlertModal";
import { ShoppingCart, Loader2 } from "lucide-react";

interface BuyButtonProps {
    productId: string;
    price: number;
    disabled?: boolean;
}

export function BuyButton({ productId, price, disabled }: BuyButtonProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [alertState, setAlertState] = useState<{
        isOpen: boolean;
        description: string;
        variant: "success" | "error" | "warning" | "info";
    }>({
        isOpen: false,
        description: "",
        variant: "info",
    });

    const showAlert = (
        description: string,
        variant: "success" | "error" | "warning" | "info"
    ) => {
        setAlertState({ isOpen: true, description, variant });
    };

    const closeAlert = () => {
        setAlertState((prev) => ({ ...prev, isOpen: false }));
    };

    const handlePurchase = async () => {
        if (disabled || isLoading) return;

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
                showAlert(
                    `ซื้อ ${data.productName} สำเร็จ!`,
                    "success"
                );
                router.refresh();
            } else {
                showAlert(data.message, "warning");
            }
        } catch (error) {
            showAlert(
                error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่",
                "error"
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Button
                size="lg"
                className="mt-auto w-full gap-2 text-lg"
                disabled={disabled || isLoading}
                onClick={handlePurchase}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <ShoppingCart className="h-5 w-5" />
                        {disabled ? "Unavailable" : `Buy Now - ฿${price.toLocaleString()}`}
                    </>
                )}
            </Button>

            {/* Alert Modal */}
            <AlertModal
                isOpen={alertState.isOpen}
                onClose={closeAlert}
                description={alertState.description}
                variant={alertState.variant}
            />
        </>
    );
}
