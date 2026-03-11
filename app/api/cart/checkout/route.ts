import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, users, products, orders } from "@/lib/db";
import { eq, inArray, sql } from "drizzle-orm";
import { sendEmail } from "@/lib/mail";
import { PurchaseReceiptEmail } from "@/components/emails/PurchaseReceiptEmail";

export async function POST(request: NextRequest) {
    try {
        const { productIds } = await request.json();

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return NextResponse.json({ success: false, message: "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ" }, { status: 400 });
        }

        // ✅ Limit cap: prevent oversized requests that could overload the DB
        if (productIds.length > 50) {
            return NextResponse.json({ success: false, message: "ไม่สามารถซื้อสินค้ามากกว่า 50 รายการในครั้งเดียว" }, { status: 400 });
        }

        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { id: true, creditBalance: true, pointBalance: true },
        });
        if (!user) return NextResponse.json({ success: false, message: "ไม่พบผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่" }, { status: 404 });

        const result = await db.transaction(async (tx) => {
            const productList = await tx.select({
                id: products.id,
                name: products.name,
                price: products.price,
                discountPrice: products.discountPrice,
                currency: products.currency,
                isSold: products.isSold,
            }).from(products).where(inArray(products.id, productIds));

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

            // ✅ สร้าง order records ทั้งหมดพร้อมกัน (batch) — ลด N×2 queries เหลือ 2 queries
            const orderValues = productList.map((product) => ({
                id: crypto.randomUUID(),
                userId: user.id,
                totalPrice: String(product.discountPrice ?? product.price),
                status: "COMPLETED" as const,
            }));

            // map productId → orderId เพื่อ update products ด้วย
            const productOrderMap = new Map(productList.map((p, i) => [p.id, orderValues[i].id]));

            // Batch insert: orders ทั้งหมดใน 1 query
            await tx.insert(orders).values(orderValues);

            // Batch update: products ทั้งหมดด้วย CASE WHEN (1 query)
            const caseExpr = sql.join(
                productList.map((p) => sql`WHEN ${products.id} = ${p.id} THEN ${productOrderMap.get(p.id)!}`),
                sql` `
            );
            await tx
                .update(products)
                .set({
                    isSold: true,
                    orderId: sql`CASE ${caseExpr} END`,
                })
                .where(inArray(products.id, productIds));

            // Batch update balances (เหมือนเดิม — ทำได้สูงสุด 2 queries)
            if (totalTHB > 0) {
                await tx.update(users).set({ creditBalance: sql`${users.creditBalance} - ${totalTHB}` }).where(eq(users.id, user.id));
            }
            if (totalPoints > 0) {
                await tx.update(users).set({ pointBalance: sql`${users.pointBalance} - ${totalPoints}` }).where(eq(users.id, user.id));
            }

            const orderResults = productList.map((product, i) => ({
                orderId: orderValues[i].id,
                productName: product.name,
                price: Number(product.discountPrice ?? product.price),
                currency: product.currency || "THB",
            }));

            return { orders: orderResults, totalTHB, totalPoints };
        });

        // Send an email receipt asynchronously
        if (session?.user?.email) {
            console.log("Sending receipt to:", session.user.email);
            const emailResult = await sendEmail({
                to: session.user.email,
                subject: `ใบเสร็จรับเงิน SnailShop - คำสั่งซื้อ ${result.orders.length} รายการ`,
                react: PurchaseReceiptEmail({
                    userName: session?.user?.name || "ลูกค้า",
                    orderCount: result.orders.length,
                    totalTHB: result.totalTHB,
                    totalPoints: result.totalPoints,
                    items: result.orders,
                }),
            });
            console.log("Email Result:", emailResult);
        } else {
            console.log("No user email found to send receipt");
        }

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
