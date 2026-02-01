import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const saleProducts = await db.product.findMany({
            where: {
                discountPrice: { not: null },
            },
            orderBy: [
                { isSold: "asc" },
                { createdAt: "desc" },
            ],
            select: {
                id: true,
                name: true,
                price: true,
                discountPrice: true,
                imageUrl: true,
                category: true,
                isSold: true,
            },
            take: 20,
        });

        const validSaleProducts = saleProducts.filter(
            (p) => p.discountPrice && Number(p.discountPrice) < Number(p.price)
        );

        return NextResponse.json(validSaleProducts);
    } catch (error) {
        console.error("Error fetching sale products:", error);
        return NextResponse.json([], { status: 500 });
    }
}
