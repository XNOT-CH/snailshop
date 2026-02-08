import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { splitStock, getDelimiter } from "@/lib/stock";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

export async function POST(request: NextRequest) {
    try {
        const { productId } = await request.json();

        if (!productId) {
            return NextResponse.json(
                { success: false, message: "Product ID is required" },
                { status: 400 }
            );
        }

        // Get logged-in user from cookie
        const cookieStore = await cookies();
        const userId = cookieStore.get("userId")?.value;

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "กรุณาเข้าสู่ระบบก่อน" },
                { status: 401 }
            );
        }

        // Find the actual logged-in user
        const user = await db.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, message: "ไม่พบผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่" },
                { status: 404 }
            );
        }

        // Use transaction for atomic operations
        const result = await db.$transaction(async (tx) => {
            // Fetch product
            const product = await tx.product.findUnique({
                where: { id: productId },
            });

            if (!product) {
                throw new Error("ไม่พบสินค้านี้ในระบบ");
            }

            // Check if already sold
            if (product.isSold) {
                throw new Error("สินค้านี้ถูกขายไปแล้ว");
            }

            const productPrice = Number(product.price);
            const userBalance = Number(user.creditBalance);

            // Check if user has enough balance
            if (userBalance < productPrice) {
                throw new Error(`เครดิตไม่เพียงพอ (ต้องการ ฿${productPrice.toLocaleString()} แต่มี ฿${userBalance.toLocaleString()})`);
            }

            // Decrypt and split stock items
            const decryptedData = decrypt(product.secretData || "");
            const separatorType = (product as unknown as { stockSeparator: string }).stockSeparator || "newline";
            const stockItems = splitStock(decryptedData, separatorType);

            if (stockItems.length === 0) {
                throw new Error("สินค้าหมดสต็อก");
            }

            // Take the first stock item for this purchase
            const givenItem = stockItems[0];
            const remainingItems = stockItems.slice(1);
            const delimiter = getDelimiter(separatorType);
            const remainingData = remainingItems.join(delimiter);
            const isLastStock = remainingItems.length === 0;

            // Create order first
            const order = await tx.order.create({
                data: {
                    userId: user.id,
                    totalPrice: product.price,
                    status: "COMPLETED",
                    givenData: encrypt(givenItem), // Store the code given to customer
                },
            });

            // Update user: decrement creditBalance
            await tx.user.update({
                where: { id: user.id },
                data: {
                    creditBalance: {
                        decrement: product.price,
                    },
                },
            });

            // Update product: remove used stock item, mark sold if last
            await tx.product.update({
                where: { id: productId },
                data: {
                    secretData: isLastStock ? encrypt(givenItem) : encrypt(remainingData),
                    isSold: isLastStock,
                    orderId: order.id,
                },
            });

            return { order, product, givenItem };
        });

        // Audit log for purchase
        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.PURCHASE,
            userId: user.id,
            resource: "Order",
            resourceId: result.order.id,
            resourceName: result.product.name,
            details: {
                resourceName: result.product.name,
                productId: productId,
                orderId: result.order.id,
                price: Number(result.product.price),
            },
        });

        return NextResponse.json({
            success: true,
            message: "ซื้อสำเร็จ! 🎉",
            orderId: result.order.id,
            productName: result.product.name,
        });
    } catch (error) {
        console.error("Purchase error:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการซื้อ",
            },
            { status: 400 }
        );
    }
}
