import { describe, expect, it, vi } from "vitest";
import {
    buildChatImageMessageBody,
    parseChatImagePayload,
    parseChatMessageContent,
} from "@/lib/chatMessageContent";

describe("chatMessageContent", () => {
    it("parses plain text messages", () => {
        expect(parseChatMessageContent({ messageId: "m1", body: "hello" })).toEqual({
            kind: "TEXT",
            body: "hello",
            previewText: "hello",
            imageUrl: null,
            imageExpiresAt: null,
            isExpired: false,
            mediaType: null,
            storedName: null,
        });
    });

    it("parses active image payloads", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-04-03T10:00:00.000Z"));

        const body = buildChatImageMessageBody({
            type: "image",
            storedName: "chat.png",
            fileName: "chat.png",
            mimeType: "image/png",
            expiresAt: "2026-04-03T10:05:00.000Z",
        });

        expect(parseChatImagePayload(body)).toEqual({
            type: "image",
            storedName: "chat.png",
            fileName: "chat.png",
            mimeType: "image/png",
            expiresAt: "2026-04-03T10:05:00.000Z",
        });

        expect(parseChatMessageContent({ messageId: "m2", body })).toEqual({
            kind: "IMAGE",
            body: "",
            previewText: "ส่งรูปภาพ",
            imageUrl: "/api/chat/media/m2",
            imageExpiresAt: "2026-04-03T10:05:00.000Z",
            isExpired: false,
            mediaType: "image/png",
            storedName: "chat.png",
        });

        vi.useRealTimers();
    });

    it("marks expired image payloads as expired", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-04-03T10:06:00.000Z"));

        const body = buildChatImageMessageBody({
            type: "image",
            storedName: "expired.png",
            fileName: "expired.png",
            mimeType: "image/png",
            expiresAt: "2026-04-03T10:05:00.000Z",
        });

        expect(parseChatMessageContent({ messageId: "m3", body })).toEqual({
            kind: "IMAGE",
            body: "",
            previewText: "รูปภาพหมดอายุแล้ว",
            imageUrl: null,
            imageExpiresAt: "2026-04-03T10:05:00.000Z",
            isExpired: true,
            mediaType: "image/png",
            storedName: "expired.png",
        });

        vi.useRealTimers();
    });
});
