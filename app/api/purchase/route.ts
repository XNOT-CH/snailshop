import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { splitStock, getDelimiter } from "@/lib/stock";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

export async function POST(request: NextRequest) {
    try {
        const { productId, quantity } = await request.json();

        if (!productId) {
            return NextResponse.json(
                { success: false, message: "Product ID is required" },
                { status: 400 }
            );
        }

        const qty = typeof quantity === "number" ? quantity : 1;
        if (!Number.isFinite(qty) || qty < 1 || !Number.isInteger(qty)) {
            return NextResponse.json(
                { success: false, message: "Quantity must be a positive integer" },
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

            const unitPrice = product.discountPrice ? Number(product.discountPrice) : Number(product.price);
            const userBalance = Number(user.creditBalance);

            // Check if user has enough balance
            const totalPrice = unitPrice * qty;
            if (userBalance < totalPrice) {
                throw new Error(`เครดิตไม่เพียงพอ (ต้องการ ฿${totalPrice.toLocaleString()} แต่มี ฿${userBalance.toLocaleString()})`);
            }

            // Decrypt and split stock items
            const decryptedData = decrypt(product.secretData || "");
            const separatorType = (product as unknown as { stockSeparator: string }).stockSeparator || "newline";
            const stockItems = splitStock(decryptedData, separatorType);

            if (stockItems.length === 0) {
                throw new Error("สินค้าหมดสต็อก");
            }

            if (stockItems.length < qty) {
                throw new Error(`สต็อกไม่เพียงพอ (เหลือ ${stockItems.length} รายการ)`);
            }

            // Take N stock items for this purchase
            const givenItems = stockItems.slice(0, qty);
            const remainingItems = stockItems.slice(qty);
            const delimiter = getDelimiter(separatorType);
            const remainingData = remainingItems.join(delimiter);
            const isLastStock = remainingItems.length === 0;

            // Create order first
            const givenJoined = givenItems.join(delimiter);

            const order = await tx.order.create({
                data: {
                    userId: user.id,
                    totalPrice: totalPrice,
                    status: "COMPLETED",
                    givenData: encrypt(givenJoined), // Store the code(s) given to customer
                },
            });

            // Update user: decrement creditBalance
            await tx.user.update({
                where: { id: user.id },
                data: {
                    creditBalance: {
                        decrement: totalPrice,
                    },
                },
            });

            // Update product: remove used stock item, mark sold if last
            await tx.product.update({
                where: { id: productId },
                data: {
                    secretData: isLastStock ? encrypt(givenJoined) : encrypt(remainingData),
                    isSold: isLastStock,
                    orderId: order.id,
                },
            });

            return { order, product };
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
                unitPrice: result.product.discountPrice ? Number(result.product.discountPrice) : Number(result.product.price),
                quantity: qty,
                totalPrice:
                    (result.product.discountPrice ? Number(result.product.discountPrice) : Number(result.product.price)) * qty,
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
