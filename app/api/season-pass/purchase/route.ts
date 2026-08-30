import { NextResponse } from "next/server";
import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { purchaseSeasonPass } from "@/lib/seasonPassTransactions";
import { seasonPassApiError } from "@/lib/features/seasonPass/apiResponse";
import { checkSeasonPassRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
    const authCheck = await isAuthenticatedWithCsrf(request);
    const userId = authCheck.userId;

    if (!authCheck.success || !userId) {
        return seasonPassApiError(authCheck.error ?? "กรุณาเข้าสู่ระบบก่อน", { status: 401 });
    }

    // Throttle like the other money endpoints (purchase/topup/gacha) — this was
    // the only credit-spending route without a rate limit.
    const rateLimit = await checkSeasonPassRateLimit(`${getClientIp(request)}:${userId}:purchase`);
    if (rateLimit.blocked) {
        return seasonPassApiError("ทำรายการถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง", { status: 429 });
    }

    const result = await purchaseSeasonPass({ userId, request });
    if (!result.ok) {
        return seasonPassApiError(result.message, { status: result.status });
    }

    return NextResponse.json(result.body, { status: result.status });
}
