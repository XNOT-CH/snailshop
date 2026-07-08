import { NextResponse } from "next/server";
import { listChatAgents } from "@/lib/chat";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET() {
    const authCheck = await requirePermission(PERMISSIONS.CHAT_VIEW);

    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    try {
        const agents = await listChatAgents();

        return NextResponse.json({ success: true, agents, me: authCheck.userId ?? null });
    } catch (error) {
        console.error("Failed to load chat agents:", error);
        return NextResponse.json({ success: false, message: "Failed to load agents" }, { status: 500 });
    }
}
