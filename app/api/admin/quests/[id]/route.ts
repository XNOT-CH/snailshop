import { NextRequest, NextResponse } from "next/server";
import { requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { PERMISSIONS } from "@/lib/permissions";
import { validateBody } from "@/lib/validations/validate";
import { updateQuestSchema } from "@/lib/validations/quest";
import {
    deleteAdminQuest,
    QuestNotFoundError,
    QuestSlugTakenError,
    updateAdminQuest,
} from "@/lib/features/quests/adminQuests";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown, fallback: string) {
    if (error instanceof QuestNotFoundError) {
        return NextResponse.json({ success: false, message: error.message }, { status: 404 });
    }

    if (error instanceof QuestSlugTakenError) {
        return NextResponse.json({ success: false, message: error.message }, { status: 409 });
    }

    // deleteAdminQuest refuses to remove a quest that already paid out points.
    if (error instanceof Error && error.message.includes("ผู้รับรางวัลไปแล้ว")) {
        return NextResponse.json({ success: false, message: error.message }, { status: 409 });
    }

    console.error(fallback, error);
    return NextResponse.json({ success: false, message: fallback }, { status: 500 });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.QUEST_EDIT);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
    }

    const { id } = await context.params;
    const result = await validateBody(request, updateQuestSchema);
    if ("error" in result) {
        return result.error;
    }

    try {
        const previous = await updateAdminQuest(id, result.data);

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.QUEST_UPDATE,
            resource: "DailyQuest",
            resourceId: id,
            resourceName: result.data.title ?? previous.title,
            details: { changed: Object.keys(result.data) },
        });

        return NextResponse.json({ success: true, message: "บันทึกภารกิจแล้ว" });
    } catch (error) {
        return errorResponse(error, "ไม่สามารถบันทึกภารกิจได้");
    }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.QUEST_EDIT);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        const deleted = await deleteAdminQuest(id);

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.QUEST_DELETE,
            resource: "DailyQuest",
            resourceId: id,
            resourceName: deleted.title,
            details: { slug: deleted.slug, goalType: deleted.goalType },
        });

        return NextResponse.json({ success: true, message: "ลบภารกิจแล้ว" });
    } catch (error) {
        return errorResponse(error, "ไม่สามารถลบภารกิจได้");
    }
}
