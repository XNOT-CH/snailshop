export const WELCOME_STRIP_DEFAULT_SLOT_COUNT = 12;
export const WELCOME_STRIP_MAX_SLOT_COUNT = 48;
export const WELCOME_STRIP_SLOT_COUNT = WELCOME_STRIP_DEFAULT_SLOT_COUNT;

function getWelcomeStripSlotCount(value: unknown[] | null) {
    if (!value) return WELCOME_STRIP_DEFAULT_SLOT_COUNT;

    return Math.min(
        Math.max(value.length, WELCOME_STRIP_DEFAULT_SLOT_COUNT),
        WELCOME_STRIP_MAX_SLOT_COUNT,
    );
}

export function isValidWelcomeStripImageUrl(value: string) {
    const trimmed = value.trim();

    if (!trimmed) return true;
    if (trimmed.startsWith("/")) return true;

    try {
        const url = new URL(trimmed);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

export function normalizeWelcomeStripImages(value?: string | null) {
    if (!value) {
        return Array.from({ length: WELCOME_STRIP_DEFAULT_SLOT_COUNT }, () => "");
    }

    try {
        const parsed = JSON.parse(value) as unknown;

        if (!Array.isArray(parsed)) {
            return Array.from({ length: WELCOME_STRIP_DEFAULT_SLOT_COUNT }, () => "");
        }

        return Array.from({ length: getWelcomeStripSlotCount(parsed) }, (_, index) => {
            const item = parsed[index];
            return typeof item === "string" && isValidWelcomeStripImageUrl(item)
                ? item.trim()
                : "";
        });
    } catch {
        return Array.from({ length: WELCOME_STRIP_DEFAULT_SLOT_COUNT }, () => "");
    }
}

export function serializeWelcomeStripImages(images: string[]) {
    const slotCount = getWelcomeStripSlotCount(images);

    return JSON.stringify(
        Array.from({ length: slotCount }, (_, index) => {
            const value = images[index]?.trim() ?? "";
            return isValidWelcomeStripImageUrl(value) ? value : "";
        }),
    );
}

export function isValidWelcomeStripImagesJson(value?: string) {
    if (!value || value.trim() === "") return true;

    try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed)
            && parsed.length <= WELCOME_STRIP_MAX_SLOT_COUNT
            && parsed.every((item) => typeof item === "string" && isValidWelcomeStripImageUrl(item));
    } catch {
        return false;
    }
}
