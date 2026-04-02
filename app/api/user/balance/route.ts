import { NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const authCheck = await isAuthenticated();
        if (!authCheck.success || !authCheck.userId) {
            return NextResponse.json({ success: false, message: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, authCheck.userId),
            columns: { creditBalance: true, pointBalance: true },
        });

        if (!user) {
            return NextResponse.json({ success: false, message: "ไม่พบผู้ใช้" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            creditBalance: Number(user.creditBalance ?? 0),
            pointBalance: Number(user.pointBalance ?? 0),
        });
    } catch {
        return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาด" }, { status: 503 });
    }
}
