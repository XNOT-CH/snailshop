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
