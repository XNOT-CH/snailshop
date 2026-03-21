import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, orders } from "@/lib/db";
import { eq, and } from "drizzle-orm";

interface RouteParams { params: Promise<{ id: string }> }

/**
 * DELETE /api/orders/[id]
 * Allows the authenticated user to delete (hide) one of their own orders from their inventory.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

        const { id } = await params;

        // Only allow deleting orders that belong to this user
        const order = await db.query.orders.findFirst({
            where: and(eq(orders.id, id), eq(orders.userId, userId)),
        });

        if (!order) {
            return NextResponse.json({ success: false, message: "ไม่พบรายการนี้" }, { status: 404 });
        }

        await db.delete(orders).where(and(eq(orders.id, id), eq(orders.userId, userId)));

        return NextResponse.json({ success: true, message: "ลบรายการเรียบร้อยแล้ว" });
    } catch (error) {
        console.error("[ORDER_DELETE]", error);
        return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
