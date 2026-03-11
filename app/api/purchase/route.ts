import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, users, promoCodes } from "@/lib/db";
import { eq } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/encryption";
import { splitStock, getDelimiter } from "@/lib/stock";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { sendEmail } from "@/lib/mail";
import { PurchaseReceiptEmail } from "@/components/emails/PurchaseReceiptEmail";

export async function POST(request: NextRequest) {
    try {
        const { productId, quantity, promoCode } = await request.json();

        if (!productId) {
            return NextResponse.json({ success: false, message: "Product ID is required" }, { status: 400 });
        }

        const qty = typeof quantity === "number" ? quantity : 1;
        if (!Number.isFinite(qty) || qty < 1 || !Number.isInteger(qty)) {
            return NextResponse.json({ success: false, message: "Quantity must be a positive integer" }, { status: 400 });
        }

        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({ where: eq(users.id, userId) });

        if (!user) {
            return NextResponse.json({ success: false, message: "ไม่พบผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่" }, { status: 404 });
        }

        // Validate promo code if provided
        let promoData: { id: string; discountType: string; discountValue: number; maxDiscount: number | null } | null = null;
        if (promoCode && typeof promoCode === "string") {
            const promo = await db.query.promoCodes.findFirst({
                where: eq(promoCodes.code, promoCode.trim().toUpperCase()),
            });

            if (promo && promo.isActive) {
                const now = new Date();
                const startsAt = new Date(promo.startsAt);
                const expiresAt = promo.expiresAt ? new Date(promo.expiresAt) : null;
                const withinLimit = promo.usageLimit === null || promo.usedCount < promo.usageLimit;

                if (now >= startsAt && (expiresAt === null || now <= expiresAt) && withinLimit) {
                    promoData = {
                        id: promo.id,
                        discountType: promo.discountType,
                        discountValue: Number(promo.discountValue),
                        maxDiscount: promo.maxDiscount ? Number(promo.maxDiscount) : null,
                    };
                }
            }
        }

        // Drizzle mysql2 doesn't have built-in transaction method like Prisma,
        // so we use the underlying pool connection for a manual transaction
        const conn = await (db as any).$client.getConnection();
        let result: { order: { id: string }; product: { name: string; price: string; discountPrice: string | null }; finalPrice: number };

        try {
            await conn.beginTransaction();

            const [product] = await conn.execute(
                "SELECT * FROM Product WHERE id = ? FOR UPDATE",
                [productId]
            );
            const prod = (product as any[])[0];

            if (!prod) throw new Error("ไม่พบสินค้านี้ในระบบ");
            if (prod.isSold) throw new Error("สินค้านี้ถูกขายไปแล้ว");

            const unitPrice = prod.discountPrice ? Number(prod.discountPrice) : Number(prod.price);
            const userBalance = Number(user.creditBalance);
            let totalPrice = unitPrice * qty;

            // Apply promo code discount
            if (promoData) {
                let discountAmount = 0;
                if (promoData.discountType === "PERCENTAGE") {
                    discountAmount = (totalPrice * promoData.discountValue) / 100;
                    if (promoData.maxDiscount !== null && discountAmount > promoData.maxDiscount) {
                        discountAmount = promoData.maxDiscount;
                    }
                } else {
                    // FIXED amount
                    discountAmount = promoData.discountValue;
                }
                totalPrice = Math.max(0, totalPrice - discountAmount);
                totalPrice = Math.round(totalPrice * 100) / 100; // round to 2 decimal places
            }

            if (userBalance < totalPrice) {
                throw new Error(`เครดิตไม่เพียงพอ (ต้องการ ฿${totalPrice.toLocaleString()} แต่มี ฿${userBalance.toLocaleString()})`);
            }

            const decryptedData = decrypt(prod.secretData || "");
            const separatorType = prod.stockSeparator || "newline";
            const stockItems = splitStock(decryptedData, separatorType);

            if (stockItems.length === 0) throw new Error("สินค้าหมดสต็อก");
            if (stockItems.length < qty) throw new Error(`สต็อกไม่เพียงพอ (เหลือ ${stockItems.length} รายการ)`);

            const givenItems = stockItems.slice(0, qty);
            const remainingItems = stockItems.slice(qty);
            const delimiter = getDelimiter(separatorType);
            const givenJoined = givenItems.join(delimiter);
            const remainingData = remainingItems.join(delimiter);
            const isLastStock = remainingItems.length === 0;

            const orderId = crypto.randomUUID();
            await conn.execute(
                "INSERT INTO `Order` (id, userId, totalPrice, status, givenData) VALUES (?, ?, ?, 'COMPLETED', ?)",
                [orderId, user.id, totalPrice, encrypt(givenJoined)]
            );

            await conn.execute(
                "UPDATE User SET creditBalance = creditBalance - ? WHERE id = ?",
                [totalPrice, user.id]
            );

            await conn.execute(
                "UPDATE Product SET secretData = ?, isSold = ?, orderId = ? WHERE id = ?",
                [isLastStock ? encrypt(givenJoined) : encrypt(remainingData), isLastStock ? 1 : 0, orderId, productId]
            );

            // Increment promo code usage count
            if (promoData) {
                await conn.execute(
                    "UPDATE PromoCode SET usedCount = usedCount + 1 WHERE id = ?",
                    [promoData.id]
                );
            }

            await conn.commit();
            result = { order: { id: orderId }, product: prod, finalPrice: totalPrice };
        } catch (txError) {
            await conn.rollback();
            throw txError;
        } finally {
            conn.release();
        }

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.PURCHASE,
            userId: user.id,
            resource: "Order",
            resourceId: result.order.id,
            resourceName: result.product.name,
            details: {
                resourceName: result.product.name,
                productId,
                orderId: result.order.id,
                promoCode: promoData ? promoCode.trim().toUpperCase() : undefined,
                unitPrice: result.product.discountPrice ? Number(result.product.discountPrice) : Number(result.product.price),
                quantity: qty,
                totalPrice: result.finalPrice,
            },
        });

        // Send an email receipt asynchronously
        if (session?.user?.email) {
            console.log("Sending receipt to:", session.user.email);
            const emailResult = await sendEmail({
                to: session.user.email,
                subject: `ใบเสร็จรับเงิน SnailShop - สั่งซื้อสินค้า 1 รายการ`,
                react: PurchaseReceiptEmail({
                    userName: session?.user?.name || "ลูกค้า",
                    orderCount: 1,
                    totalTHB: result.finalPrice,
                    totalPoints: 0,
                    items: [
                        {
                            productName: result.product.name,
                            price: result.finalPrice,
                            currency: "THB" // Assuming THB for single purchases
                        }
                    ],
                }),
            });
            console.log("Email Result:", emailResult);
        } else {
            console.log("No user email found to send receipt");
        }

        return NextResponse.json({
            success: true,
            message: "ซื้อสำเร็จ! 🎉",
            orderId: result.order.id,
            productName: result.product.name,
        });
    } catch (error) {
        console.error("Purchase error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการซื้อ" },
            { status: 400 }
        );
    }
}

