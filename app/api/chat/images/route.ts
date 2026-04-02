import { NextRequest, NextResponse } from "next/server";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { getUserConversation, sendConversationMessage } from "@/lib/chat";
import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { deleteChatImageFile, saveChatImageFile } from "@/lib/chatMedia";
import { buildChatImageMessageBody } from "@/lib/chatMessageContent";
import { checkChatImageUploadRateLimit, getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const authCheck = await isAuthenticatedWithCsrf(request);

    if (!authCheck.success || !authCheck.userId) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    let storedName: string | null = null;

    try {
        const uploadRateLimit = checkChatImageUploadRateLimit(
            `${authCheck.userId}:${getClientIp(request)}`
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

        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            throw new Error("กรุณาเลือกรูปภาพก่อนส่ง");
        }

        const savedImage = await saveChatImageFile(file);
        storedName = savedImage.storedName;
        const conversationId = await sendConversationMessage({
            userId: authCheck.userId,
            senderType: "CUSTOMER",
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
            action: AUDIT_ACTIONS.CHAT_CUSTOMER_MESSAGE,
            resource: "ChatConversation",
            resourceId: conversationId,
            details: {
                messageType: "IMAGE",
            },
        });

        const conversation = await getUserConversation(authCheck.userId);

        return NextResponse.json({ success: true, conversation }, { status: 201 });
    } catch (error) {
        await deleteChatImageFile(storedName);
        console.error("Failed to upload customer chat image:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Failed to upload image" },
            { status: 400 }
        );
    }
}
