export const CHAT_TAG_OPTIONS = [
    "สอบถามราคา",
    "ปัญหา",
    "ด่วน",
    "รอตอบ",
    "ติดตามผล",
] as const;

export type ChatTag = (typeof CHAT_TAG_OPTIONS)[number];

const chatTagSet = new Set<string>(CHAT_TAG_OPTIONS);

export function sanitizeChatTags(tags: unknown): ChatTag[] {
    if (!Array.isArray(tags)) {
        return [];
    }

    const normalized = tags
        .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
        .filter((tag): tag is ChatTag => Boolean(tag) && chatTagSet.has(tag));

    return [...new Set(normalized)];
}

export function normalizeQuickReplyPayload(input: unknown) {
    const data = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
    const title = typeof data.title === "string" ? data.title.trim().slice(0, 120) : "";
    const body = typeof data.body === "string" ? data.body.trim().slice(0, 5000) : "";
    const sortOrderRaw = typeof data.sortOrder === "number" ? data.sortOrder : Number(data.sortOrder ?? 0);
    const sortOrder = Number.isFinite(sortOrderRaw) ? Math.max(0, Math.min(999, Math.trunc(sortOrderRaw))) : 0;
    const isActive = data.isActive === undefined ? true : Boolean(data.isActive);

    return { title, body, sortOrder, isActive };
}
