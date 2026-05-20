import { API_ROUTES } from "@/lib/constants/apiRoutes";

export interface CartRefreshLineItem {
    id: string;
    quantity?: number | null;
}

export interface CartRefreshPayload {
    items: Array<{
        productId: string;
        quantity: number;
    }>;
}

export interface RefreshedCartItem {
    id: string;
    name: string;
    price: number;
    discountPrice: number | null;
    currency: string | null;
    imageUrl: string | null;
    category: string;
    quantity: number;
    stock: number;
    requestedQuantity: number;
    availableQuantity: number;
}

export interface CartRefreshResponse {
    success?: boolean;
    message?: string;
    items?: RefreshedCartItem[];
    missingProductIds?: string[];
    soldProductIds?: string[];
    quantityAdjustedProductIds?: string[];
    [key: string]: unknown;
}

type CartRefreshRequestTarget = RequestInfo | URL;
type CartRefreshFetcher = (
    input: CartRefreshRequestTarget,
    init?: RequestInit,
) => Promise<Response>;

interface BuildCartRefreshPayloadOptions {
    items: CartRefreshLineItem[];
}

interface RefreshCartItemsOptions {
    fetcher?: CartRefreshFetcher;
}

export function buildCartRefreshPayload({
    items,
}: BuildCartRefreshPayloadOptions): CartRefreshPayload {
    return {
        items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity || 1,
        })),
    };
}

export async function parseCartRefreshResponse(response: Response): Promise<CartRefreshResponse> {
    return (await response.json()) as CartRefreshResponse;
}

export async function refreshCartItems(
    payload: CartRefreshPayload,
    { fetcher = fetch }: RefreshCartItemsOptions = {},
): Promise<CartRefreshResponse> {
    const response = await fetcher(API_ROUTES.CART_REFRESH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
    });

    return parseCartRefreshResponse(response);
}
