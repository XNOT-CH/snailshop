import { API_ROUTES } from "@/lib/constants/apiRoutes";
import { fetchWithCsrf } from "@/lib/csrf-client";

export interface CartCheckoutLineItem {
    id: string;
    quantity?: number | null;
}

export interface CartCheckoutPayload {
    items: Array<{
        productId: string;
        quantity: number;
    }>;
    promoCode?: string;
    pin?: string;
}

export interface CartCheckoutOrder {
    productName?: string;
    [key: string]: unknown;
}

export interface CartCheckoutResponse {
    success?: boolean;
    message?: string;
    purchasedCount?: number;
    totalTHB?: number | string | null;
    totalPoints?: number | string | null;
    promoCode?: string | null;
    soldProductIds?: unknown;
    orders?: CartCheckoutOrder[];
    [key: string]: unknown;
}

type CartCheckoutRequestTarget = RequestInfo | URL;
type CartCheckoutFetcher = (
    input: CartCheckoutRequestTarget,
    init?: RequestInit,
) => Promise<Response>;

interface BuildCartCheckoutPayloadOptions {
    items: CartCheckoutLineItem[];
    promoCode?: string | null;
    pin?: string | null;
}

interface CheckoutCartOptions {
    fetcher?: CartCheckoutFetcher;
}

export function buildCartCheckoutPayload({
    items,
    promoCode,
    pin,
}: BuildCartCheckoutPayloadOptions): CartCheckoutPayload {
    return {
        items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity || 1,
        })),
        promoCode: promoCode || undefined,
        pin: pin || undefined,
    };
}

export async function parseCartCheckoutResponse(response: Response): Promise<CartCheckoutResponse> {
    return (await response.json()) as CartCheckoutResponse;
}

export async function checkoutCart(
    payload: CartCheckoutPayload,
    { fetcher = fetchWithCsrf }: CheckoutCartOptions = {},
): Promise<CartCheckoutResponse> {
    const response = await fetcher(API_ROUTES.CART_CHECKOUT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    return parseCartCheckoutResponse(response);
}

export function buildCartCheckoutSuccessLabel(
    data: CartCheckoutResponse,
    totalDisplay: string,
) {
    return data.purchasedCount === 1
        ? data.orders?.[0]?.productName
        : `${data.purchasedCount} รายการ รวม ${totalDisplay}`;
}
