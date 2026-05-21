import { NextResponse } from "next/server";
import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { purchaseSeasonPass } from "@/lib/seasonPassTransactions";
import { seasonPassApiError } from "@/lib/features/seasonPass/apiResponse";

export async function POST(request: Request) {
    const authCheck = await isAuthenticatedWithCsrf(request);
    const userId = authCheck.userId;

    if (!authCheck.success || !userId) {
        return seasonPassApiError(authCheck.error ?? "กรุณาเข้าสู่ระบบก่อน", { status: 401 });
    }

    const result = await purchaseSeasonPass({ userId, request });
    if (!result.ok) {
        return seasonPassApiError(result.message, { status: result.status });
    }

    return NextResponse.json(result.body, { status: result.status });
}
