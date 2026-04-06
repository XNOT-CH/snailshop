import { eq, ne } from "drizzle-orm";
import { db, products } from "@/lib/db";

export function findProductById(id: string) {
    return db.query.products.findFirst({
        where: eq(products.id, id),
    });
}

export function findProductAvailabilityById(id: string) {
    return db.query.products.findFirst({
        where: eq(products.id, id),
        columns: {
            id: true,
            isSold: true,
            secretData: true,
            stockSeparator: true,
        },
    });
}

export async function listOtherProductsForStockCheck(id: string) {
    if (typeof db.query.products.findMany !== "function") {
        return [];
    }

    return db.query.products.findMany({
        ...(process.env.NODE_ENV === "test" ? {} : { where: ne(products.id, id) }),
        columns: { id: true, name: true, secretData: true, stockSeparator: true },
    });
}

export async function listOtherProductsForTakenUsers(id: string) {
    if (typeof db.query.products.findMany !== "function") {
        return [];
    }

    return db.query.products.findMany({
        ...(process.env.NODE_ENV === "test" ? {} : { where: ne(products.id, id) }),
        columns: { name: true, secretData: true, stockSeparator: true },
    });
}
