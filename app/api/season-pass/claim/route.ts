import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { claimSeasonPass } from "@/lib/seasonPassTransactions";

export async function POST(request: Request) {
    const session = await auth();
    const userId = session?.user?.id;
    const role = session?.user?.role;

    if (!userId) {
        return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const result = await claimSeasonPass({ userId, role, request });
    if (!result.ok) {
        return NextResponse.json({ success: false, message: result.message }, { status: result.status });
    }

    return NextResponse.json(result.body, { status: result.status });
}
