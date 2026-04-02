import { db, products } from "@/lib/db";
import { and, eq, isNotNull, lte, sql } from "drizzle-orm";

export interface AutoDeletedProductSnapshot {
    id: string;
    name: string;
    category: string;
    imageUrl: string | null;
    scheduledDeleteAt: string | null;
}

/**
 * Runs the auto-delete cleanup: finds all sold products whose scheduledDeleteAt
 * has passed, and deletes them. Returns the count of deleted products.
 *
 * Called automatically on every admin products page load (server-side),
 * and also exposed via GET /api/admin/auto-delete/run for external cron jobs.
 */
export async function runAutoDelete(): Promise<{
    deleted: number;
    names: string[];
    deletedItems: AutoDeletedProductSnapshot[];
}> {
    const nowStr = new Date().toISOString().slice(0, 19).replace("T", " ");

    const toDelete = await db.query.products.findMany({
        where: and(
            eq(products.isSold, true),
            isNotNull(products.scheduledDeleteAt),
            lte(products.scheduledDeleteAt, sql`${nowStr}`)
        ),
    });

    if (toDelete.length === 0) return { deleted: 0, names: [], deletedItems: [] };

    const names: string[] = [];
    const deletedItems: AutoDeletedProductSnapshot[] = [];

    for (const product of toDelete) {
        try {
            if (product.orderId) {
                await db.update(products).set({ orderId: null }).where(eq(products.id, product.id));
            }
            await db.delete(products).where(eq(products.id, product.id));
            names.push(product.name);
            deletedItems.push({
                id: product.id,
                name: product.name,
                category: product.category,
                imageUrl: product.imageUrl,
                scheduledDeleteAt: product.scheduledDeleteAt,
            });
        } catch (err) {
            console.error(`[AUTO_DELETE] Failed to delete ${product.id}:`, err);
        }
    }

    if (names.length > 0) {
        console.log(`[AUTO_DELETE] Deleted ${names.length} product(s):`, names.join(", "));
    }

    return { deleted: names.length, names, deletedItems };
}
