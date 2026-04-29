import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { purchaseSeasonPass } from "@/lib/seasonPassTransactions";

export async function POST(request?: Request) {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const result = await purchaseSeasonPass({ userId, request });
    if (!result.ok) {
        return NextResponse.json({ success: false, message: result.message }, { status: result.status });
    }

    return NextResponse.json(result.body, { status: result.status });
}
