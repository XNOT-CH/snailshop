import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { claimSeasonPass } from "@/lib/seasonPassTransactions";

export async function POST(request: Request) {
    const authCheck = await isAuthenticatedWithCsrf(request);
    if (!authCheck.success || !authCheck.userId) {
        return NextResponse.json(
            { success: false, message: authCheck.error ?? "กรุณาเข้าสู่ระบบก่อน" },
            { status: 401 }
        );
    }

    const session = await auth();
    const userId = authCheck.userId;
    const role = session?.user?.role;

    const result = await claimSeasonPass({ userId, role, request });
    if (!result.ok) {
        return NextResponse.json({ success: false, message: result.message }, { status: result.status });
    }

    return NextResponse.json(result.body, { status: result.status });
}
