import { NextRequest, NextResponse } from "next/server";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { getAdminConversation, sendConversationMessage } from "@/lib/chat";
import { isAdminWithCsrf } from "@/lib/auth";
import { deleteChatImageFile, saveChatImageFile } from "@/lib/chatMedia";
import { buildChatImageMessageBody } from "@/lib/chatMessageContent";
import { checkChatImageUploadRateLimit, getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
    const authCheck = await isAdminWithCsrf(request);

    if (!authCheck.success || !authCheck.userId) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    let storedName: string | null = null;

    try {
        const uploadRateLimit = checkChatImageUploadRateLimit(
            `admin:${authCheck.userId}:${getClientIp(request)}`
        );

        if (uploadRateLimit.blocked) {
            return NextResponse.json(
                { success: false, message: uploadRateLimit.message ?? "Too many uploads" },
                {
                    status: 429,
                    headers: uploadRateLimit.retryAfter
                        ? { "Retry-After": String(Math.ceil(uploadRateLimit.retryAfter / 1000)) }
                        : undefined,
                }
            );
        }

        const existingConversation = await getAdminConversation(id);

        if (!existingConversation) {
            return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 });
        }

        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            throw new Error("กรุณาเลือกรูปภาพก่อนส่ง");
        }

        const savedImage = await saveChatImageFile(file);
        storedName = savedImage.storedName;

        await sendConversationMessage({
            conversationId: id,
            userId: authCheck.userId,
            senderType: "ADMIN",
            body: buildChatImageMessageBody({
                type: "image",
                storedName: savedImage.storedName,
                fileName: savedImage.fileName,
                mimeType: savedImage.mimeType,
                expiresAt: savedImage.expiresAt,
            }),
        });

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.CHAT_ADMIN_MESSAGE,
            resource: "ChatConversation",
            resourceId: id,
            details: {
                targetUserId: existingConversation.user.id,
                messageType: "IMAGE",
            },
        });

        const conversation = await getAdminConversation(id);

        return NextResponse.json({ success: true, conversation }, { status: 201 });
    } catch (error) {
        await deleteChatImageFile(storedName);
        console.error("Failed to upload admin chat image:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Failed to upload image" },
            { status: 400 }
        );
    }
}
