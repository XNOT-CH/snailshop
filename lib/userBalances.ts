import { normalizeGachaCostType } from "@/lib/gachaCost";

export type UserBalances = {
    creditBalance: number;
    pointBalance: number;
    ticketBalance: number;
};

export const EMPTY_USER_BALANCES: UserBalances = {
    creditBalance: 0,
    pointBalance: 0,
    ticketBalance: 0,
};

export function getBalanceByCostType(balances: UserBalances, costType: string) {
    const normalizedCostType = normalizeGachaCostType(costType);

    if (normalizedCostType === "CREDIT") return balances.creditBalance;
    if (normalizedCostType === "POINT") return balances.pointBalance;
    if (normalizedCostType === "TICKET") return balances.ticketBalance;
    return 0;
}
