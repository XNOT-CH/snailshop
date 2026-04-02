import { NextRequest, NextResponse } from "next/server";
import { getUserConversation, markConversationRead } from "@/lib/chat";
import { isAuthenticatedWithCsrf } from "@/lib/auth";

export async function POST(request: NextRequest) {
    const authCheck = await isAuthenticatedWithCsrf(request);

    if (!authCheck.success || !authCheck.userId) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    try {
        const conversation = await getUserConversation(authCheck.userId);
        await markConversationRead(conversation.id, "CUSTOMER");

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to mark customer conversation as read:", error);
        return NextResponse.json({ success: false, message: "Failed to update read state" }, { status: 500 });
    }
}
