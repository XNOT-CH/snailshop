import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, orders } from "@/lib/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";

const toMySQLDatetime = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("userId")?.value;
        if (!userId) return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

        const dateParam = request.nextUrl.searchParams.get("date");
        const targetDate = dateParam ? new Date(dateParam) : new Date();
        const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);

        const orderList = await db.query.orders.findMany({
            where: and(eq(orders.userId, userId), gte(orders.purchasedAt, toMySQLDatetime(dayStart)), lte(orders.purchasedAt, toMySQLDatetime(dayEnd))),
            with: { product: true },
            orderBy: (t, { desc }) => desc(t.purchasedAt),
            limit: 20,
        });

        const items = orderList
            .filter((o) => o.product)
            .map((order) => ({
                id: order.id,
                title: order.product!.name,
                image: order.product!.imageUrl || "/placeholder.jpg",
                date: new Date(order.purchasedAt).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }),
                price: Number(order.totalPrice),
                secretData: order.givenData ? decrypt(order.givenData) : "ไม่พบข้อมูล",
            }));

        return NextResponse.json({ success: true, data: items });
    } catch (error) {
        console.error("Purchases API error:", error);
        return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
