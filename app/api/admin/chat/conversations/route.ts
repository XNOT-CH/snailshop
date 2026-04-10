import { NextResponse } from "next/server";
import { listAdminConversations } from "@/lib/chat";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET() {
    const authCheck = await requirePermission(PERMISSIONS.CHAT_VIEW);

    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    try {
        const conversations = await listAdminConversations();
        return NextResponse.json({ success: true, conversations });
    } catch (error) {
        console.error("Failed to load admin conversations:", error);
        return NextResponse.json({ success: false, message: "Failed to load conversations" }, { status: 500 });
    }
}
