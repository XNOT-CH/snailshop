export type ChatMessageKind = "TEXT" | "IMAGE";

export interface ChatImagePayload {
    type: "image";
    storedName: string;
    fileName: string;
    mimeType: string;
    expiresAt: string;
}

export interface ParsedChatMessageContent {
    kind: ChatMessageKind;
    body: string;
    previewText: string;
    imageUrl: string | null;
    imageExpiresAt: string | null;
    isExpired: boolean;
    mediaType: string | null;
    storedName: string | null;
}

const CHAT_IMAGE_MESSAGE_PREFIX = "__chat_image__:";

export const CHAT_IMAGE_TTL_MS = 5 * 60 * 1000;

export function buildChatImageMessageBody(payload: ChatImagePayload) {
    return `${CHAT_IMAGE_MESSAGE_PREFIX}${JSON.stringify(payload)}`;
}

export function parseChatImagePayload(body: string): ChatImagePayload | null {
    if (!body.startsWith(CHAT_IMAGE_MESSAGE_PREFIX)) {
        return null;
    }

    try {
        const payload = JSON.parse(body.slice(CHAT_IMAGE_MESSAGE_PREFIX.length)) as Partial<ChatImagePayload>;

        if (
            payload.type !== "image" ||
            typeof payload.storedName !== "string" ||
            typeof payload.fileName !== "string" ||
            typeof payload.mimeType !== "string" ||
            typeof payload.expiresAt !== "string"
        ) {
            return null;
        }

        return {
            type: "image",
            storedName: payload.storedName,
            fileName: payload.fileName,
            mimeType: payload.mimeType,
            expiresAt: payload.expiresAt,
        };
    } catch {
        return null;
    }
}

export function parseChatMessageContent(params: { messageId: string; body: string }): ParsedChatMessageContent {
    const payload = parseChatImagePayload(params.body);

    if (!payload) {
        return {
            kind: "TEXT",
            body: params.body,
            previewText: params.body,
            imageUrl: null,
            imageExpiresAt: null,
            isExpired: false,
            mediaType: null,
            storedName: null,
        };
    }

    const expiryTime = new Date(payload.expiresAt).getTime();
    const isExpired = Number.isFinite(expiryTime) ? expiryTime <= Date.now() : true;

    return {
        kind: "IMAGE",
        body: "",
        previewText: isExpired ? "รูปภาพหมดอายุแล้ว" : "ส่งรูปภาพ",
        imageUrl: isExpired ? null : `/api/chat/media/${params.messageId}`,
        imageExpiresAt: payload.expiresAt,
        isExpired,
        mediaType: payload.mimeType,
        storedName: payload.storedName,
    };
}
