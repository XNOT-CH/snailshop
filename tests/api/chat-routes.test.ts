import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
    isAuthenticated: vi.fn(),
    isAuthenticatedWithCsrf: vi.fn(),
    isAdmin: vi.fn(),
    isAdminWithCsrf: vi.fn(),
}));

vi.mock("@/lib/chat", () => ({
    getUserConversation: vi.fn(),
    markConversationRead: vi.fn(),
    sendConversationMessage: vi.fn(),
    listAdminConversations: vi.fn(),
    getAdminConversation: vi.fn(),
    updateConversationStatus: vi.fn(),
    deleteConversation: vi.fn(),
    getConversationMessage: vi.fn(),
    cleanupExpiredChatImages: vi.fn(),
}));

vi.mock("@/lib/chatMedia", () => ({
    saveChatImageFile: vi.fn(),
    readChatImageFile: vi.fn(),
    deleteChatImageFile: vi.fn(),
}));

vi.mock("@/lib/chatSecurity", () => ({
    parseChatMessagePayload: vi.fn((body) => body.message),
}));

vi.mock("@/lib/rateLimit", () => ({
    checkChatMessageRateLimit: vi.fn(() => ({ blocked: false, remainingMessages: 11 })),
    checkChatImageUploadRateLimit: vi.fn(() => ({ blocked: false, remainingUploads: 7 })),
    getClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/auditLog", () => ({
    auditFromRequest: vi.fn(),
    AUDIT_ACTIONS: {
        CHAT_CUSTOMER_MESSAGE: "CHAT_CUSTOMER_MESSAGE",
        CHAT_ADMIN_MESSAGE: "CHAT_ADMIN_MESSAGE",
        CHAT_STATUS_UPDATE: "CHAT_STATUS_UPDATE",
        CHAT_DELETE: "CHAT_DELETE",
    },
}));

import { isAdmin, isAdminWithCsrf, isAuthenticated, isAuthenticatedWithCsrf } from "@/lib/auth";
import {
    cleanupExpiredChatImages,
    getAdminConversation,
    deleteConversation,
    getUserConversation,
    listAdminConversations,
    markConversationRead,
    sendConversationMessage,
    updateConversationStatus,
} from "@/lib/chat";
import { saveChatImageFile } from "@/lib/chatMedia";
import { parseChatMessagePayload } from "@/lib/chatSecurity";
import { checkChatImageUploadRateLimit, checkChatMessageRateLimit } from "@/lib/rateLimit";

describe("API: customer chat routes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (checkChatMessageRateLimit as any).mockReturnValue({ blocked: false, remainingMessages: 11 });
        (checkChatImageUploadRateLimit as any).mockReturnValue({ blocked: false, remainingUploads: 7 });
        (parseChatMessagePayload as any).mockImplementation((body: { message: string }) => body.message);
    });

    it("GET /api/chat/conversation returns 401 when not authenticated", async () => {
        (isAuthenticated as any).mockResolvedValue({ success: false, error: "Unauthorized" });
        const { GET } = await import("@/app/api/chat/conversation/route");
        const response = await GET();
        expect(response.status).toBe(401);
    });

    it("GET /api/chat/conversation returns conversation", async () => {
        (isAuthenticated as any).mockResolvedValue({ success: true, userId: "u1" });
        (getUserConversation as any).mockResolvedValue({ id: "c1", status: "OPEN", messages: [] });
        const { GET } = await import("@/app/api/chat/conversation/route");
        const response = await GET();
        expect(response.status).toBe(200);
        expect(markConversationRead).not.toHaveBeenCalled();
    });

    it("POST /api/chat/read marks the customer conversation as read", async () => {
        (isAuthenticatedWithCsrf as any).mockResolvedValue({ success: true, userId: "u1" });
        (getUserConversation as any).mockResolvedValue({ id: "c1", status: "OPEN", messages: [] });
        const { POST } = await import("@/app/api/chat/read/route");
        const request = new NextRequest("http://localhost/api/chat/read", {
            method: "POST",
        });
        const response = await POST(request);
        expect(response.status).toBe(200);
        expect(markConversationRead).toHaveBeenCalledWith("c1", "CUSTOMER");
    });

    it("POST /api/chat/messages sends a customer message", async () => {
        (isAuthenticatedWithCsrf as any).mockResolvedValue({ success: true, userId: "u1" });
        (sendConversationMessage as any).mockResolvedValue("c1");
        (getUserConversation as any).mockResolvedValue({ id: "c1", status: "OPEN", messages: [{ id: "m1" }] });
        const { POST } = await import("@/app/api/chat/messages/route");
        const request = new NextRequest("http://localhost/api/chat/messages", {
            method: "POST",
            body: JSON.stringify({ message: "hello" }),
        });
        const response = await POST(request);
        expect(response.status).toBe(201);
        expect(sendConversationMessage).toHaveBeenCalledWith({
            userId: "u1",
            senderType: "CUSTOMER",
            body: "hello",
        });
    });

    it("POST /api/chat/messages returns 429 when customer message rate limit is hit", async () => {
        (isAuthenticatedWithCsrf as any).mockResolvedValue({ success: true, userId: "u1" });
        (checkChatMessageRateLimit as any).mockReturnValue({
            blocked: true,
            retryAfter: 4000,
            remainingMessages: 0,
            message: "Too many messages",
        });

        const { POST } = await import("@/app/api/chat/messages/route");
        const request = new NextRequest("http://localhost/api/chat/messages", {
            method: "POST",
            body: JSON.stringify({ message: "hello" }),
        });
        const response = await POST(request);

        expect(response.status).toBe(429);
        expect(sendConversationMessage).not.toHaveBeenCalled();
    });

    it("POST /api/chat/images uploads a customer image message", async () => {
        (isAuthenticatedWithCsrf as any).mockResolvedValue({ success: true, userId: "u1" });
        (saveChatImageFile as any).mockResolvedValue({
            storedName: "chat.png",
            fileName: "chat.png",
            mimeType: "image/png",
            expiresAt: "2026-04-03T10:05:00.000Z",
        });
        (sendConversationMessage as any).mockResolvedValue("c1");
        (getUserConversation as any).mockResolvedValue({ id: "c1", status: "OPEN", messages: [{ id: "m1" }] });

        const { POST } = await import("@/app/api/chat/images/route");
        const formData = new FormData();
        formData.append("file", new File(["image"], "chat.png", { type: "image/png" }));
        const request = {
            formData: vi.fn().mockResolvedValue(formData),
            headers: new Headers(),
        } as any;
        const response = await POST(request);

        expect(response.status).toBe(201);
        expect(saveChatImageFile).toHaveBeenCalled();
        expect(sendConversationMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: "u1",
                senderType: "CUSTOMER",
            })
        );
    });

    it("POST /api/chat/messages validates and sanitizes the customer payload", async () => {
        (isAuthenticatedWithCsrf as any).mockResolvedValue({ success: true, userId: "u1" });
        (sendConversationMessage as any).mockResolvedValue("c1");
        (getUserConversation as any).mockResolvedValue({ id: "c1", status: "OPEN", messages: [] });
        (parseChatMessagePayload as any).mockReturnValue("safe");

        const { POST } = await import("@/app/api/chat/messages/route");
        const request = new NextRequest("http://localhost/api/chat/messages", {
            method: "POST",
            body: JSON.stringify({ message: "<script>bad()</script>safe" }),
        });
        const response = await POST(request);

        expect(response.status).toBe(201);
        expect(parseChatMessagePayload).toHaveBeenCalledWith({
            message: "<script>bad()</script>safe",
        });
        expect(sendConversationMessage).toHaveBeenCalledWith({
            userId: "u1",
            senderType: "CUSTOMER",
            body: "safe",
        });
    });
});

describe("API: admin chat routes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (checkChatMessageRateLimit as any).mockReturnValue({ blocked: false, remainingMessages: 11 });
        (checkChatImageUploadRateLimit as any).mockReturnValue({ blocked: false, remainingUploads: 7 });
        (parseChatMessagePayload as any).mockImplementation((body: { message: string }) => body.message);
    });

    it("GET /api/admin/chat/conversations returns 401 when not admin", async () => {
        (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
        const { GET } = await import("@/app/api/admin/chat/conversations/route");
        const response = await GET();
        expect(response.status).toBe(401);
    });

    it("GET /api/admin/chat/conversations returns conversation list", async () => {
        (isAdmin as any).mockResolvedValue({ success: true, userId: "admin-1" });
        (listAdminConversations as any).mockResolvedValue([{ id: "c1" }]);
        const { GET } = await import("@/app/api/admin/chat/conversations/route");
        const response = await GET();
        expect(response.status).toBe(200);
    });

    it("PATCH /api/admin/chat/conversations/[id] updates conversation status", async () => {
        (isAdminWithCsrf as any).mockResolvedValue({ success: true, userId: "admin-1" });
        (getAdminConversation as any)
            .mockResolvedValueOnce({ id: "c1", status: "OPEN", user: { id: "u1" } })
            .mockResolvedValueOnce({ id: "c1", status: "CLOSED", user: { id: "u1" } });
        const { PATCH } = await import("@/app/api/admin/chat/conversations/[id]/route");
        const request = new NextRequest("http://localhost/api/admin/chat/conversations/c1", {
            method: "PATCH",
            body: JSON.stringify({ status: "CLOSED" }),
        });
        const response = await PATCH(request, { params: Promise.resolve({ id: "c1" }) });
        expect(response.status).toBe(200);
        expect(updateConversationStatus).toHaveBeenCalledWith("c1", "CLOSED");
    });

    it("POST /api/admin/chat/conversations/[id]/messages sends admin reply", async () => {
        (isAdminWithCsrf as any).mockResolvedValue({ success: true, userId: "admin-1" });
        (getAdminConversation as any)
            .mockResolvedValueOnce({ id: "c1", user: { id: "u1" } })
            .mockResolvedValueOnce({ id: "c1", user: { id: "u1" }, messages: [] });
        const { POST } = await import("@/app/api/admin/chat/conversations/[id]/messages/route");
        const request = new NextRequest("http://localhost/api/admin/chat/conversations/c1/messages", {
            method: "POST",
            body: JSON.stringify({ message: "reply" }),
        });
        const response = await POST(request, { params: Promise.resolve({ id: "c1" }) });
        expect(response.status).toBe(201);
        expect(sendConversationMessage).toHaveBeenCalledWith({
            conversationId: "c1",
            userId: "admin-1",
            senderType: "ADMIN",
            body: "reply",
        });
    });

    it("POST /api/admin/chat/conversations/[id]/messages returns 429 when admin message rate limit is hit", async () => {
        (isAdminWithCsrf as any).mockResolvedValue({ success: true, userId: "admin-1" });
        (checkChatMessageRateLimit as any).mockReturnValue({
            blocked: true,
            retryAfter: 3000,
            remainingMessages: 0,
            message: "Too many messages",
        });

        const { POST } = await import("@/app/api/admin/chat/conversations/[id]/messages/route");
        const request = new NextRequest("http://localhost/api/admin/chat/conversations/c1/messages", {
            method: "POST",
            body: JSON.stringify({ message: "reply" }),
        });
        const response = await POST(request, { params: Promise.resolve({ id: "c1" }) });

        expect(response.status).toBe(429);
        expect(sendConversationMessage).not.toHaveBeenCalled();
    });

    it("POST /api/admin/chat/conversations/[id]/images uploads an admin image reply", async () => {
        (isAdminWithCsrf as any).mockResolvedValue({ success: true, userId: "admin-1" });
        (saveChatImageFile as any).mockResolvedValue({
            storedName: "admin-chat.png",
            fileName: "admin-chat.png",
            mimeType: "image/png",
            expiresAt: "2026-04-03T10:05:00.000Z",
        });
        (getAdminConversation as any)
            .mockResolvedValueOnce({ id: "c1", user: { id: "u1" } })
            .mockResolvedValueOnce({ id: "c1", user: { id: "u1" }, messages: [{ id: "m1" }] });

        const { POST } = await import("@/app/api/admin/chat/conversations/[id]/images/route");
        const formData = new FormData();
        formData.append("file", new File(["image"], "reply.png", { type: "image/png" }));
        const request = {
            formData: vi.fn().mockResolvedValue(formData),
            headers: new Headers(),
        } as any;
        const response = await POST(request, { params: Promise.resolve({ id: "c1" }) });

        expect(response.status).toBe(201);
        expect(saveChatImageFile).toHaveBeenCalled();
        expect(sendConversationMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                conversationId: "c1",
                userId: "admin-1",
                senderType: "ADMIN",
            })
        );
    });

    it("POST /api/chat/images returns 429 when upload rate limit is hit", async () => {
        (isAuthenticatedWithCsrf as any).mockResolvedValue({ success: true, userId: "u1" });
        (checkChatImageUploadRateLimit as any).mockReturnValue({
            blocked: true,
            retryAfter: 8000,
            remainingUploads: 0,
            message: "Too many uploads",
        });

        const { POST } = await import("@/app/api/chat/images/route");
        const formData = new FormData();
        formData.append("file", new File(["image"], "chat.png", { type: "image/png" }));
        const request = {
            formData: vi.fn().mockResolvedValue(formData),
            headers: new Headers(),
        } as any;
        const response = await POST(request);

        expect(response.status).toBe(429);
        expect(saveChatImageFile).not.toHaveBeenCalled();
    });

    it("POST /api/admin/chat/conversations/[id]/read marks the admin conversation as read", async () => {
        (isAdminWithCsrf as any).mockResolvedValue({ success: true, userId: "admin-1" });
        (getAdminConversation as any).mockResolvedValue({ id: "c1", user: { id: "u1" }, messages: [] });
        const { POST } = await import("@/app/api/admin/chat/conversations/[id]/read/route");
        const request = new NextRequest("http://localhost/api/admin/chat/conversations/c1/read", {
            method: "POST",
        });
        const response = await POST(request, { params: Promise.resolve({ id: "c1" }) });
        expect(response.status).toBe(200);
        expect(markConversationRead).toHaveBeenCalledWith("c1", "ADMIN");
    });

    it("DELETE /api/admin/chat/conversations/[id] deletes a conversation", async () => {
        (isAdminWithCsrf as any).mockResolvedValue({ success: true, userId: "admin-1" });
        (getAdminConversation as any).mockResolvedValue({
            id: "c1",
            user: { id: "u1" },
            messages: [{ id: "m1" }, { id: "m2" }],
        });
        const { DELETE } = await import("@/app/api/admin/chat/conversations/[id]/route");
        const request = new NextRequest("http://localhost/api/admin/chat/conversations/c1", {
            method: "DELETE",
        });
        const response = await DELETE(request, { params: Promise.resolve({ id: "c1" }) });
        expect(response.status).toBe(200);
        expect(deleteConversation).toHaveBeenCalledWith("c1");
    });

    it("GET /api/admin/chat/cleanup-expired-images/run cleans up expired chat images", async () => {
        (cleanupExpiredChatImages as any).mockResolvedValue({ deletedFiles: 2 });
        const { GET } = await import("@/app/api/admin/chat/cleanup-expired-images/run/route");
        const response = await GET(
            new NextRequest("http://localhost/api/admin/chat/cleanup-expired-images/run")
        );
        expect(response.status).toBe(200);
    });
});
