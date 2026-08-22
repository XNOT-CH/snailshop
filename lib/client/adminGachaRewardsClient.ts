import { API_ROUTES } from "@/lib/constants/apiRoutes";
import { fetchWithCsrf } from "@/lib/csrf-client";

export interface AdminGachaRewardsResponse<TData = unknown> {
    success: boolean;
    data?: TData;
    message?: string;
    url?: string;
    filename?: string;
}

export interface AdminGachaRewardsResult<TData = unknown> {
    response: Response;
    data: AdminGachaRewardsResponse<TData>;
}

const JSON_HEADERS = { "Content-Type": "application/json" } as const;
const IMAGE_UPLOAD_FIELD_NAME = "file";
const REQUEST_METHODS = {
    POST: "POST",
    PUT: "PUT",
    DELETE: "DELETE",
} as const;

type AdminGachaRewardsRequestTarget = RequestInfo | URL;
type AdminGachaRewardsFetcher = (
    input: AdminGachaRewardsRequestTarget,
    init?: RequestInit,
) => Promise<Response>;

interface AdminGachaRewardsClientOptions {
    fetcher?: AdminGachaRewardsFetcher;
}

interface FetchAdminGachaRewardsOptions extends AdminGachaRewardsClientOptions {
    machineId?: string;
}

function getAdminGachaRewardsUrl(machineId?: string) {
    if (!machineId) {
        return API_ROUTES.ADMIN_GACHA_REWARDS;
    }

    return `${API_ROUTES.ADMIN_GACHA_REWARDS}?machineId=${encodeURIComponent(machineId)}`;
}

export async function parseAdminGachaRewardsResponse<TData = unknown>(
    response: Response,
): Promise<AdminGachaRewardsResponse<TData>> {
    return (await response.json()) as AdminGachaRewardsResponse<TData>;
}

async function requestAdminGachaRewards<TData = unknown>(
    endpoint: string,
    init: RequestInit,
    fetcher: AdminGachaRewardsFetcher,
): Promise<AdminGachaRewardsResult<TData>> {
    const response = await fetcher(endpoint, init);
    const data = await parseAdminGachaRewardsResponse<TData>(response);

    return { response, data };
}

export function fetchAdminGachaRewards<TData = unknown>({
    machineId,
    fetcher = fetch,
}: FetchAdminGachaRewardsOptions = {}): Promise<AdminGachaRewardsResult<TData>> {
    return requestAdminGachaRewards<TData>(
        getAdminGachaRewardsUrl(machineId),
        {},
        fetcher,
    );
}

export function createAdminGachaReward<TData = unknown>(
    payload: unknown,
    { fetcher = fetchWithCsrf }: AdminGachaRewardsClientOptions = {},
): Promise<AdminGachaRewardsResult<TData>> {
    return requestAdminGachaRewards<TData>(
        API_ROUTES.ADMIN_GACHA_REWARDS,
        {
            method: REQUEST_METHODS.POST,
            headers: JSON_HEADERS,
            body: JSON.stringify(payload),
        },
        fetcher,
    );
}

export function updateAdminGachaReward<TData = unknown>(
    id: string,
    payload: unknown,
    { fetcher = fetchWithCsrf }: AdminGachaRewardsClientOptions = {},
): Promise<AdminGachaRewardsResult<TData>> {
    return requestAdminGachaRewards<TData>(
        API_ROUTES.adminGachaReward(id),
        {
            method: REQUEST_METHODS.PUT,
            headers: JSON_HEADERS,
            body: JSON.stringify(payload),
        },
        fetcher,
    );
}

export function deleteAdminGachaReward<TData = unknown>(
    id: string,
    { fetcher = fetchWithCsrf }: AdminGachaRewardsClientOptions = {},
): Promise<AdminGachaRewardsResult<TData>> {
    return requestAdminGachaRewards<TData>(
        API_ROUTES.adminGachaReward(id),
        { method: REQUEST_METHODS.DELETE },
        fetcher,
    );
}

export function uploadAdminGachaRewardImage<TData = unknown>(
    file: Blob,
    { fetcher = fetchWithCsrf }: AdminGachaRewardsClientOptions = {},
): Promise<AdminGachaRewardsResult<TData>> {
    const formData = new FormData();
    formData.append(IMAGE_UPLOAD_FIELD_NAME, file);

    return requestAdminGachaRewards<TData>(
        API_ROUTES.ADMIN_GACHA_REWARDS_UPLOAD_IMAGE,
        {
            method: REQUEST_METHODS.POST,
            body: formData,
        },
        fetcher,
    );
}
