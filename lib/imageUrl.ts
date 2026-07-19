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
 * Builds a `/_next/image` URL for a managed upload so plain `<img>` tags and
 * metadata (favicon) get a resized/re-encoded variant instead of the raw
 * full-size file. Non-upload URLs pass through unchanged. `width` must be in
 * next.config images.deviceSizes/imageSizes and `quality` in images.qualities.
 */
export function getOptimizedUploadSrc(imageUrl: string, width: number, quality: number) {
    if (!imageUrl.startsWith("/uploads/")) {
        return imageUrl;
    }

    return `/_next/image?url=${encodeURIComponent(imageUrl)}&w=${width}&q=${quality}`;
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
