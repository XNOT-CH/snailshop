export function normalizeProductImageUrls(
    imageUrls: unknown,
    fallbackImageUrl?: string | null,
) {
    const values = Array.isArray(imageUrls) ? imageUrls : [];
    const normalized = values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean);

    if (normalized.length > 0) {
        return Array.from(new Set(normalized));
    }

    if (fallbackImageUrl?.trim()) {
        return [fallbackImageUrl.trim()];
    }

    return [];
}

export function getPrimaryProductImage(
    imageUrls: unknown,
    fallbackImageUrl?: string | null,
) {
    return normalizeProductImageUrls(imageUrls, fallbackImageUrl)[0] || null;
}
