import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAdmin, isAuthenticated } from "@/lib/auth";
import { getConversationMessage } from "@/lib/chat";
import { readChatImageFile, deleteChatImageFile } from "@/lib/chatMedia";
import { parseChatImagePayload } from "@/lib/chatMessageContent";
import { chatConversations, db } from "@/lib/db";

export const runtime = "nodejs";

interface RouteContext {
    params: Promise<{ messageId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
    const adminCheck = await isAdmin();
    const authCheck = adminCheck.success ? adminCheck : await isAuthenticated();

    if (!authCheck.success || !authCheck.userId) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const { messageId } = await context.params;

    try {
        const message = await getConversationMessage(messageId);

        if (!message) {
            return NextResponse.json({ success: false, message: "Message not found" }, { status: 404 });
        }

        const conversation = await db.query.chatConversations.findFirst({
            where: eq(chatConversations.id, message.conversationId),
            columns: {
                id: true,
                userId: true,
            },
        });

        if (!conversation) {
            return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 });
        }

        if (!adminCheck.success && conversation.userId !== authCheck.userId) {
            return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
        }

        const imagePayload = parseChatImagePayload(message.body);

        if (!imagePayload) {
            return NextResponse.json({ success: false, message: "Image not found" }, { status: 404 });
        }

        if (new Date(imagePayload.expiresAt).getTime() <= Date.now()) {
            await deleteChatImageFile(imagePayload.storedName);
            return NextResponse.json({ success: false, message: "Image expired" }, { status: 410 });
        }

        const fileBuffer = await readChatImageFile(imagePayload.storedName);

        if (!fileBuffer) {
            return NextResponse.json({ success: false, message: "Image file missing" }, { status: 404 });
        }

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                "Content-Type": imagePayload.mimeType,
                "Cache-Control": "private, max-age=60, must-revalidate",
            },
        });
    } catch (error) {
        console.error("Failed to load chat image:", error);
        return NextResponse.json({ success: false, message: "Failed to load image" }, { status: 500 });
    }
}
