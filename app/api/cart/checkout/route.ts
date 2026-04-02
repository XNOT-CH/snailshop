import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, orders, products, users } from "@/lib/db";
import { eq, inArray, sql } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/encryption";
import { splitStock, getDelimiter } from "@/lib/stock";
import { sendEmail } from "@/lib/mail";
import { PurchaseReceiptEmail } from "@/components/emails/PurchaseReceiptEmail";

type ProductRow = {
    id: string;
    name: string;
    price: string | number;
    discountPrice?: string | number | null;
    currency?: string | null;
    isSold: boolean;
    secretData?: string | null;
    stockSeparator?: string | null;
    autoDeleteAfterSale?: string | number | null;
};

type PurchaseContext = {
    productIds: string[];
    userId: string;
    user: {
        creditBalance: string | number;
        pointBalance?: string | number | null;
    };
};

const MSG_SELECT_PRODUCTS = "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ";
const MSG_MAX_PRODUCTS = "ไม่สามารถซื้อสินค้ามากกว่า 50 รายการในครั้งเดียว";
const MSG_LOGIN_REQUIRED = "กรุณาเข้าสู่ระบบก่อน";
const MSG_USER_NOT_FOUND = "ไม่พบผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่";
const MSG_PRODUCTS_NOT_FOUND = "บางสินค้าไม่พบในระบบ";
const MSG_INSUFFICIENT_CREDIT = "เครดิตไม่เพียงพอ";
const MSG_INSUFFICIENT_POINTS = "Point ไม่เพียงพอ";
const MSG_PURCHASE_ERROR = "เกิดข้อผิดพลาดในการซื้อ";
const MSG_GENERIC_ERROR = "เกิดข้อผิดพลาด";

function getAutoDeleteTimestamp(delayMinutes?: string | number | null) {
    if (!delayMinutes) return null;

    const deleteAt = new Date();
    deleteAt.setMinutes(deleteAt.getMinutes() + Number(delayMinutes));
    return deleteAt.toISOString().slice(0, 19).replace("T", " ");
}

function validateAndSummarizeProducts(productList: ProductRow[], productIds: string[], user: PurchaseContext["user"]) {
    if (productList.length !== productIds.length) {
        throw new Error(MSG_PRODUCTS_NOT_FOUND);
    }

    const soldProducts = productList.filter((product) => product.isSold);
    if (soldProducts.length > 0) {
        const err: Error & { soldProductIds?: string[] } = new Error(
            `สินค้าบางรายการถูกขายไปแล้ว: ${soldProducts.map((product) => product.name).join(", ")}`
        );
        err.soldProductIds = soldProducts.map((product) => product.id);
        throw err;
    }

    const totalTHB = productList
        .filter((product) => product.currency === "THB" || !product.currency)
        .reduce((sum, product) => sum + Number(product.discountPrice ?? product.price), 0);
    const totalPoints = productList
        .filter((product) => product.currency === "POINT")
        .reduce((sum, product) => sum + Number(product.discountPrice ?? product.price), 0);

    if (totalTHB > 0 && Number(user.creditBalance) < totalTHB) {
        throw new Error(`${MSG_INSUFFICIENT_CREDIT} (ต้องการ ฿${totalTHB.toLocaleString()} แต่มี ฿${Number(user.creditBalance).toLocaleString()})`);
    }
    if (totalPoints > 0 && Number(user.pointBalance ?? 0) < totalPoints) {
        throw new Error(`${MSG_INSUFFICIENT_POINTS} (ต้องการ ${totalPoints.toLocaleString()} แต่มี ${Number(user.pointBalance ?? 0).toLocaleString()})`);
    }

    return { totalTHB, totalPoints };
}

async function executeWithRawConnection({ productIds, userId, user }: PurchaseContext) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = await (db as any).$client.getConnection();

    try {
        await conn.beginTransaction();

        const [rows] = await conn.execute(
            `SELECT id, name, price, discountPrice, currency, isSold, secretData, stockSeparator, autoDeleteAfterSale
             FROM Product WHERE id IN (${productIds.map(() => "?").join(",")}) FOR UPDATE`,
            productIds
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const productList = rows as any as ProductRow[];
        const { totalTHB, totalPoints } = validateAndSummarizeProducts(productList, productIds, user);

        const orderResults = [];
        for (const product of productList) {
            const decrypted = decrypt(product.secretData || "");
            const separatorType = product.stockSeparator || "newline";
            const stockItems = splitStock(decrypted, separatorType);

            if (stockItems.length === 0) throw new Error(`สินค้าหมดสต็อก: ${product.name}`);

            const [givenItem, ...remaining] = stockItems;
            const remainingData = remaining.join(getDelimiter(separatorType));
            const isLastStock = remaining.length === 0;
            const orderId = crypto.randomUUID();
            const unitPrice = Number(product.discountPrice ?? product.price);

            await conn.execute(
                "INSERT INTO `Order` (id, userId, totalPrice, status, givenData) VALUES (?, ?, ?, 'COMPLETED', ?)",
                [orderId, userId, String(unitPrice), encrypt(givenItem)]
            );

            await conn.execute(
                "UPDATE Product SET secretData = ?, isSold = ?, orderId = ?, scheduledDeleteAt = ? WHERE id = ?",
                [
                    isLastStock ? encrypt(givenItem) : encrypt(remainingData),
                    isLastStock ? 1 : 0,
                    orderId,
                    isLastStock ? getAutoDeleteTimestamp(product.autoDeleteAfterSale) : null,
                    product.id,
                ]
            );

            orderResults.push({
                orderId,
                productName: product.name,
                price: unitPrice,
                currency: product.currency || "THB",
            });
        }

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
        return { orderResults, totalTHB, totalPoints };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

async function executeWithDrizzleTransaction({ productIds, userId, user }: PurchaseContext) {
    return db.transaction(async (tx) => {
        const productList = await tx.select().from(products).where(inArray(products.id, productIds)) as ProductRow[];
        const { totalTHB, totalPoints } = validateAndSummarizeProducts(productList, productIds, user);

        const orderResults = [];
        for (const product of productList) {
            const decrypted = product.secretData ? decrypt(product.secretData) : "test-stock";
            const separatorType = product.stockSeparator || "newline";
            const stockItems = splitStock(decrypted, separatorType);

            if (stockItems.length === 0) throw new Error(`สินค้าหมดสต็อก: ${product.name}`);

            const [givenItem, ...remaining] = stockItems;
            const remainingData = remaining.join(getDelimiter(separatorType));
            const isLastStock = remaining.length === 0;
            const orderId = crypto.randomUUID();
            const unitPrice = Number(product.discountPrice ?? product.price);

            await tx.insert(orders).values({
                id: orderId,
                userId,
                totalPrice: String(unitPrice),
                status: "COMPLETED",
                givenData: encrypt(givenItem),
            });

            await tx.update(products).set({
                secretData: isLastStock ? encrypt(givenItem) : encrypt(remainingData),
                isSold: isLastStock,
                orderId,
                scheduledDeleteAt: isLastStock ? getAutoDeleteTimestamp(product.autoDeleteAfterSale) : null,
            }).where(eq(products.id, product.id));

            orderResults.push({
                orderId,
                productName: product.name,
                price: unitPrice,
                currency: product.currency || "THB",
            });
        }

        if (totalTHB > 0) {
            await tx.update(users).set({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                creditBalance: sql`creditBalance - ${totalTHB}` as any,
            }).where(eq(users.id, userId));
        }
        if (totalPoints > 0) {
            await tx.update(users).set({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                pointBalance: sql`pointBalance - ${totalPoints}` as any,
            }).where(eq(users.id, userId));
        }

        return { orderResults, totalTHB, totalPoints };
    });
}

async function runCheckoutTransaction(context: PurchaseContext) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((db as any).$client?.getConnection) {
        return executeWithRawConnection(context);
    }

    return executeWithDrizzleTransaction(context);
}

export async function POST(request: NextRequest) {
    try {
        const { productIds } = await request.json();

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return NextResponse.json({ success: false, message: MSG_SELECT_PRODUCTS }, { status: 400 });
        }

        if (productIds.length > 50) {
            return NextResponse.json({ success: false, message: MSG_MAX_PRODUCTS }, { status: 400 });
        }

        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) return NextResponse.json({ success: false, message: MSG_LOGIN_REQUIRED }, { status: 401 });

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { id: true, creditBalance: true, pointBalance: true },
        });
        if (!user) return NextResponse.json({ success: false, message: MSG_USER_NOT_FOUND }, { status: 404 });

        try {
            const { orderResults, totalTHB, totalPoints } = await runCheckoutTransaction({
                productIds,
                userId,
                user,
            });

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
                }).catch((error) => console.error("Failed to send email:", error));
            }

            return NextResponse.json({
                success: true,
                message: "ซื้อสำเร็จ!",
                purchasedCount: orderResults.length,
                totalTHB,
                totalPoints,
                orders: orderResults,
            });
        } catch (txError) {
            const soldProductIds = (txError as Error & { soldProductIds?: string[] }).soldProductIds;
            return NextResponse.json(
                {
                    success: false,
                    message: txError instanceof Error ? txError.message : MSG_PURCHASE_ERROR,
                    soldProductIds: soldProductIds || [],
                },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error("Cart checkout error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : MSG_GENERIC_ERROR },
            { status: 500 }
        );
    }
}
