import { NextRequest, NextResponse } from "next/server";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { isAdmin, isAdminWithCsrf } from "@/lib/auth";
import { createChatQuickReply, listChatQuickReplies } from "@/lib/chatQuickReplies";

export async function GET() {
    const authCheck = await isAdmin();

    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    try {
        const templates = await listChatQuickReplies();
        return NextResponse.json({ success: true, templates });
    } catch (error) {
        console.error("Failed to load chat templates:", error);
        return NextResponse.json({ success: false, message: "Failed to load templates" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authCheck = await isAdminWithCsrf(request);

    if (!authCheck.success || !authCheck.userId) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const template = await createChatQuickReply(body);

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.CHAT_TEMPLATE_CREATE,
            resource: "ChatQuickReply",
            resourceId: template.id,
            details: {
                title: template.title,
            },
        });

        return NextResponse.json({ success: true, template }, { status: 201 });
    } catch (error) {
        console.error("Failed to create chat template:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Failed to create template" },
            { status: 400 }
        );
    }
}
