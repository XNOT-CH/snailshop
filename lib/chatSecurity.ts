import { z } from "zod";
import { CHAT_MAX_MESSAGE_LENGTH } from "@/lib/chatConstraints";

const CHAT_MESSAGE_INPUT_HARD_LIMIT = CHAT_MAX_MESSAGE_LENGTH * 2;

const rawChatMessageSchema = z.object({
    message: z
        .string()
        .max(
            CHAT_MESSAGE_INPUT_HARD_LIMIT,
            `ข้อความต้องยาวไม่เกิน ${CHAT_MAX_MESSAGE_LENGTH} ตัวอักษร`
        ),
});

const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g;
const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
const HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/gi;

export function sanitizeChatText(input: string) {
    return input
        .normalize("NFKC")
        .replaceAll(/\r\n?/g, "\n")
        .replaceAll(CONTROL_CHAR_PATTERN, "")
        .replaceAll(HTML_COMMENT_PATTERN, "")
        .replaceAll(HTML_TAG_PATTERN, "")
        .replaceAll(/[^\S\n]+\n/g, "\n")
        .replaceAll(/\n[^\S\n]+/g, "\n")
        .replaceAll(/\n{4,}/g, "\n\n\n")
        .trim();
}

export function parseChatMessagePayload(input: unknown) {
    const parsed = rawChatMessageSchema.safeParse(input);

    if (!parsed.success) {
        throw new Error(`ข้อความต้องยาวไม่เกิน ${CHAT_MAX_MESSAGE_LENGTH} ตัวอักษร`);
    }

    const sanitizedMessage = sanitizeChatText(parsed.data.message);

    if (!sanitizedMessage) {
        throw new Error("กรุณาพิมพ์ข้อความก่อนส่ง");
    }

    if (sanitizedMessage.length > CHAT_MAX_MESSAGE_LENGTH) {
        throw new Error(`ข้อความต้องยาวไม่เกิน ${CHAT_MAX_MESSAGE_LENGTH} ตัวอักษร`);
    }

    return sanitizedMessage;
}
