import { NextResponse } from "next/server";
import { db, products } from "@/lib/db";
import { eq, asc, desc } from "drizzle-orm";
import { cacheOrFetch, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const featuredProducts = await cacheOrFetch(
            CACHE_KEYS.FEATURED_PRODUCTS,
            async () => db.select({
                id: products.id,
                name: products.name,
                price: products.price,
                imageUrl: products.imageUrl,
                category: products.category,
                isSold: products.isSold,
            }).from(products)
                .where(eq(products.isFeatured, true))
                .orderBy(asc(products.isSold), asc(products.sortOrder), desc(products.createdAt))
                .limit(20),
            CACHE_TTL.MEDIUM
        );
        return NextResponse.json(featuredProducts);
    } catch (error) {
        console.error("Error fetching featured products:", error);
        return NextResponse.json([], { status: 500 });
    }
}
