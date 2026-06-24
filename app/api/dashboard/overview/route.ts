import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, users, orders, topups } from "@/lib/db";
import { eq, and, gte, lte, sum, count, isNull } from "drizzle-orm";
import { toMySQLDatetime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { id: true, creditBalance: true },
        });
        if (!user) return NextResponse.json({ success: false, message: "ไม่พบผู้ใช้งาน" }, { status: 404 });

        const dateParam = request.nextUrl.searchParams.get("date");
        const targetDate = dateParam ? new Date(dateParam) : new Date();
        const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);
        const start = toMySQLDatetime(dayStart);
        const end = toMySQLDatetime(dayEnd);

        const orderFilter = and(eq(orders.userId, user.id), isNull(orders.deletedAt), gte(orders.purchasedAt, start), lte(orders.purchasedAt, end));

        // ✅ รวม 2 queries เป็น 1 + เรียก parallel กับ topup query
        const [[orderStats], [topupRow]] = await Promise.all([
            db.select({ cnt: count(), total: sum(orders.totalPrice) }).from(orders).where(orderFilter),
            db.select({ total: sum(topups.amount) }).from(topups)
                .where(and(eq(topups.userId, user.id), eq(topups.status, "APPROVED"), gte(topups.createdAt, start), lte(topups.createdAt, end))),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                creditBalance: Number(user.creditBalance),
                purchasesOnDate: Number(orderStats.cnt),
                totalSpending: Number(orderStats.total ?? 0),
                totalTopup: Number(topupRow.total ?? 0),
                date: dayStart.toISOString(),
            },
        });
    } catch (error) {
        console.error("Overview API error:", error);
        return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
