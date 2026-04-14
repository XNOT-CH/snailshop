import { getPointCurrencyName, type PublicCurrencySettings } from "@/lib/currencySettings";

const COST_TYPE_ALIASES: Record<string, "FREE" | "CREDIT" | "POINT" | "TICKET"> = {
    FREE: "FREE",
    CREDIT: "CREDIT",
    POINT: "POINT",
    TICKET: "TICKET",
    credits: "CREDIT",
    credit: "CREDIT",
    points: "POINT",
    point: "POINT",
    tickets: "TICKET",
    ticket: "TICKET",
    free: "FREE",
    ฟรี: "FREE",
    เครดิต: "CREDIT",
    พอยต์: "POINT",
    พ้อยท์: "POINT",
    ตั๋วสุ่ม: "TICKET",
    ตั๋ว: "TICKET",
};

export type GachaCostType = "FREE" | "CREDIT" | "POINT" | "TICKET";

export function normalizeGachaCostType(value: unknown): GachaCostType {
    if (typeof value !== "string") {
        return "FREE";
    }

    const normalized = value.trim();
    return COST_TYPE_ALIASES[normalized] ?? COST_TYPE_ALIASES[normalized.toUpperCase()] ?? "FREE";
}

export function normalizeGachaCostAmount(costType: unknown, costAmount: unknown): number {
    const normalizedCostType = normalizeGachaCostType(costType);
    if (normalizedCostType === "FREE") {
        return 0;
    }

    const amount = Number(costAmount ?? 0);
    if (!Number.isFinite(amount) || amount < 0) {
        return 0;
    }

    return amount;
}

export function normalizeGachaCost(costType: unknown, costAmount: unknown) {
    const normalizedCostType = normalizeGachaCostType(costType);

    return {
        costType: normalizedCostType,
        costAmount: normalizeGachaCostAmount(normalizedCostType, costAmount),
    };
}

export function getGachaCostLabel(
    costType: unknown,
    settings?: Partial<PublicCurrencySettings> | null,
) {
    const normalizedCostType = normalizeGachaCostType(costType);

    if (normalizedCostType === "CREDIT") return "เครดิต";
    if (normalizedCostType === "POINT") return getPointCurrencyName(settings);
    if (normalizedCostType === "TICKET") return "ตั๋วสุ่ม";
    return "ฟรี";
}

export function getGachaRewardTypeLabel(
    rewardType: unknown,
    settings?: Partial<PublicCurrencySettings> | null,
) {
    if (rewardType === "CREDIT") return "เครดิต";
    if (rewardType === "POINT") return getPointCurrencyName(settings);
    if (rewardType === "TICKET") return "ตั๋วสุ่ม";
    return "รางวัล";
}
