import { NextRequest, NextResponse } from "next/server";
import { listAdminConversations } from "@/lib/chat";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.CHAT_VIEW);

    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    try {
        const searchParams = request?.nextUrl?.searchParams;
        const limitParam = Number(searchParams?.get("limit") ?? "");
        const result = await listAdminConversations({
            q: searchParams?.get("q"),
            cursor: searchParams?.get("cursor"),
            limit: Number.isFinite(limitParam) && limitParam > 0 ? limitParam : null,
        });

        return NextResponse.json({
            success: true,
            conversations: result.conversations,
            nextCursor: result.nextCursor,
        });
    } catch (error) {
        console.error("Failed to load admin conversations:", error);
        return NextResponse.json({ success: false, message: "Failed to load conversations" }, { status: 500 });
    }
}
