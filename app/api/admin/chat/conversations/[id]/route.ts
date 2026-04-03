import { NextRequest, NextResponse } from "next/server";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { deleteConversation, getAdminConversation, updateConversationAdminMeta, updateConversationStatus } from "@/lib/chat";
import { sanitizeChatTags } from "@/lib/chatAdmin";
import { isAdmin, isAdminWithCsrf } from "@/lib/auth";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
    const authCheck = await isAdmin();

    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        const conversation = await getAdminConversation(id);

        if (!conversation) {
            return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, conversation });
    } catch (error) {
        console.error("Failed to load admin conversation:", error);
        return NextResponse.json({ success: false, message: "Failed to load conversation" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    const authCheck = await isAdminWithCsrf(request);

    if (!authCheck.success || !authCheck.userId) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        const body = await request.json();
        const existingConversation = await getAdminConversation(id);

        if (!existingConversation) {
            return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 });
        }

        const nextStatus = body?.status === undefined
            ? existingConversation.status
            : (body.status === "CLOSED" ? "CLOSED" : "OPEN");
        const nextPinned = typeof body?.isPinned === "boolean" ? body.isPinned : existingConversation.isPinned;
        const nextTags = body?.tags === undefined ? existingConversation.tags : sanitizeChatTags(body.tags);

        if (nextStatus !== existingConversation.status) {
            await updateConversationStatus(id, nextStatus);
            await auditFromRequest(request, {
                userId: authCheck.userId,
                action: AUDIT_ACTIONS.CHAT_STATUS_UPDATE,
                resource: "ChatConversation",
                resourceId: id,
                details: {
                    previousStatus: existingConversation.status,
                    newStatus: nextStatus,
                },
            });
        }

        if (nextPinned !== existingConversation.isPinned || JSON.stringify(nextTags) !== JSON.stringify(existingConversation.tags)) {
            await updateConversationAdminMeta(id, {
                isPinned: nextPinned,
                tags: nextTags,
            });
        }

        if (nextPinned !== existingConversation.isPinned) {
            await auditFromRequest(request, {
                userId: authCheck.userId,
                action: AUDIT_ACTIONS.CHAT_PIN_UPDATE,
                resource: "ChatConversation",
                resourceId: id,
                details: {
                    previousPinned: existingConversation.isPinned,
                    newPinned: nextPinned,
                },
            });
        }

        if (JSON.stringify(nextTags) !== JSON.stringify(existingConversation.tags)) {
            await auditFromRequest(request, {
                userId: authCheck.userId,
                action: AUDIT_ACTIONS.CHAT_TAGS_UPDATE,
                resource: "ChatConversation",
                resourceId: id,
                details: {
                    previousTags: existingConversation.tags,
                    newTags: nextTags,
                },
            });
        }

        const conversation = await getAdminConversation(id);

        return NextResponse.json({ success: true, conversation });
    } catch (error) {
        console.error("Failed to update conversation status:", error);
        return NextResponse.json({ success: false, message: "Failed to update conversation" }, { status: 400 });
    }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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

        await deleteConversation(id);
        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.CHAT_DELETE,
            resource: "ChatConversation",
            resourceId: id,
            details: {
                conversationUserId: existingConversation.user.id,
                deletedMessageCount: existingConversation.messages.length,
            },
        });

        return NextResponse.json({ success: true, deletedId: id });
    } catch (error) {
        console.error("Failed to delete conversation:", error);
        return NextResponse.json({ success: false, message: "Failed to delete conversation" }, { status: 400 });
    }
}
