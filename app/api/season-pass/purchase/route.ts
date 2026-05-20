import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { purchaseSeasonPass } from "@/lib/seasonPassTransactions";
import { seasonPassApiError } from "@/lib/features/seasonPass/apiResponse";

export async function POST(request?: Request) {
    const authCheck = request
        ? await isAuthenticatedWithCsrf(request)
        : await auth().then((session) => ({
            success: Boolean(session?.user?.id),
            userId: session?.user?.id,
            error: "กรุณาเข้าสู่ระบบก่อน",
        }));
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
