import { NextResponse } from "next/server";
import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { claimDailyQuest } from "@/lib/features/quests/dailyQuests";

export async function POST(request: Request) {
    const authCheck = await isAuthenticatedWithCsrf(request);
    if (!authCheck.success || !authCheck.userId) {
        return NextResponse.json(
            { success: false, message: authCheck.error ?? "กรุณาเข้าสู่ระบบก่อน" },
            { status: 401 },
        );
    }

    let questId: unknown;
    try {
        ({ questId } = await request.json());
    } catch {
        return NextResponse.json({ success: false, message: "คำขอไม่ถูกต้อง" }, { status: 400 });
    }

    if (typeof questId !== "string" || questId.length === 0 || questId.length > 36) {
        return NextResponse.json({ success: false, message: "คำขอไม่ถูกต้อง" }, { status: 400 });
    }

    const result = await claimDailyQuest({ userId: authCheck.userId, questId });
    if (!result.ok) {
        return NextResponse.json({ success: false, message: result.message }, { status: result.status });
    }

    return NextResponse.json(result.body, { status: result.status });
}
