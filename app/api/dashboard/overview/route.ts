import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, users, orders, topups } from "@/lib/db";
import { eq, and, gte, lte, sum, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

const toMySQLDatetime = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("userId")?.value;
        if (!userId) return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

        const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
        if (!user) return NextResponse.json({ success: false, message: "ไม่พบผู้ใช้งาน" }, { status: 404 });

        const dateParam = request.nextUrl.searchParams.get("date");
        const targetDate = dateParam ? new Date(dateParam) : new Date();
        const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);
        const start = toMySQLDatetime(dayStart);
        const end = toMySQLDatetime(dayEnd);

        const [{ count: purchasesOnDate }] = await db.select({ count: count() }).from(orders)
            .where(and(eq(orders.userId, user.id), gte(orders.purchasedAt, start), lte(orders.purchasedAt, end)));

        const [{ total: orderSum }] = await db.select({ total: sum(orders.totalPrice) }).from(orders)
            .where(and(eq(orders.userId, user.id), gte(orders.purchasedAt, start), lte(orders.purchasedAt, end)));

        const [{ total: topupSum }] = await db.select({ total: sum(topups.amount) }).from(topups)
            .where(and(eq(topups.userId, user.id), eq(topups.status, "APPROVED"), gte(topups.createdAt, start), lte(topups.createdAt, end)));

        return NextResponse.json({
            success: true,
            data: {
                creditBalance: Number(user.creditBalance),
                purchasesOnDate: Number(purchasesOnDate),
                totalSpending: Number(orderSum || 0),
                totalTopup: Number(topupSum || 0),
                date: dayStart.toISOString(),
            },
        });
    } catch (error) {
        console.error("Overview API error:", error);
        return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
