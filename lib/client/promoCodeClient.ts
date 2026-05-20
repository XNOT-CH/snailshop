import { API_ROUTES } from "@/lib/constants/apiRoutes";

export interface PromoValidationPayload {
    code: string;
    totalPrice: number;
    productCategory: string | null;
}

export type PromoValidationResponse = PromoValidationSuccessResponse | PromoValidationFailureResponse;

export interface PromoValidationSuccessResponse {
    valid: true;
    message: string;
    discount: number;
    discountType: string;
    discountAmount?: number | string | null;
    finalPrice?: number | string | null;
    maxDiscount: number | null;
    [key: string]: unknown;
}

export interface PromoValidationFailureResponse {
    valid?: false;
    message?: string;
    discountAmount?: number | string | null;
    finalPrice?: number | string | null;
    [key: string]: unknown;
}

export interface AppliedPromoFromValidation {
    code: string;
    discountAmount: number;
    finalPrice: number;
}

export interface CartPromoCategoryItem {
    currency?: string | null;
    category?: string | null;
}

type PromoValidationRequestTarget = RequestInfo | URL;
type PromoValidationFetcher = (
    input: PromoValidationRequestTarget,
    init?: RequestInit,
) => Promise<Response>;

interface BuildPromoValidationPayloadOptions {
    code: string;
    totalPrice: number;
    productCategory?: string | null;
}

interface BuildAppliedPromoOptions {
    code: string;
    data: PromoValidationResponse;
    fallbackFinalPrice: number;
}

interface ValidatePromoCodeOptions {
    fetcher?: PromoValidationFetcher;
}

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export function buildPromoValidationPayload({
    code,
    totalPrice,
    productCategory = null,
}: BuildPromoValidationPayloadOptions): PromoValidationPayload {
    return {
        code,
        totalPrice,
        productCategory,
    };
}

export function getCartPromoProductCategory(items: CartPromoCategoryItem[]): string | null {
    const categories = Array.from(
        new Set(
            items
                .filter((item) => (item.currency ?? "THB") !== "POINT")
                .map((item) => item.category)
                .filter((category): category is string => Boolean(category)),
        ),
    );

    return categories.length === 1 ? categories[0] : null;
}

export function buildAppliedPromoFromValidation({
    code,
    data,
    fallbackFinalPrice,
}: BuildAppliedPromoOptions): AppliedPromoFromValidation {
    return {
        code: code.trim().toUpperCase(),
        discountAmount: Number(data.discountAmount ?? 0),
        finalPrice: Number(data.finalPrice ?? fallbackFinalPrice),
    };
}

export async function parsePromoValidationResponse(response: Response): Promise<PromoValidationResponse> {
    return (await response.json()) as PromoValidationResponse;
}

export async function validatePromoCode(
    payload: PromoValidationPayload,
    { fetcher = fetch }: ValidatePromoCodeOptions = {},
): Promise<PromoValidationResponse> {
    const response = await fetcher(API_ROUTES.PROMO_CODE_VALIDATE, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
    });

    return parsePromoValidationResponse(response);
}
