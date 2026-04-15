import { encrypt, decrypt } from "@/lib/encryption";
import { getStockCount, splitStock } from "@/lib/stock";
import { mysqlNow } from "@/lib/utils/date";

export interface ProductPayloadInput {
    title?: string;
    price?: string | number;
    discountPrice?: string | number | null;
    image?: string | null;
    images?: string[] | null;
    category?: string;
    description?: string | null;
    secretData?: string;
    currency?: string | null;
    stockSeparator?: string | null;
    autoDeleteAfterSale?: string | number | null;
}

function normalizeProductImages(images: string[] | null | undefined, fallbackImage?: string | null) {
    const normalized = (images ?? [])
        .map((image) => image?.trim())
        .filter(Boolean) as string[];

    if (normalized.length > 0) {
        return Array.from(new Set(normalized));
    }

    if (fallbackImage?.trim()) {
        return [fallbackImage.trim()];
    }

    return [];
}

export function parseProductPrice(price: string | number) {
    const priceNumber = Number.parseFloat(String(price));
    if (Number.isNaN(priceNumber) || priceNumber <= 0) {
        return { error: "Price must be a positive number" as const };
    }

    return { value: priceNumber };
}

export function validateDiscountPrice(discountPrice: string | number | null | undefined, priceNumber: number) {
    if (discountPrice !== undefined && discountPrice !== "" && discountPrice !== null) {
        const value = Number(discountPrice);
        if (Number.isNaN(value) || value < 0) {
            return { error: "Discount price must be a positive number" as const };
        }
        if (value >= priceNumber) {
            return { error: "Discount price must be less than original price" as const };
        }

        return { value };
    }

    return { value: null };
}

export function buildProductInsertValues(input: Required<Pick<ProductPayloadInput, "title" | "category">> & ProductPayloadInput, priceNumber: number, discountPriceNumber: number | null) {
    const now = mysqlNow();
    const productImages = normalizeProductImages(input.images, input.image);

    return {
        id: crypto.randomUUID(),
        name: input.title,
        price: String(priceNumber),
        discountPrice: discountPriceNumber === null ? null : String(discountPriceNumber),
        imageUrl: productImages[0] || null,
        imageUrls: productImages,
        category: input.category,
        currency: input.currency || "THB",
        description: input.description || null,
        secretData: input.secretData ? encrypt(input.secretData) : "",
        stockSeparator: input.stockSeparator || "newline",
        isSold: false,
        autoDeleteAfterSale: input.autoDeleteAfterSale ? Number(input.autoDeleteAfterSale) : null,
        createdAt: now,
        updatedAt: now,
    };
}

export function buildProductUpdateValues(input: ProductPayloadInput, priceNumber: number, discountPriceNumber: number | null) {
    const productImages = normalizeProductImages(input.images, input.image);

    return {
        name: input.title,
        price: String(priceNumber),
        discountPrice: discountPriceNumber === null ? null : String(discountPriceNumber),
        imageUrl: productImages[0] || null,
        imageUrls: productImages,
        category: input.category,
        currency: input.currency || "THB",
        description: input.description || null,
        secretData: encrypt(input.secretData || ""),
        stockSeparator: input.stockSeparator || "newline",
        autoDeleteAfterSale: input.autoDeleteAfterSale != null && input.autoDeleteAfterSale !== ""
            ? Number(input.autoDeleteAfterSale)
            : null,
    };
}

export function decryptProductSecret(secretData: string | null | undefined) {
    return decrypt(secretData || "");
}

export function getProductStockCount(secretData: string | null | undefined, stockSeparator: string | null | undefined) {
    try {
        const decrypted = decryptProductSecret(secretData);
        return getStockCount(decrypted, stockSeparator ?? "newline");
    } catch {
        return 0;
    }
}

export function extractStockUsers(secretData: string, stockSeparator: string | null | undefined) {
    return splitStock(secretData, stockSeparator ?? "newline")
        .map((item) => item.split(" / ")[0]?.trim())
        .filter(Boolean) as string[];
}

export function extractUsersFromEncryptedStock(secretData: string, stockSeparator: string | null | undefined) {
    const decrypted = decrypt(secretData);
    return extractStockUsers(decrypted, stockSeparator);
}
