import { API_ROUTES } from "@/lib/constants/apiRoutes";
import { fetchWithCsrf } from "@/lib/csrf-client";
import type { GachaProductLite } from "@/lib/gachaGrid";

export type GachaRollSpin = 1 | 2 | 3;

export interface GachaRollRequestPayload {
    spin: GachaRollSpin;
    machineId?: string;
}

export interface GachaRollResponseData {
    lLabel?: string;
    rLabel?: string;
    selectorLabel?: string;
    product?: GachaProductLite;
    [key: string]: unknown;
}

export interface GachaRollResponse {
    success?: boolean;
    message?: string;
    data?: GachaRollResponseData;
    [key: string]: unknown;
}

type GachaRollRequestTarget = RequestInfo | URL;
type GachaRollFetcher = (
    input: GachaRollRequestTarget,
    init?: RequestInit,
) => Promise<Response>;

interface RequestGachaRollOptions {
    fetcher?: GachaRollFetcher;
}

const GACHA_ROLL_REQUEST_INIT = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
} satisfies RequestInit;

export function buildGachaRollPayload(
    spin: GachaRollSpin,
    machineId?: string,
): GachaRollRequestPayload {
    return { spin, machineId };
}

export async function parseGachaRollResponse(response: Response): Promise<GachaRollResponse> {
    try {
        return (await response.json()) as GachaRollResponse;
    } catch {
        return {
            success: false,
            message: response.status === 401 ? "กรุณาเข้าสู่ระบบก่อน" : "เกิดข้อผิดพลาด",
        };
    }
}

export async function requestGachaRoll(
    payload: GachaRollRequestPayload,
    { fetcher = fetchWithCsrf }: RequestGachaRollOptions = {},
): Promise<GachaRollResponse> {
    const response = await fetcher(API_ROUTES.GACHA_ROLL, {
        ...GACHA_ROLL_REQUEST_INIT,
        body: JSON.stringify(payload),
    });

    return parseGachaRollResponse(response);
}
