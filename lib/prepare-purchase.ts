"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { requireAuthBeforePurchase } from "@/lib/require-auth-before-purchase";
import {
    formatCurrencyAmount,
    normalizeCurrencyCode,
    type PublicCurrencySettings,
} from "@/lib/currencySettings";
import { requestProfile } from "@/lib/client/accountClient";
import { showPurchaseFailedModal } from "@/lib/swal";

type PurchaseProfile = {
    creditBalance?: string | number | null;
    pointBalance?: number | string | null;
};

function getAvailableBalance(profile: PurchaseProfile, normalizedCurrency: string) {
    if (normalizedCurrency === "POINT") {
        return Number(profile.pointBalance ?? 0);
    }

    return Number(profile.creditBalance ?? 0);
}

/** Reads the shopper's balance in the product's currency, or null when it cannot. */
export async function fetchPurchaseBalance(currency?: string | null): Promise<number | null> {
    try {
        const { response, data } = await requestProfile<PurchaseProfile>({
            init: { cache: "no-store" },
        });
        if (!response.ok || !data.success || !data.data) return null;
        return getAvailableBalance(data.data as PurchaseProfile, normalizeCurrencyCode(currency));
    } catch {
        return null;
    }
}

export interface PurchaseBalanceSummary {
    /** "เครดิต" or "พอยท์" — what the price is paid from. */
    balanceLabel: string;
    deductText: string;
    remainingText: string;
    shortfallText: string;
    insufficient: boolean;
    /** Points cannot be topped up, so there is no top-up route for them. */
    canTopup: boolean;
}

export function summarizePurchaseBalance(
    balance: number,
    amount: number,
    currency?: string | null,
    currencySettings?: PublicCurrencySettings | null,
): PurchaseBalanceSummary {
    const normalizedCurrency = normalizeCurrencyCode(currency);
    const format = (value: number) => formatCurrencyAmount(value, normalizedCurrency, currencySettings ?? null);
    const insufficient = balance < amount;

    return {
        balanceLabel: normalizedCurrency === "POINT" ? "พอยท์" : "เครดิต",
        deductText: format(amount),
        remainingText: format(insufficient ? balance : balance - amount),
        shortfallText: format(insufficient ? amount - balance : 0),
        insufficient,
        canTopup: normalizedCurrency !== "POINT",
    };
}

/**
 * Signs-in check plus the balance the confirm dialog shows. Runs before the
 * confirm dialog so the shopper sees what is deducted and what is left before
 * they commit; the server still re-checks the balance inside the purchase.
 */
export async function loadPurchaseBalance({
    router,
    currency,
}: {
    router: AppRouterInstance;
    currency?: string | null;
}) {
    const authCheck = await requireAuthBeforePurchase(router);
    if (!authCheck.allowed) {
        return { allowed: false } as const;
    }

    const balance = await fetchPurchaseBalance(currency);
    if (balance === null) {
        await showPurchaseFailedModal({
            message: "ไม่สามารถตรวจสอบยอดคงเหลือได้ กรุณาลองใหม่",
            showTopupButton: false,
        });
        return { allowed: false } as const;
    }

    return { allowed: true, balance } as const;
}
