"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { API_ROUTES } from "@/lib/constants/apiRoutes";
import { fetchWithCsrf } from "@/lib/csrf-client";
import type { PublicCurrencySettings } from "@/lib/currencySettings";
import { OPEN_CHAT_EVENT } from "@/components/FloatingChatButtonWrapper";
import {
    fetchPurchaseBalance,
    loadPurchaseBalance,
    summarizePurchaseBalance,
} from "@/lib/prepare-purchase";
import { requirePinForAction } from "@/lib/require-pin-for-action";
import {
    showPurchaseConfirm,
    showPurchaseFailedModal,
    showPurchaseSuccessModal,
    showWarning,
} from "@/lib/swal";

export interface PurchaseProductResponse {
    success?: boolean;
    orderId?: string;
    productName?: string;
    message?: string;
    /** 409 from /api/purchase: the product has consent boxes that were not ticked. */
    requiresChecks?: boolean;
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
    /** Ids of the consent boxes ticked on the product page; the API refuses without them. */
    acceptedCheckIds?: string[];
    extraHtml?: string;
    helperText?: string;
    confirmButtonColor?: string;
    pinActionLabel?: string;
    onSuccess?: (data: PurchaseProductResponse) => void | Promise<void>;
    onError?: (error: unknown) => void | Promise<void>;
}

/** Short, readable order reference: the first block of the order UUID. */
export function formatOrderNumber(orderId: string) {
    return `#${orderId.slice(0, 8).toUpperCase()}`;
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
        acceptedCheckIds,
        extraHtml,
        helperText = "ระบบจะซื้อเฉพาะสินค้านี้เท่านั้น สินค้าในตะกร้าจะยังอยู่เหมือนเดิม",
        confirmButtonColor,
        pinActionLabel = "ยืนยัน PIN เพื่อซื้อสินค้า",
        onSuccess,
        onError,
    }: PurchaseProductOptions) => {
        const balanceCheck = await loadPurchaseBalance({ router, currency });
        if (!balanceCheck.allowed) return false;

        const balance = summarizePurchaseBalance(balanceCheck.balance, amount, currency, currencySettings);
        if (balance.insufficient && !balance.canTopup) {
            await showPurchaseFailedModal({
                message: `${balance.balanceLabel}ไม่พอ ขาดอีก ${balance.shortfallText}`,
                showTopupButton: false,
            });
            return false;
        }

        const confirmed = await showPurchaseConfirm({
            productName,
            priceText,
            extraHtml,
            helperText,
            confirmButtonColor,
            balance,
        });
        if (!confirmed) return false;
        if (balance.insufficient) {
            router.push("/dashboard/topup");
            return false;
        }

        const pinCheck = await requirePinForAction(pinActionLabel);
        if (!pinCheck.allowed) return false;

        setPurchasingId(productId);

        try {
            const response = await fetchWithCsrf(API_ROUTES.PURCHASE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId,
                    quantity,
                    promoCode,
                    acceptedCheckIds,
                    pin: pinCheck.pin ?? undefined,
                }),
            });

            const data = await response.json() as PurchaseProductResponse;

            if (data.success) {
                // Refresh before the modal, not after it closes: the page behind
                // the modal kept showing the pre-purchase stock until then.
                router.refresh();
                const remaining = await fetchPurchaseBalance(currency);
                const details = [
                    ...(data.orderId ? [{ label: "เลขออเดอร์", value: formatOrderNumber(data.orderId) }] : []),
                    ...(remaining === null
                        ? []
                        : [{
                            label: `${balance.balanceLabel}คงเหลือ`,
                            value: summarizePurchaseBalance(remaining, 0, currency, currencySettings).remainingText,
                        }]),
                ];
                const result = await showPurchaseSuccessModal({
                    productName: data.productName,
                    title: "ซื้อสำเร็จ",
                    details,
                    confirmText: "ไปดูสินค้าเลย",
                    contactText: "ทักแอดมิน",
                    cancelText: "อยู่หน้านี้",
                    showCancelButton: true,
                });
                if (result.isDenied) {
                    globalThis.dispatchEvent(new Event(OPEN_CHAT_EVENT));
                }
                if (result.isConfirmed) {
                    router.push("/dashboard/inventory");
                }
                await onSuccess?.(data);
                return true;
            }

            // Quick-buy buttons (product cards, featured lists) have nowhere to
            // show the consent boxes, so send the shopper to the product page
            // where they exist. The product page itself never gets here.
            if (data.requiresChecks) {
                showWarning(data.message ?? "สินค้านี้ต้องติ๊กยอมรับเงื่อนไขในหน้าสินค้าก่อนสั่งซื้อ");
                router.push(`/product/${productId}`);
                return false;
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
