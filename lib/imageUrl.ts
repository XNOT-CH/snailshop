export function withImageVersion(imageUrl: string | null | undefined, version: string | number | null | undefined) {
    if (!imageUrl) {
        return undefined;
    }

    if (imageUrl.startsWith("/")) {
        return imageUrl;
    }

    if (version === null || version === undefined || version === "") {
        return imageUrl;
    }

    const separator = imageUrl.includes("?") ? "&" : "?";
    return `${imageUrl}${separator}v=${encodeURIComponent(String(version))}`;
}

/**
 * Managed uploads store a 640px `<name>.thumb.webp` next to the full image.
 * Returns the thumb URL for small renders (cards, tiles); callers must fall
 * back to the original via onError because images uploaded before thumbs
 * existed only have the full file.
 */
export function getThumbImageUrl(imageUrl: string | null | undefined) {
    if (
        typeof imageUrl !== "string" ||
        !imageUrl.startsWith("/uploads/") ||
        !imageUrl.endsWith(".webp") ||
        imageUrl.endsWith(".thumb.webp")
    ) {
        return imageUrl ?? null;
    }

    return imageUrl.replace(/\.webp$/, ".thumb.webp");
}
