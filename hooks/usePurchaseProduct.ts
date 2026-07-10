"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { API_ROUTES } from "@/lib/constants/apiRoutes";
import { fetchWithCsrf } from "@/lib/csrf-client";
import type { PublicCurrencySettings } from "@/lib/currencySettings";
import { preparePurchase } from "@/lib/prepare-purchase";
import {
    showPurchaseConfirm,
    showPurchaseFailedModal,
    showPurchaseSuccessModal,
} from "@/lib/swal";

export interface PurchaseProductResponse {
    success?: boolean;
    productName?: string;
    message?: string;
    [key: string]: unknown;
}

export interface PurchaseProductOptions {
    productId: string;
    amount: number;
    priceText: string;
    productName?: string;
    currency?: string | null;
    currencySettings?: PublicCurrencySettings | null;
    quantity?: number;
    promoCode?: string;
    extraHtml?: string;
    helperText?: string;
    confirmButtonColor?: string;
    pinActionLabel?: string;
    onSuccess?: (data: PurchaseProductResponse) => void | Promise<void>;
    onError?: (error: unknown) => void | Promise<void>;
}

export function usePurchaseProduct() {
    const router = useRouter();
    const [purchasingId, setPurchasingId] = useState<string | null>(null);

    const isPurchasing = useCallback(
        (productId: string) => purchasingId === productId,
        [purchasingId]
    );

    const purchaseProduct = useCallback(async ({
        productId,
        amount,
        priceText,
        productName,
        currency,
        currencySettings,
        quantity,
        promoCode,
        extraHtml,
        helperText = "ระบบจะซื้อเฉพาะสินค้านี้เท่านั้น สินค้าในตะกร้าจะยังอยู่เหมือนเดิม",
        confirmButtonColor,
        pinActionLabel = "ยืนยัน PIN เพื่อซื้อสินค้า",
        onSuccess,
        onError,
    }: PurchaseProductOptions) => {
        const confirmed = await showPurchaseConfirm({
            productName,
            priceText,
            extraHtml,
            helperText,
            confirmButtonColor,
        });
        if (!confirmed) return false;

        const purchaseCheck = await preparePurchase({
            router,
            amount,
            currency,
            currencySettings,
            pinActionLabel,
        });
        if (!purchaseCheck.allowed) return false;

        setPurchasingId(productId);

        try {
            const response = await fetchWithCsrf(API_ROUTES.PURCHASE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId,
                    quantity,
                    promoCode,
                    pin: purchaseCheck.pin,
                }),
            });

            const data = await response.json() as PurchaseProductResponse;

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
                await onSuccess?.(data);
                return true;
            }

            const { goTopup } = await showPurchaseFailedModal({
                message: data.message ?? "ไม่สามารถสั่งซื้อได้",
            });
            if (goTopup) {
                router.push("/dashboard/topup");
            }
            return false;
        } catch (error) {
            await onError?.(error);
            return false;
        } finally {
            setPurchasingId(null);
        }
    }, [router]);

    return {
        isPurchasing,
        purchaseProduct,
        purchasingId,
    };
}
