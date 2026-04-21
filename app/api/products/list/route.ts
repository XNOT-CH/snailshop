import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db, products } from "@/lib/db";
import { cacheOrFetch, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const productList = await cacheOrFetch(
            CACHE_KEYS.PRODUCTS_LIST,
            async () => db.select({
                id: products.id,
                name: products.name,
                price: products.price,
                discountPrice: products.discountPrice,
                currency: products.currency,
                imageUrl: products.imageUrl,
                category: products.category,
                isSold: products.isSold,
                isFeatured: products.isFeatured,
            }).from(products)
                .where(eq(products.isSold, false))
                .orderBy(desc(products.isFeatured), asc(products.category), desc(products.createdAt))
                .limit(120),
            CACHE_TTL.MEDIUM,
        );

        return NextResponse.json(productList);
    } catch (error) {
        console.error("Error fetching product list:", error);
        return NextResponse.json([], { status: 500 });
    }
}
