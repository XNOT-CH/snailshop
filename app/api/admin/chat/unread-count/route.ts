import { NextResponse } from "next/server";
import { countAdminUnread } from "@/lib/chat";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET() {
    const authCheck = await requirePermission(PERMISSIONS.CHAT_VIEW);

    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    try {
        const unread = await countAdminUnread();

        return NextResponse.json({
            success: true,
            totalUnread: unread.totalUnread,
            unreadConversations: unread.unreadConversations,
        });
    } catch (error) {
        console.error("Failed to count unread chat messages:", error);
        return NextResponse.json({ success: false, message: "Failed to count unread messages" }, { status: 500 });
    }
}
