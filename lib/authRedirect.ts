export function normalizeCallbackUrl(value: string | null | undefined) {
    if (!value) {
        return "/";
    }

    const trimmed = value.trim();
    if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
        return "/";
    }

    return trimmed;
}
