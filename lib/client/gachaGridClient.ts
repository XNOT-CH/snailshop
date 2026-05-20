import { API_ROUTES } from "@/lib/constants/apiRoutes";

export interface GridReward {
    id: string;
    tier: "common" | "rare" | "epic" | "legendary";
    rewardType: string;
    rewardName: string;
    rewardAmount: number | null;
    imageUrl: string | null;
}

export interface GachaGridRewardsResponse {
    success: boolean;
    data?: Array<GridReward | null | undefined>;
}

export interface GachaGridRollData {
    wonIndex: number;
    rewardId: string;
    rewardName: string;
    rewardType: string;
    rewardAmount: number | null;
    imageUrl: string | null;
    tier: string;
}

export interface GachaGridRollResponse {
    success: boolean;
    message?: string;
    data?: GachaGridRollData;
}

export interface GachaGridRollPayload {
    machineId: string | null;
}

type GachaGridRequestTarget = RequestInfo | URL;
type GachaGridFetcher = (
    input: GachaGridRequestTarget,
    init?: RequestInit,
) => Promise<Response>;

interface GachaGridClientOptions {
    fetcher?: GachaGridFetcher;
}

const GACHA_GRID_ROLL_REQUEST_INIT = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
} satisfies RequestInit;

export function buildGachaGridRewardsUrl(machineId?: string): string {
    return machineId
        ? `${API_ROUTES.GACHA_GRID_REWARDS}?machineId=${machineId}`
        : API_ROUTES.GACHA_GRID_REWARDS;
}

export function getPaddedGridRewards(
    rewards: Array<GridReward | null | undefined> = [],
): Array<GridReward | null> {
    const limited = rewards.filter(Boolean).slice(0, 9) as GridReward[];
    return Array.from({ length: 9 }, (_, index) => limited[index] ?? null);
}

export async function fetchGachaGridRewards(
    machineId?: string,
    { fetcher = fetch }: GachaGridClientOptions = {},
): Promise<GachaGridRewardsResponse> {
    const response = await fetcher(buildGachaGridRewardsUrl(machineId));
    return response.json() as Promise<GachaGridRewardsResponse>;
}

export function buildGachaGridRollPayload(machineId?: string): GachaGridRollPayload {
    return {
        machineId: machineId ?? null,
    };
}

export async function requestGachaGridRoll(
    payload: GachaGridRollPayload,
    { fetcher = fetch }: GachaGridClientOptions = {},
): Promise<GachaGridRollResponse> {
    const response = await fetcher(API_ROUTES.GACHA_GRID_ROLL, {
        ...GACHA_GRID_ROLL_REQUEST_INIT,
        body: JSON.stringify(payload),
    });

    return response.json() as Promise<GachaGridRollResponse>;
}
