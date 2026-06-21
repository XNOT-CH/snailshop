export type TopupVerifyTarget = "bank" | "truewallet";

export function parseTopupAmount(rawAmount: FormDataEntryValue | null) {
    if (typeof rawAmount !== "string" || !rawAmount.trim()) {
        return null;
    }

    const parsed = Number(rawAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

export function parseStringField(value: FormDataEntryValue | null) {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed || null;
}

export function parseVerifyTarget(value: string | null): TopupVerifyTarget {
    if (!value) {
        return "bank";
    }

    const normalized = value.trim().toLowerCase();
    return normalized === "truewallet" || normalized === "wallet" || normalized === "truemoney"
        ? "truewallet"
        : "bank";
}

export function getSlipVerifyMethod(
    qrPayload: string | null,
    base64: string | null,
    imageUrl: string | null,
) {
    if (qrPayload) {
        return "payload";
    }

    if (base64) {
        return "base64";
    }

    if (imageUrl) {
        return "url";
    }

    return "image";
}

export function decodeBase64ImageSize(base64Value: string) {
    const normalized = base64Value.includes(",")
        ? base64Value.slice(base64Value.indexOf(",") + 1)
        : base64Value;
    const sanitized = normalized.replaceAll(/\s/g, "");

    if (!sanitized || !/^[A-Za-z0-9+/=]+$/.test(sanitized)) {
        throw new Error("INVALID_BASE64");
    }

    const buffer = Buffer.from(sanitized, "base64");
    if (!buffer.length) {
        throw new Error("INVALID_BASE64");
    }

    return buffer.length;
}

export function isPrivateOrBlockedHostname(hostname: string) {
    const normalized = hostname.toLowerCase();

    if (normalized === "localhost" || normalized === "127.0.0.1") {
        return true;
    }

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)) {
        const parts = normalized.split(".").map(Number);
        const [a, b] = parts;

        if (a === 10 || a === 127 || a === 192 && b === 168) {
            return true;
        }

        if (a === 169 && b === 254) {
            return true;
        }

        if (a === 172 && b >= 16 && b <= 31) {
            return true;
        }
    }

    return false;
}

export function validatePublicImageUrl(rawUrl: string, maxLength = 2048) {
    if (rawUrl.length > maxLength) {
        throw new Error("INVALID_IMAGE_URL");
    }

    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch {
        throw new Error("INVALID_IMAGE_URL");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("INVALID_IMAGE_URL");
    }

    if (isPrivateOrBlockedHostname(parsed.hostname)) {
        throw new Error("BLOCKED_IMAGE_URL");
    }
}
