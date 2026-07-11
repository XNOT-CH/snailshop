import { sql } from "drizzle-orm";
import { db, productViewsDaily } from "@/lib/db";
import { formatDateInTimeZone } from "@/lib/utils/date";

/**
 * Count one product-page view against today's Thai calendar day. Analytics
 * only — swallows every error so it can never break the product page.
 */
export async function recordProductView(productId: string): Promise<void> {
    try {
        await db
            .insert(productViewsDaily)
            .values({ productId, viewDate: formatDateInTimeZone(new Date()), views: 1 })
            .onDuplicateKeyUpdate({ set: { views: sql`${productViewsDaily.views} + 1` } });
    } catch (error) {
        console.error("[PRODUCT_VIEW_RECORD]", error);
    }
}
