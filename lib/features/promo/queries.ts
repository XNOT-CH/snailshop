import { and, eq, ne, sql } from "drizzle-orm";
import { db, orders, promoCodes, promoUsages } from "@/lib/db";

export function findPromoByCode(code: string) {
    return db.query.promoCodes.findFirst({
        where: eq(promoCodes.code, code.trim().toUpperCase()),
    });
}

export function findPromoById(id: string) {
    return db.query.promoCodes.findFirst({
        where: eq(promoCodes.id, id),
    });
}

export function listPromoCodes() {
    return db.query.promoCodes.findMany({
        orderBy: (table, helpers) => helpers.desc(table.createdAt),
    });
}

export async function countPromoUsageByUser(promoCodeId: string, userId: string) {
    const rows = await db
        .select({
            count: sql<number>`count(*)`,
        })
        .from(promoUsages)
        .where(
            and(
                eq(promoUsages.promoCodeId, promoCodeId),
                eq(promoUsages.userId, userId),
                ne(promoUsages.status, "REVERTED")
            )
        );

    return Number(rows[0]?.count ?? 0);
}

export async function userHasCompletedOrder(userId: string) {
    const existingOrder = await db.query.orders.findFirst({
        where: and(eq(orders.userId, userId), eq(orders.status, "COMPLETED")),
    });

    return Boolean(existingOrder);
}
