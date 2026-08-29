import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { PERMISSIONS } from "@/lib/permissions";
import { validateBody } from "@/lib/validations/validate";
import { createQuestSchema } from "@/lib/validations/quest";
import {
    createAdminQuest,
    getQuestClaimSummary,
    listAdminQuests,
    QuestSlugTakenError,
} from "@/lib/features/quests/adminQuests";

export async function GET() {
    const authCheck = await requirePermission(PERMISSIONS.QUEST_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
    }

    try {
        const [quests, summary] = await Promise.all([listAdminQuests(), getQuestClaimSummary()]);
        return NextResponse.json({ success: true, quests, summary });
    } catch (error) {
        console.error("List quests error:", error);
        return NextResponse.json({ success: false, message: "ไม่สามารถโหลดภารกิจได้" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.QUEST_EDIT);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
    }

    const result = await validateBody(request, createQuestSchema);
    if ("error" in result) {
        return result.error;
    }

    try {
        const id = await createAdminQuest(result.data);

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.QUEST_CREATE,
            resource: "DailyQuest",
            resourceId: id,
            resourceName: result.data.title,
            details: {
                slug: result.data.slug,
                goalType: result.data.goalType,
                goalValue: result.data.goalValue,
                rewardPoints: result.data.rewardPoints,
            },
        });

        return NextResponse.json({ success: true, id, message: "เพิ่มภารกิจแล้ว" }, { status: 201 });
    } catch (error) {
        if (error instanceof QuestSlugTakenError) {
            return NextResponse.json({ success: false, message: error.message }, { status: 409 });
        }

        console.error("Create quest error:", error);
        return NextResponse.json({ success: false, message: "ไม่สามารถเพิ่มภารกิจได้" }, { status: 500 });
    }
}
