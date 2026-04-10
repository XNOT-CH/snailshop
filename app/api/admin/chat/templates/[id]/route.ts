import { NextRequest, NextResponse } from "next/server";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { requirePermissionWithCsrf } from "@/lib/auth";
import { deleteChatQuickReply, updateChatQuickReply } from "@/lib/chatQuickReplies";
import { PERMISSIONS } from "@/lib/permissions";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.CHAT_MANAGE);

    if (!authCheck.success || !authCheck.userId) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        const body = await request.json();
        const template = await updateChatQuickReply(id, body);

        if (!template) {
            return NextResponse.json({ success: false, message: "Template not found" }, { status: 404 });
        }

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.CHAT_TEMPLATE_UPDATE,
            resource: "ChatQuickReply",
            resourceId: id,
            details: {
                title: template.title,
                isActive: template.isActive,
            },
        });

        return NextResponse.json({ success: true, template });
    } catch (error) {
        console.error("Failed to update chat template:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Failed to update template" },
            { status: 400 }
        );
    }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.CHAT_MANAGE);

    if (!authCheck.success || !authCheck.userId) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        await deleteChatQuickReply(id);

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.CHAT_TEMPLATE_DELETE,
            resource: "ChatQuickReply",
            resourceId: id,
        });

        return NextResponse.json({ success: true, deletedId: id });
    } catch (error) {
        console.error("Failed to delete chat template:", error);
        return NextResponse.json({ success: false, message: "Failed to delete template" }, { status: 400 });
    }
}
