import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { claimSeasonPass } from "@/lib/seasonPassTransactions";
import { seasonPassApiError } from "@/lib/features/seasonPass/apiResponse";
import { checkSeasonPassRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
    const authCheck = await isAuthenticatedWithCsrf(request);
    if (!authCheck.success || !authCheck.userId) {
        return seasonPassApiError(authCheck.error ?? "กรุณาเข้าสู่ระบบก่อน", { status: 401 });
    }

    const session = await auth();
    const userId = authCheck.userId;

    // Bound how often the locking claim transaction can run. Keyed by account as
    // well as IP so a shared connection (mobile network, net cafe) doesn't put
    // everyone behind it into one bucket.
    const rateLimit = await checkSeasonPassRateLimit(`${getClientIp(request)}:${userId}:claim`);
    if (rateLimit.blocked) {
        return seasonPassApiError("ทำรายการถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง", { status: 429 });
    }

    const role = session?.user?.role;

    const result = await claimSeasonPass({ userId, role, request });
    if (!result.ok) {
        return seasonPassApiError(result.message, { status: result.status });
    }

    return NextResponse.json(result.body, { status: result.status });
}
