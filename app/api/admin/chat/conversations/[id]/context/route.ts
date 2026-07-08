import { NextRequest, NextResponse } from "next/server";
import { getConversationCustomerContext } from "@/lib/chat";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
    const authCheck = await requirePermission(PERMISSIONS.CHAT_VIEW);

    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        const customerContext = await getConversationCustomerContext(id);

        if (!customerContext) {
            return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, context: customerContext });
    } catch (error) {
        console.error("Failed to load chat customer context:", error);
        return NextResponse.json({ success: false, message: "Failed to load customer context" }, { status: 500 });
    }
}
