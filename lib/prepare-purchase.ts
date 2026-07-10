"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { requireAuthBeforePurchase } from "@/lib/require-auth-before-purchase";
import { requirePinForAction } from "@/lib/require-pin-for-action";
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
        const { response, data } = await requestProfile<PurchaseProfile>({
            init: { cache: "no-store" },
        });

        if (!response.ok || !data.success || !data.data) {
            await showPurchaseFailedModal({
                message: data.message || "ไม่สามารถตรวจสอบข้อมูลบัญชีได้",
                showTopupButton: false,
            });
            return { allowed: false, pin: null } as const;
        }

        const availableBalance = getAvailableBalance(data.data as PurchaseProfile, normalizedCurrency);
        if (availableBalance < amount) {
            const requiredAmount = formatCurrencyAmount(amount, normalizedCurrency, currencySettings ?? null);
            const currentAmount = formatCurrencyAmount(availableBalance, normalizedCurrency, currencySettings ?? null);
            const balanceLabel = normalizedCurrency === "POINT" ? "พอยท์" : "ยอดเงิน";

            const { goTopup } = await showPurchaseFailedModal({
                message: `${balanceLabel}ไม่เพียงพอ (ต้องการ ${requiredAmount} แต่มี ${currentAmount})`,
                showTopupButton: normalizedCurrency !== "POINT",
            });
            if (goTopup) {
                router.push("/dashboard/topup");
            }
            return { allowed: false, pin: null } as const;
        }

        const pinCheck = await requirePinForAction(pinActionLabel);
        if (!pinCheck.allowed) {
            return { allowed: false, pin: null } as const;
        }

        return { allowed: true, pin: pinCheck.pin ?? undefined } as const;
    } catch {
        await showPurchaseFailedModal({
            message: "ไม่สามารถตรวจสอบยอดคงเหลือได้ กรุณาลองใหม่",
            showTopupButton: false,
        });
        return { allowed: false, pin: null } as const;
    }
}
