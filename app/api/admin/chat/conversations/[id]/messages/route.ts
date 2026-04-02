import { NextRequest, NextResponse } from "next/server";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { getAdminConversation, sendConversationMessage } from "@/lib/chat";
import { isAdminWithCsrf } from "@/lib/auth";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
    const authCheck = await isAdminWithCsrf(request);

    if (!authCheck.success || !authCheck.userId) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        const existingConversation = await getAdminConversation(id);

        if (!existingConversation) {
            return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 });
        }

        const body = await request.json();
        const message = typeof body?.message === "string" ? body.message : "";

        await sendConversationMessage({
            conversationId: id,
            userId: authCheck.userId,
            senderType: "ADMIN",
            body: message,
        });

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.CHAT_ADMIN_MESSAGE,
            resource: "ChatConversation",
            resourceId: id,
            details: {
                targetUserId: existingConversation.user.id,
            },
        });

        const conversation = await getAdminConversation(id);

        return NextResponse.json({ success: true, conversation }, { status: 201 });
    } catch (error) {
        console.error("Failed to send admin message:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Failed to send message" },
            { status: 400 }
        );
    }
}
