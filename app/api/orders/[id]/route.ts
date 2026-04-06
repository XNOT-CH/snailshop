import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, orders } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import {
    findOwnedOrderById,
    findOwnedOrderWithProductById,
} from "@/lib/features/orders/queries";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/orders/[id]
 * Returns a single order only when it belongs to the authenticated user.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ success: false, message: "เธเธฃเธธเธ“เธฒเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธเนเธญเธ" }, { status: 401 });
        }

        const { id } = await params;
        const order = await findOwnedOrderWithProductById(id, userId);

        // Return 404 for both "not found" and "not your order" to prevent ID enumeration.
        if (!order || !order.product) {
            return NextResponse.json({ success: false, message: "เนเธกเนเธเธเธฃเธฒเธขเธเธฒเธฃเธเธตเน" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: order.id,
                title: order.product.name,
                image: order.product.imageUrl || "/placeholder.jpg",
                date: order.purchasedAt,
                price: Number(order.totalPrice),
                status: order.status,
                secretData: order.givenData ? decrypt(order.givenData) : null,
            },
        });
    } catch (error) {
        console.error("[ORDER_GET]", error);
        return NextResponse.json({ success: false, message: "เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”" }, { status: 500 });
    }
}

/**
 * DELETE /api/orders/[id]
 * Allows the authenticated user to delete (hide) one of their own orders from their inventory.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ success: false, message: "เธเธฃเธธเธ“เธฒเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธเนเธญเธ" }, { status: 401 });
        }

        const { id } = await params;
        const order = await findOwnedOrderById(id, userId);

        // Return 404 for both "not found" and "not your order" to prevent ID enumeration.
        if (!order) {
            return NextResponse.json({ success: false, message: "เนเธกเนเธเธเธฃเธฒเธขเธเธฒเธฃเธเธตเน" }, { status: 404 });
        }

        await db.delete(orders).where(and(eq(orders.id, id), eq(orders.userId, userId)));

        return NextResponse.json({ success: true, message: "เธฅเธเธฃเธฒเธขเธเธฒเธฃเน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง" });
    } catch (error) {
        console.error("[ORDER_DELETE]", error);
        return NextResponse.json({ success: false, message: "เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”" }, { status: 500 });
    }
}
