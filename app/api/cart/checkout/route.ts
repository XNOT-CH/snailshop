import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, users, products, orders } from "@/lib/db";
import { eq, inArray, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const { productIds } = await request.json();

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return NextResponse.json({ success: false, message: "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ" }, { status: 400 });
        }

        const cookieStore = await cookies();
        const userId = cookieStore.get("userId")?.value;
        if (!userId) return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

        const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
        if (!user) return NextResponse.json({ success: false, message: "ไม่พบผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่" }, { status: 404 });

        const result = await db.transaction(async (tx) => {
            const productList = await tx.select().from(products).where(inArray(products.id, productIds));

            if (productList.length !== productIds.length) throw new Error("บางสินค้าไม่พบในระบบ");

            const soldProducts = productList.filter((p) => p.isSold);
            if (soldProducts.length > 0) {
                const error: Error & { soldProductIds?: string[] } = new Error(
                    `สินค้าบางรายการถูกขายไปแล้ว: ${soldProducts.map((p) => p.name).join(", ")}`
                );
                error.soldProductIds = soldProducts.map((p) => p.id);
                throw error;
            }

            const thbProducts = productList.filter((p) => p.currency === "THB" || !p.currency);
            const pointProducts = productList.filter((p) => p.currency === "POINT");

            const totalTHB = thbProducts.reduce((sum, p) => sum + Number(p.discountPrice ?? p.price), 0);
            const totalPoints = pointProducts.reduce((sum, p) => sum + Number(p.discountPrice ?? p.price), 0);

            const userCreditBalance = Number(user.creditBalance);
            const userPointBalance = Number(user.pointBalance ?? 0);

            if (totalTHB > 0 && userCreditBalance < totalTHB)
                throw new Error(`เครดิตไม่เพียงพอ (ต้องการ ฿${totalTHB.toLocaleString()} แต่มี ฿${userCreditBalance.toLocaleString()})`);
            if (totalPoints > 0 && userPointBalance < totalPoints)
                throw new Error(`Point ไม่เพียงพอ (ต้องการ 💎${totalPoints.toLocaleString()} แต่มี 💎${userPointBalance.toLocaleString()})`);

            const orderResults = [];
            for (const product of productList) {
                const productPrice = product.discountPrice ?? product.price;
                const newOrderId = crypto.randomUUID();
                await tx.insert(orders).values({ id: newOrderId, userId: user.id, totalPrice: productPrice, status: "COMPLETED" });
                await tx.update(products).set({ isSold: true, orderId: newOrderId }).where(eq(products.id, product.id));
                orderResults.push({ orderId: newOrderId, productName: product.name, price: Number(productPrice), currency: product.currency || "THB" });
            }

            if (totalTHB > 0) {
                await tx.update(users).set({ creditBalance: sql`${users.creditBalance} - ${totalTHB}` }).where(eq(users.id, user.id));
            }
            if (totalPoints > 0) {
                await tx.update(users).set({ pointBalance: sql`${users.pointBalance} - ${totalPoints}` }).where(eq(users.id, user.id));
            }

            return { orders: orderResults, totalTHB, totalPoints };
        });

        return NextResponse.json({
            success: true,
            message: "ซื้อสำเร็จ! 🎉",
            purchasedCount: result.orders.length,
            totalTHB: result.totalTHB,
            totalPoints: result.totalPoints,
            orders: result.orders,
        });
    } catch (error) {
        console.error("Cart checkout error:", error);
        const soldProductIds = (error as Error & { soldProductIds?: string[] }).soldProductIds;
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการซื้อ", soldProductIds: soldProductIds || [] },
            { status: 400 }
        );
    }
}
