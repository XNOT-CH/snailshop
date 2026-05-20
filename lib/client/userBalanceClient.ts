import { API_ROUTES } from "@/lib/constants/apiRoutes";
import type { UserBalances } from "@/lib/userBalances";

export interface UserBalanceResponse extends Partial<UserBalances> {
    success?: boolean;
    [key: string]: unknown;
}

type UserBalanceRequestTarget = RequestInfo | URL;
type UserBalanceFetcher = (
    input: UserBalanceRequestTarget,
    init?: RequestInit,
) => Promise<Response>;

interface FetchUserBalancesOptions {
    fetcher?: UserBalanceFetcher;
}

const USER_BALANCE_REQUEST_INIT = {
    cache: "no-store",
} satisfies RequestInit;

export function normalizeUserBalances(data: Partial<UserBalances>): UserBalances {
    return {
        creditBalance: Number(data.creditBalance ?? 0),
        pointBalance: Number(data.pointBalance ?? 0),
        ticketBalance: Number(data.ticketBalance ?? 0),
    };
}

export async function fetchUserBalances({
    fetcher = fetch,
}: FetchUserBalancesOptions = {}): Promise<UserBalances | null> {
    const response = await fetcher(API_ROUTES.USER_BALANCE, USER_BALANCE_REQUEST_INIT);
    if (!response.ok) {
        return null;
    }

    const data = (await response.json()) as UserBalanceResponse;
    if (!data.success) {
        return null;
    }

    return normalizeUserBalances(data);
}
