import { NextResponse } from "next/server";
import { getUserConversation } from "@/lib/chat";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
    const authCheck = await isAuthenticated();

    if (!authCheck.success || !authCheck.userId) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    try {
        const conversation = await getUserConversation(authCheck.userId);

        return NextResponse.json({ success: true, conversation });
    } catch (error) {
        console.error("Failed to load customer conversation:", error);
        return NextResponse.json({ success: false, message: "Failed to load conversation" }, { status: 500 });
    }
}
