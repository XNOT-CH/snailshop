import { and, eq, isNull } from "drizzle-orm";
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
