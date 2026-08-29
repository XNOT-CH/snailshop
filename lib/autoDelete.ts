import { db, products } from "@/lib/db";
import { and, eq, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/auditLog";
import { mysqlNow } from "@/lib/utils/date";

export interface AutoDeletedProductSnapshot {
    id: string;
    name: string;
    category: string;
    imageUrl: string | null;
    scheduledDeleteAt: string | null;
}

interface RunAutoDeleteOptions {
    /**
     * Who to credit in the audit log. Left null for the sweeps that ride along
     * with a page load or a cron hit — those have no actor, and blaming whoever
     * happened to open the page made the trail lie about who deleted what.
     */
    actorId?: string | null;
}

/**
 * Moves sold-out products whose scheduledDeleteAt has passed into the product
 * trash. This is a soft delete: the row keeps its data and stays recoverable
 * until someone presses "ลบถาวร" in the trash. Nothing on a timer destroys a
 * product any more — a countdown and a trash bin that quietly disagreed about
 * whether "deleted" meant recoverable was the whole bug.
 *
 * scheduledDeleteAt is cleared on the way in, so the sweep is idempotent and a
 * trashed product can't also sit in the "waiting to be deleted" list.
 *
 * Called on the admin products and trash pages (only for admins who may delete
 * products), and via GET /api/admin/auto-delete/run for external cron jobs.
 */
export async function runAutoDelete(options: RunAutoDeleteOptions = {}): Promise<{
    deleted: number;
    names: string[];
    deletedItems: AutoDeletedProductSnapshot[];
}> {
    const nowStr = new Date().toISOString().slice(0, 19).replace("T", " ");

    const toTrash = await db.query.products.findMany({
        where: and(
            eq(products.isSold, true),
            isNull(products.deletedAt),
            isNotNull(products.scheduledDeleteAt),
            lte(products.scheduledDeleteAt, sql`${nowStr}`)
        ),
    });

    if (toTrash.length === 0) return { deleted: 0, names: [], deletedItems: [] };

    const names: string[] = [];
    const deletedItems: AutoDeletedProductSnapshot[] = [];

    for (const product of toTrash) {
        try {
            await db
                .update(products)
                .set({ deletedAt: mysqlNow(), scheduledDeleteAt: null })
                .where(eq(products.id, product.id));
            names.push(product.name);
            deletedItems.push({
                id: product.id,
                name: product.name,
                category: product.category,
                imageUrl: product.imageUrl,
                scheduledDeleteAt: product.scheduledDeleteAt,
            });
        } catch (err) {
            console.error(`[AUTO_DELETE] Failed to trash ${product.id}:`, err);
        }
    }

    if (names.length > 0) {
        console.log(`[AUTO_DELETE] Moved ${names.length} product(s) to trash:`, names.join(", "));
        await createAuditLog({
            userId: options.actorId ?? null,
            action: AUDIT_ACTIONS.PRODUCT_DELETE,
            resource: "Product",
            resourceId: "auto-delete",
            resourceName: `Auto-trashed ${names.length} products`,
            details: { reason: "auto_delete_cron", trashedProducts: deletedItems },
        });
    }

    return { deleted: names.length, names, deletedItems };
}
