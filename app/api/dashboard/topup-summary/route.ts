import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDashboardTopupSummary } from "@/lib/features/dashboard/topupSummary";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
        }

        const userRole = (session?.user as { role?: string })?.role;
        if (userRole !== "ADMIN") {
            return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
        }

        const summary = await getDashboardTopupSummary(request.nextUrl.searchParams);
        return NextResponse.json(summary);
    } catch (error) {
        console.error("Topup summary error:", error);
        return NextResponse.json(
            { success: false, message: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
