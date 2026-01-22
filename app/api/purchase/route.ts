import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

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

            // Create order first
            const order = await tx.order.create({
                data: {
                    userId: user.id,
                    totalPrice: product.price,
                    status: "COMPLETED",
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

            // Update product: set isSold = true and link to order
            await tx.product.update({
                where: { id: productId },
                data: {
                    isSold: true,
                    orderId: order.id,
                },
            });

            return { order, product };
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
