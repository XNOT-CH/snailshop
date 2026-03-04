import { NextResponse } from "next/server";
import { db, products } from "@/lib/db";
import { isNotNull, asc, desc } from "drizzle-orm";
import { cacheOrFetch, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const validSaleProducts = await cacheOrFetch(
            CACHE_KEYS.SALE_PRODUCTS,
            async () => {
                const saleProducts = await db.select({
                    id: products.id,
                    name: products.name,
                    price: products.price,
                    discountPrice: products.discountPrice,
                    imageUrl: products.imageUrl,
                    category: products.category,
                    isSold: products.isSold,
                }).from(products)
                    .where(isNotNull(products.discountPrice))
                    .orderBy(asc(products.isSold), desc(products.createdAt))
                    .limit(20);

                return saleProducts.filter(
                    (p) => p.discountPrice && Number(p.discountPrice) < Number(p.price)
                );
            },
            CACHE_TTL.MEDIUM
        );
        return NextResponse.json(validSaleProducts);
    } catch (error) {
        console.error("Error fetching sale products:", error);
        return NextResponse.json([], { status: 500 });
    }
}
