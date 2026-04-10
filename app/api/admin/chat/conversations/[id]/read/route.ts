import { NextRequest, NextResponse } from "next/server";
import { getAdminConversation, markConversationRead } from "@/lib/chat";
import { requirePermissionWithCsrf } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
    const authCheck = await requirePermissionWithCsrf(_request, PERMISSIONS.CHAT_VIEW);

    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        const conversation = await getAdminConversation(id);

        if (!conversation) {
            return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 });
        }

        await markConversationRead(id, "ADMIN");

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to mark admin conversation as read:", error);
        return NextResponse.json({ success: false, message: "Failed to update read state" }, { status: 500 });
    }
}
