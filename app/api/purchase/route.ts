import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, users, promoCodes } from "@/lib/db";
import { eq } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/encryption";
import { splitStock, getDelimiter } from "@/lib/stock";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { sendEmail } from "@/lib/mail";
import { PurchaseReceiptEmail } from "@/components/emails/PurchaseReceiptEmail";

async function validatePromo(promoCode: string) {
    const promo = await db.query.promoCodes.findFirst({
        where: eq(promoCodes.code, promoCode.trim().toUpperCase()),
    });

    if (!promo?.isActive) return null;

    const now = new Date();
    const startsAt = new Date(promo.startsAt);
    const expiresAt = promo.expiresAt ? new Date(promo.expiresAt) : null;
    const withinLimit = promo.usageLimit === null || promo.usedCount < promo.usageLimit;

    if (now >= startsAt && (expiresAt === null || now <= expiresAt) && withinLimit) {
        return {
            id: promo.id,
            discountType: promo.discountType,
            discountValue: Number(promo.discountValue),
            maxDiscount: promo.maxDiscount ? Number(promo.maxDiscount) : null,
        };
    }
    return null;
}

function calculateDiscount(totalPrice: number, promoData: { discountType: string; discountValue: number; maxDiscount: number | null; } | null) {
    if (!promoData) return totalPrice;
    let discountAmount = 0;
    if (promoData.discountType === "PERCENTAGE") {
        discountAmount = (totalPrice * promoData.discountValue) / 100;
        if (promoData.maxDiscount !== null && discountAmount > promoData.maxDiscount) {
            discountAmount = promoData.maxDiscount;
        }
    } else {
        discountAmount = promoData.discountValue;
    }
    const finalPrice = Math.max(0, totalPrice - discountAmount);
    return Math.round(finalPrice * 100) / 100;
}

function processStock(decryptedData: string, separatorType: string, qty: number) {
    const stockItems = splitStock(decryptedData, separatorType);

    if (stockItems.length === 0) throw new Error("สินค้าหมดสต็อก");
    if (stockItems.length < qty) throw new Error(`สต็อกไม่เพียงพอ (เหลือ ${stockItems.length} รายการ)`);

    const givenItems = stockItems.slice(0, qty);
    const remainingItems = stockItems.slice(qty);
    const delimiter = getDelimiter(separatorType);

    return {
        givenJoined: givenItems.join(delimiter),
        remainingData: remainingItems.join(delimiter),
        isLastStock: remainingItems.length === 0,
    };
}

async function getAuthUser() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return { error: "กรุณาเข้าสู่ระบบก่อน", status: 401 };
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return { error: "ไม่พบผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่", status: 404 };
    return { user };
}

async function sendPurchaseReceipt(email: string | null, name: string | null, result: { finalPrice: number, product: { name: string } } | undefined) {
    if (!email || !result) {
        console.log("No user email found to send receipt");
        return;
    }
    console.log("Sending receipt to:", email);
    try {
        const emailResult = await sendEmail({
            to: email,
            subject: `ใบเสร็จรับเงิน SnailShop - สั่งซื้อสินค้า 1 รายการ`,
            react: PurchaseReceiptEmail({
                userName: name || "ลูกค้า",
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
    } catch (e) {
        console.error("Failed to send email receipt:", e);
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executePurchaseTransaction(conn: any, productId: string, qty: number, user: any, promoData: any) {
    try {
        await conn.beginTransaction();

        const [product] = await conn.execute(
            "SELECT * FROM Product WHERE id = ? FOR UPDATE",
            [productId]
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prod = (product as any[])[0];

        if (!prod) throw new Error("ไม่พบสินค้านี้ในระบบ");
        if (prod.isSold) throw new Error("สินค้านี้ถูกขายไปแล้ว");

        const unitPrice = prod.discountPrice ? Number(prod.discountPrice) : Number(prod.price);
        const userBalance = Number(user.creditBalance);
        let totalPrice = unitPrice * qty;

        totalPrice = calculateDiscount(totalPrice, promoData);

        if (userBalance < totalPrice) {
            throw new Error(`เครดิตไม่เพียงพอ (ต้องการ ฿${totalPrice.toLocaleString()} แต่มี ฿${userBalance.toLocaleString()})`);
        }

        const decryptedData = decrypt(prod.secretData || "");
        const separatorType = prod.stockSeparator || "newline";
        const { givenJoined, remainingData, isLastStock } = processStock(decryptedData, separatorType, qty);

        const orderId = crypto.randomUUID();
        await conn.execute(
            "INSERT INTO `Order` (id, userId, totalPrice, status, givenData) VALUES (?, ?, ?, 'COMPLETED', ?)",
            [orderId, user.id, totalPrice, encrypt(givenJoined)]
        );

        await conn.execute(
            "UPDATE User SET creditBalance = creditBalance - ? WHERE id = ?",
            [totalPrice, user.id]
        );

        // Calculate scheduledDeleteAt if autoDeleteAfterSale is configured
        let scheduledDeleteAt: string | null = null;
        if (isLastStock && prod.autoDeleteAfterSale) {
            const deleteAt = new Date();
            deleteAt.setMinutes(deleteAt.getMinutes() + Number(prod.autoDeleteAfterSale));
            scheduledDeleteAt = deleteAt.toISOString().slice(0, 19).replace("T", " ");
        }

        await conn.execute(
            "UPDATE Product SET secretData = ?, isSold = ?, orderId = ?, scheduledDeleteAt = ? WHERE id = ?",
            [isLastStock ? encrypt(givenJoined) : encrypt(remainingData), isLastStock ? 1 : 0, orderId, scheduledDeleteAt, productId]
        );

        if (promoData) {
            await conn.execute(
                "UPDATE PromoCode SET usedCount = usedCount + 1 WHERE id = ?",
                [promoData.id]
            );
        }

        await conn.commit();
        return { order: { id: orderId }, product: prod, finalPrice: totalPrice };
    } catch (txError) {
        await conn.rollback();
        throw txError;
    } finally {
        conn.release();
    }
}

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

        const authRes = await getAuthUser();
        if ('error' in authRes) return NextResponse.json({ success: false, message: authRes.error }, { status: authRes.status });
        const { user } = authRes;

        // Validate promo code if provided
        let promoData = null;
        if (promoCode && typeof promoCode === "string") {
            promoData = await validatePromo(promoCode);
        }

        // Drizzle mysql2 doesn't have built-in transaction method like Prisma,
        // so we use the underlying pool connection for a manual transaction
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const conn = await (db as any).$client.getConnection();
        // Execute transaction
        const result = await executePurchaseTransaction(conn, productId, qty, user, promoData);

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.PURCHASE,
            userId: user.id,
            resource: "Order",
            resourceId: result?.order.id || "unknown",
            resourceName: result?.product.name || "unknown",
            details: {
                resourceName: result?.product.name,
                productId,
                orderId: result?.order.id,
                promoCode: promoData ? promoCode.trim().toUpperCase() : undefined,
                unitPrice: result?.product.discountPrice ? Number(result.product.discountPrice) : Number(result?.product.price || 0),
                quantity: qty,
                totalPrice: result?.finalPrice || 0,
            },
        });

        // Send an email receipt asynchronously
        void sendPurchaseReceipt(user.email, user.name, result);

        return NextResponse.json({
            success: true,
            message: "ซื้อสำเร็จ! 🎉",
            orderId: result?.order.id,
            productName: result?.product.name,
        });
    } catch (error) {
        console.error("Purchase error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการซื้อ" },
            { status: 400 }
        );
    }
}

