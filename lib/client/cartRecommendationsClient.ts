import { API_ROUTES } from "@/lib/constants/apiRoutes";

export interface CartRecommendationProduct {
    id: string;
    name: string;
    price: number;
    discountPrice?: number | null;
    currency?: string | null;
    imageUrl: string | null;
    category: string;
    isSold: boolean;
    isFeatured?: boolean;
}

export interface CartRecommendationProductInput
    extends Omit<CartRecommendationProduct, "price" | "discountPrice"> {
    price: number | string;
    discountPrice?: number | string | null;
    [key: string]: unknown;
}

export interface CartRecommendationItem {
    id: string;
    category?: string | null;
}

type CartRecommendationRequestTarget = RequestInfo | URL;
type CartRecommendationFetcher = (
    input: CartRecommendationRequestTarget,
    init?: RequestInit,
) => Promise<Response>;

interface FetchCartRecommendationOptions {
    fetcher?: CartRecommendationFetcher;
}

const CART_RECOMMENDATION_LIMIT = 4;

export function normalizeCartRecommendationProduct(
    product: CartRecommendationProductInput,
): CartRecommendationProduct {
    return {
        ...product,
        price: Number(product.price),
        discountPrice:
            product.discountPrice === null || product.discountPrice === undefined
                ? null
                : Number(product.discountPrice),
    };
}

export function getFilteredCartRecommendations(
    products: CartRecommendationProduct[],
    cartItems: CartRecommendationItem[],
    limit = CART_RECOMMENDATION_LIMIT,
): CartRecommendationProduct[] {
    const cartProductIds = new Set(cartItems.map((item) => item.id));
    const preferredCategories = new Set(
        cartItems
            .map((item) => item.category)
            .filter((category): category is string => Boolean(category)),
    );

    return products
        .filter((product) => !product.isSold && !cartProductIds.has(product.id))
        .sort((left, right) => {
            const leftPreferred = preferredCategories.has(left.category);
            const rightPreferred = preferredCategories.has(right.category);

            if (leftPreferred !== rightPreferred) {
                return leftPreferred ? -1 : 1;
            }

            const leftDiscount = (left.price ?? 0) - (left.discountPrice ?? left.price ?? 0);
            const rightDiscount = (right.price ?? 0) - (right.discountPrice ?? right.price ?? 0);
            if (leftDiscount !== rightDiscount) {
                return rightDiscount - leftDiscount;
            }

            if (Boolean(left.isFeatured) !== Boolean(right.isFeatured)) {
                return left.isFeatured ? -1 : 1;
            }

            return left.name.localeCompare(right.name);
        })
        .slice(0, limit);
}

export async function fetchCartRecommendationProducts({
    fetcher = fetch,
}: FetchCartRecommendationOptions = {}): Promise<CartRecommendationProduct[] | null> {
    const response = await fetcher(API_ROUTES.PRODUCTS_LIST, { cache: "no-store" });
    if (!response.ok) {
        return null;
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
        return null;
    }

    return data.map((product) => normalizeCartRecommendationProduct(product));
}
