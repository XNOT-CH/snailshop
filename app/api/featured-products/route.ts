import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const featuredProducts = await db.product.findMany({
            where: {
                isFeatured: true,
            },
            orderBy: [
                { isSold: "asc" },
                { sortOrder: "asc" },
                { createdAt: "desc" },
            ],
            select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
                category: true,
                isSold: true,
            },
            take: 20,
        });

        return NextResponse.json(featuredProducts);
    } catch (error) {
        console.error("Error fetching featured products:", error);
        return NextResponse.json([], { status: 500 });
    }
}
