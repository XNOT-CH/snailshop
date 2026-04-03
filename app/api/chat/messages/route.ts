import { NextRequest, NextResponse } from "next/server";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { getUserConversation, sendConversationMessage } from "@/lib/chat";
import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { parseChatMessagePayload } from "@/lib/chatSecurity";
import { checkChatMessageRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
    const authCheck = await isAuthenticatedWithCsrf(request);

    if (!authCheck.success || !authCheck.userId) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    try {
        const messageRateLimit = checkChatMessageRateLimit(
            `${authCheck.userId}:${getClientIp(request)}`
        );

        if (messageRateLimit.blocked) {
            return NextResponse.json(
                { success: false, message: messageRateLimit.message ?? "Too many messages" },
                {
                    status: 429,
                    headers: messageRateLimit.retryAfter
                        ? { "Retry-After": String(Math.ceil(messageRateLimit.retryAfter / 1000)) }
                        : undefined,
                }
            );
        }

        const body = await request.json();
        const message = parseChatMessagePayload(body);

        const conversationId = await sendConversationMessage({
            userId: authCheck.userId,
            senderType: "CUSTOMER",
            body: message,
        });

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.CHAT_CUSTOMER_MESSAGE,
            resource: "ChatConversation",
            resourceId: conversationId,
        });

        const conversation = await getUserConversation(authCheck.userId);

        return NextResponse.json({ success: true, conversation }, { status: 201 });
    } catch (error) {
        console.error("Failed to send customer message:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Failed to send message" },
            { status: 400 }
        );
    }
}
