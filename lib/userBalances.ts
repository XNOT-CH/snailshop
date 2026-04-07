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
    if (costType === "CREDIT") return balances.creditBalance;
    if (costType === "POINT") return balances.pointBalance;
    if (costType === "TICKET") return balances.ticketBalance;
    return 0;
}
