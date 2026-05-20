import { API_ROUTES } from "@/lib/constants/apiRoutes";

export interface SessionStatusResponse {
    authenticated?: boolean;
    [key: string]: unknown;
}

export interface ProfileResponse<TData = unknown> {
    success?: boolean;
    message?: string;
    data?: TData;
    [key: string]: unknown;
}

type AccountRequestTarget = RequestInfo | URL;
type AccountFetcher = (input: AccountRequestTarget, init?: RequestInit) => Promise<Response>;

interface AccountRequestOptions {
    fetcher?: AccountFetcher;
}

interface ProfileRequestOptions extends AccountRequestOptions {
    init?: RequestInit;
}

export interface AccountClientResult<TData> {
    response: Response;
    data: TData;
}

const SESSION_STATUS_REQUEST_INIT = {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
} satisfies RequestInit;

export async function requestSessionStatus({
    fetcher = fetch,
}: AccountRequestOptions = {}): Promise<AccountClientResult<SessionStatusResponse>> {
    const response = await fetcher(API_ROUTES.SESSION, SESSION_STATUS_REQUEST_INIT);
    const data = (await response.json()) as SessionStatusResponse;

    return { response, data };
}

export async function requestProfile<TData = unknown>({
    fetcher = fetch,
    init,
}: ProfileRequestOptions = {}): Promise<AccountClientResult<ProfileResponse<TData>>> {
    const response = await fetcher(API_ROUTES.PROFILE, init);
    const data = (await response.json()) as ProfileResponse<TData>;

    return { response, data };
}
