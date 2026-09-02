import { API_ROUTES } from "@/lib/constants/apiRoutes";

export interface RecentGachaLog {
    id: string;
    tier: string;
    rewardName: string;
    rewardImageUrl: string | null;
    username: string;
    createdAt: string;
}

export interface GachaRecentResponse {
    success: boolean;
    data: RecentGachaLog[];
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
