"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { requireAuthBeforePurchase } from "@/lib/require-auth-before-purchase";
import { requirePinForAction } from "@/lib/require-pin-for-action";
import {
    formatCurrencyAmount,
    normalizeCurrencyCode,
    type PublicCurrencySettings,
} from "@/lib/currencySettings";
import { showWarning } from "@/lib/swal";

type PurchaseProfile = {
    creditBalance?: string | number | null;
    pointBalance?: number | string | null;
};

interface PreparePurchaseParams {
    router: AppRouterInstance;
    amount: number;
    currency?: string | null;
    currencySettings?: PublicCurrencySettings | null;
    pinActionLabel: string;
}

function getAvailableBalance(profile: PurchaseProfile, normalizedCurrency: string) {
    if (normalizedCurrency === "POINT") {
        return Number(profile.pointBalance ?? 0);
    }

    return Number(profile.creditBalance ?? 0);
}

export async function preparePurchase({
    router,
    amount,
    currency,
    currencySettings,
    pinActionLabel,
}: PreparePurchaseParams) {
    const authCheck = await requireAuthBeforePurchase(router);
    if (!authCheck.allowed) {
        return { allowed: false, pin: null } as const;
    }

    const normalizedCurrency = normalizeCurrencyCode(currency);

    try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok || !data.success || !data.data) {
            showWarning(data.message || "ไม่สามารถตรวจสอบข้อมูลบัญชีได้");
            return { allowed: false, pin: null } as const;
        }

        const availableBalance = getAvailableBalance(data.data as PurchaseProfile, normalizedCurrency);
        if (availableBalance < amount) {
            const requiredAmount = formatCurrencyAmount(amount, normalizedCurrency, currencySettings ?? null);
            const currentAmount = formatCurrencyAmount(availableBalance, normalizedCurrency, currencySettings ?? null);
            const balanceLabel = normalizedCurrency === "POINT" ? "พอยท์" : "ยอดเงิน";

            showWarning(`${balanceLabel}ไม่เพียงพอ (ต้องการ ${requiredAmount} แต่มี ${currentAmount})`);
            return { allowed: false, pin: null } as const;
        }

        const pinCheck = await requirePinForAction(pinActionLabel);
        if (!pinCheck.allowed) {
            return { allowed: false, pin: null } as const;
        }

        return { allowed: true, pin: pinCheck.pin ?? undefined } as const;
    } catch {
        showWarning("ไม่สามารถตรวจสอบยอดคงเหลือได้ กรุณาลองใหม่");
        return { allowed: false, pin: null } as const;
    }
}
