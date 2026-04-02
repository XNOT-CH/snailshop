import { NextResponse } from "next/server";
import { listAdminConversations } from "@/lib/chat";
import { isAdmin } from "@/lib/auth";

export async function GET() {
    const authCheck = await isAdmin();

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
