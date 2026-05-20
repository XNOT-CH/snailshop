import { API_ROUTES } from "@/lib/constants/apiRoutes";

export interface RecentGachaLog {
    id: string;
    tier: string;
    rewardName: string;
    rewardImageUrl: string | null;
    username: string;
    createdAt: string;
}

export interface GachaHistoryLog {
    id: string;
    tier: string;
    rewardName: string;
    rewardImageUrl: string | null;
    costType: string;
    costAmount: number;
    createdAt: string;
}

export interface GachaHistoryStats {
    todayCount: number;
    totalCount: number;
    topTier: string | null;
}

export interface GachaRecentResponse {
    success: boolean;
    data: RecentGachaLog[];
}

export interface GachaHistoryResponse {
    success: boolean;
    data: {
        logs: GachaHistoryLog[];
        stats: GachaHistoryStats;
    };
}

type GachaActivityRequestTarget = RequestInfo | URL;
type GachaActivityFetcher = (
    input: GachaActivityRequestTarget,
    init?: RequestInit,
) => Promise<Response>;

interface GachaActivityClientOptions {
    fetcher?: GachaActivityFetcher;
}

export async function fetchGachaRecentActivity(
    { fetcher = fetch }: GachaActivityClientOptions = {},
): Promise<GachaRecentResponse> {
    const response = await fetcher(API_ROUTES.GACHA_RECENT);
    if (!response.ok) throw new Error("Failed to fetch recent logs");

    return response.json() as Promise<GachaRecentResponse>;
}

export async function fetchGachaHistoryActivity(
    { fetcher = fetch }: GachaActivityClientOptions = {},
): Promise<GachaHistoryResponse | null> {
    const response = await fetcher(API_ROUTES.GACHA_HISTORY);
    if (!response.ok) return null;

    return response.json() as Promise<GachaHistoryResponse>;
}
