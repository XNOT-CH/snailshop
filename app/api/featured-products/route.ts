import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheOrFetch, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const featuredProducts = await cacheOrFetch(
            CACHE_KEYS.FEATURED_PRODUCTS,
            async () => {
                return db.product.findMany({
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
            },
            CACHE_TTL.MEDIUM // 15 minutes
        );

        return NextResponse.json(featuredProducts);
    } catch (error) {
        console.error("Error fetching featured products:", error);
        return NextResponse.json([], { status: 500 });
    }
}
