const CALLBACK_ORIGIN = "https://internal.local";

function safeDecode(value: string) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export function normalizeCallbackUrl(value: string | null | undefined) {
    if (!value) {
        return "/";
    }

    const trimmed = value.trim();
    if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
        return "/";
    }

    let parsed: URL;
    try {
        parsed = new URL(trimmed, CALLBACK_ORIGIN);
    } catch {
        return "/";
    }

    if (parsed.origin !== CALLBACK_ORIGIN) {
        return "/";
    }

    const decodedPathname = safeDecode(parsed.pathname);
    if (
        decodedPathname.startsWith("//") ||
        decodedPathname.startsWith("/\\") ||
        decodedPathname.includes("\\")
    ) {
        return "/";
    }

    const callbackUrl = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    const lowerCallbackUrl = callbackUrl.toLowerCase();

    if (
        lowerCallbackUrl === "/login" ||
        lowerCallbackUrl.startsWith("/login?") ||
        lowerCallbackUrl.startsWith("/login#")
    ) {
        return "/";
    }

    if (lowerCallbackUrl.startsWith("/api/auth")) {
        return "/";
    }

    return callbackUrl;
}
