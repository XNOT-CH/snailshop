import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, users, products, orders } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/encryption";
import { splitStock, getDelimiter } from "@/lib/stock";
import { sendEmail } from "@/lib/mail";
import { PurchaseReceiptEmail } from "@/components/emails/PurchaseReceiptEmail";

export async function POST(request: NextRequest) {
    try {
        const { productIds } = await request.json();

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return NextResponse.json({ success: false, message: "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ" }, { status: 400 });
        }

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

        // Use raw connection for FOR UPDATE locking (same as single purchase)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const conn = await (db as any).$client.getConnection();

        try {
            await conn.beginTransaction();

            // Lock and fetch all products with their secretData
            const [rows] = await conn.execute(
                `SELECT id, name, price, discountPrice, currency, isSold, secretData, stockSeparator, autoDeleteAfterSale
                 FROM Product WHERE id IN (${productIds.map(() => "?").join(",")}) FOR UPDATE`,
                productIds
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const productList = rows as any[];

            if (productList.length !== productIds.length) {
                throw new Error("บางสินค้าไม่พบในระบบ");
            }

            // Check sold
            const soldProducts = productList.filter((p) => p.isSold);
            if (soldProducts.length > 0) {
                const err: Error & { soldProductIds?: string[] } = new Error(
                    `สินค้าบางรายการถูกขายไปแล้ว: ${soldProducts.map((p) => p.name).join(", ")}`
                );
                err.soldProductIds = soldProducts.map((p) => p.id);
                throw err;
            }

            // Calculate totals
            const totalTHB = productList
                .filter((p) => p.currency === "THB" || !p.currency)
                .reduce((s, p) => s + Number(p.discountPrice ?? p.price), 0);
            const totalPoints = productList
                .filter((p) => p.currency === "POINT")
                .reduce((s, p) => s + Number(p.discountPrice ?? p.price), 0);

            if (totalTHB > 0 && Number(user.creditBalance) < totalTHB)
                throw new Error(`เครดิตไม่เพียงพอ (ต้องการ ฿${totalTHB.toLocaleString()} แต่มี ฿${Number(user.creditBalance).toLocaleString()})`);
            if (totalPoints > 0 && Number(user.pointBalance ?? 0) < totalPoints)
                throw new Error(`Point ไม่เพียงพอ (ต้องการ 💎${totalPoints.toLocaleString()} แต่มี 💎${Number(user.pointBalance ?? 0).toLocaleString()})`);

            // Process each product: decrypt → take 1 stock item → build order
            const orderResults = [];
            for (const prod of productList) {
                const decrypted = decrypt(prod.secretData || "");
                const separatorType = prod.stockSeparator || "newline";
                const stockItems = splitStock(decrypted, separatorType);

                if (stockItems.length === 0) throw new Error(`สินค้าหมดสต็อก: ${prod.name}`);

                const [givenItem, ...remaining] = stockItems;
                const delimiter = getDelimiter(separatorType);
                const remainingData = remaining.join(delimiter);
                const isLastStock = remaining.length === 0;

                const orderId = crypto.randomUUID();
                const unitPrice = Number(prod.discountPrice ?? prod.price);

                // Insert order WITH givenData (encrypted)
                await conn.execute(
                    "INSERT INTO `Order` (id, userId, totalPrice, status, givenData) VALUES (?, ?, ?, 'COMPLETED', ?)",
                    [orderId, userId, String(unitPrice), encrypt(givenItem)]
                );

                // Update product stock
                let scheduledDeleteAt: string | null = null;
                if (isLastStock && prod.autoDeleteAfterSale) {
                    const deleteAt = new Date();
                    deleteAt.setMinutes(deleteAt.getMinutes() + Number(prod.autoDeleteAfterSale));
                    scheduledDeleteAt = deleteAt.toISOString().slice(0, 19).replace("T", " ");
                }

                await conn.execute(
                    "UPDATE Product SET secretData = ?, isSold = ?, orderId = ?, scheduledDeleteAt = ? WHERE id = ?",
                    [isLastStock ? encrypt(givenItem) : encrypt(remainingData), isLastStock ? 1 : 0, orderId, scheduledDeleteAt, prod.id]
                );

                orderResults.push({
                    orderId,
                    productName: prod.name,
                    price: unitPrice,
                    currency: prod.currency || "THB",
                });
            }

            // Deduct balances
            if (totalTHB > 0) {
                await conn.execute(
                    "UPDATE User SET creditBalance = creditBalance - ? WHERE id = ?",
                    [totalTHB, userId]
                );
            }
            if (totalPoints > 0) {
                await conn.execute(
                    "UPDATE User SET pointBalance = pointBalance - ? WHERE id = ?",
                    [totalPoints, userId]
                );
            }

            await conn.commit();

            // Send email receipt async
            if (session?.user?.email) {
                void sendEmail({
                    to: session.user.email,
                    subject: `ใบเสร็จรับเงิน SnailShop - คำสั่งซื้อ ${orderResults.length} รายการ`,
                    react: PurchaseReceiptEmail({
                        userName: session?.user?.name || "ลูกค้า",
                        orderCount: orderResults.length,
                        totalTHB,
                        totalPoints,
                        items: orderResults,
                    }),
                }).catch((e) => console.error("Failed to send email:", e));
            }

            return NextResponse.json({
                success: true,
                message: "ซื้อสำเร็จ! 🎉",
                purchasedCount: orderResults.length,
                totalTHB,
                totalPoints,
                orders: orderResults,
            });

        } catch (txError) {
            await conn.rollback();
            const soldProductIds = (txError as Error & { soldProductIds?: string[] }).soldProductIds;
            return NextResponse.json(
                {
                    success: false,
                    message: txError instanceof Error ? txError.message : "เกิดข้อผิดพลาดในการซื้อ",
                    soldProductIds: soldProductIds || [],
                },
                { status: 400 }
            );
        } finally {
            conn.release();
        }

    } catch (error) {
        console.error("Cart checkout error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
