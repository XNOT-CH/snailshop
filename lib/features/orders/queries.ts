import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { db, orders } from "@/lib/db";

export function findOwnedOrderById(orderId: string, userId: string) {
    return db.query.orders.findFirst({
        where: and(eq(orders.id, orderId), eq(orders.userId, userId), isNull(orders.deletedAt)),
    });
}

export function findOwnedOrderWithProductById(orderId: string, userId: string) {
    return db.query.orders.findFirst({
        where: and(eq(orders.id, orderId), eq(orders.userId, userId), isNull(orders.deletedAt)),
        with: { product: true },
    });
}

// Counts completed orders per product for the storefront "ขายไปแล้ว" badge.
// Soft-deleted orders (deletedAt) still count — hiding an order from a user's
// inventory doesn't undo the sale.
export async function getSoldCountMap(productIds: string[]): Promise<Map<string, number>> {
    const uniqueIds = [...new Set(productIds)].filter(Boolean);
    if (uniqueIds.length === 0) return new Map();

    const rows = await db
        .select({ productId: orders.productId, sold: count() })
        .from(orders)
        .where(and(inArray(orders.productId, uniqueIds), eq(orders.status, "COMPLETED")))
        .groupBy(orders.productId);

    return new Map(
        rows.flatMap((row) => (row.productId ? [[row.productId, row.sold] as const] : [])),
    );
}
