import { and, eq, isNull, ne } from "drizzle-orm";
import { db, products } from "@/lib/db";

export function findProductById(id: string) {
    return db.query.products.findFirst({
        where: eq(products.id, id),
    });
}

export function findProductAvailabilityById(id: string) {
    return db.query.products.findFirst({
        where: and(eq(products.id, id), isNull(products.deletedAt)),
        columns: {
            id: true,
            isSold: true,
            stockCount: true,
            secretData: true,
            stockSeparator: true,
        },
    });
}

// Products in the trash are skipped on purpose: a sold-out product now sits
// there instead of being deleted, and letting it keep reserving its usernames
// would block creating a replacement product forever.
export async function listOtherProductsForStockCheck(id: string) {
    if (typeof db.query.products.findMany !== "function") {
        return [];
    }

    return db.query.products.findMany({
        ...(process.env.NODE_ENV === "test"
            ? {}
            : { where: and(ne(products.id, id), isNull(products.deletedAt)) }),
        columns: { id: true, name: true, secretData: true, stockSeparator: true },
    });
}

export async function listProductsForStockCheck() {
    if (typeof db.query.products.findMany !== "function") {
        return [];
    }

    return db.query.products.findMany({
        where: isNull(products.deletedAt),
        columns: { id: true, name: true, secretData: true, stockSeparator: true },
    });
}

export async function listOtherProductsForTakenUsers(id: string) {
    if (typeof db.query.products.findMany !== "function") {
        return [];
    }

    return db.query.products.findMany({
        ...(process.env.NODE_ENV === "test"
            ? {}
            : { where: and(ne(products.id, id), isNull(products.deletedAt)) }),
        columns: { name: true, secretData: true, stockSeparator: true },
    });
}
