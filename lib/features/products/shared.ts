import { encrypt, decrypt } from "@/lib/encryption";
import { MAX_DECIMAL_AMOUNT, roundAmount } from "@/lib/money";
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

// Snapped to satang and bounded to what DECIMAL(10,2) holds: MySQL would round
// 10.999 to 11.00 on write while the audit log and the API response kept saying
// 10.999, and anything past the column's ceiling failed with a raw driver error.
export function parseProductPrice(price: string | number) {
    const priceNumber = Number.parseFloat(String(price));
    if (Number.isNaN(priceNumber) || priceNumber <= 0) {
        return { error: "Price must be a positive number" as const };
    }

    if (priceNumber > MAX_DECIMAL_AMOUNT) {
        return { error: "ราคาต้องไม่เกิน 99,999,999.99" as const };
    }

    return { value: roundAmount(priceNumber) };
}

// Only THB and POINT are real currencies in the purchase paths. An unknown
// currency slips past the cart total (which only sums THB/POINT) and would be
// handed out without deducting any balance, so reject it at write time.
export const SUPPORTED_CURRENCIES = ["THB", "POINT"] as const;

export function validateCurrency(currency: string | null | undefined) {
    if (currency === null || currency === undefined || currency === "") {
        return null; // falls back to THB when stored
    }

    if (!SUPPORTED_CURRENCIES.includes(currency as (typeof SUPPORTED_CURRENCIES)[number])) {
        return { error: "สกุลเงินไม่ถูกต้อง (รองรับเฉพาะ THB และ POINT)" as const };
    }

    return null;
}

/**
 * POINT prices must be whole numbers: pointBalance is an INT column and the
 * purchase path deducts Math.round(totalPrice), so a fractional point price
 * would charge a different amount than the product page displays.
 */
export function validatePointCurrencyPricing(
    currency: string | null | undefined,
    priceNumber: number,
    discountPriceNumber: number | null,
) {
    if (currency !== "POINT") {
        return null;
    }

    if (!Number.isInteger(priceNumber) || (discountPriceNumber !== null && !Number.isInteger(discountPriceNumber))) {
        return { error: "ราคาสินค้าสกุลพอยต์ต้องเป็นจำนวนเต็ม" as const };
    }

    return null;
}

export function validateDiscountPrice(discountPrice: string | number | null | undefined, priceNumber: number) {
    if (discountPrice !== undefined && discountPrice !== "" && discountPrice !== null) {
        const value = roundAmount(Number(discountPrice));
        if (Number.isNaN(value) || value <= 0) {
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
    const stockSeparator = input.stockSeparator || "newline";
    const stockCount = getStockCount(input.secretData || "", stockSeparator);

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
        stockSeparator,
        stockCount,
        isSold: stockCount === 0,
        autoDeleteAfterSale: input.autoDeleteAfterSale ? Number(input.autoDeleteAfterSale) : null,
        createdAt: now,
        updatedAt: now,
    };
}

export function buildProductUpdateValues(input: ProductPayloadInput, priceNumber: number, discountPriceNumber: number | null) {
    const productImages = normalizeProductImages(input.images, input.image);
    const stockSeparator = input.stockSeparator || "newline";
    const stockCount = getStockCount(input.secretData || "", stockSeparator);

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
        stockSeparator,
        stockCount,
        isSold: stockCount === 0,
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
