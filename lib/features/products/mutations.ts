import { eq } from "drizzle-orm";
import { db, products } from "@/lib/db";
import { buildProductInsertValues, buildProductUpdateValues } from "@/lib/features/products/shared";
import { encrypt } from "@/lib/encryption";
import type { ProductPayloadInput } from "./shared";

export async function createProduct(input: Required<Pick<ProductPayloadInput, "title" | "category">> & ProductPayloadInput, priceNumber: number, discountPriceNumber: number | null) {
    const values = buildProductInsertValues(input, priceNumber, discountPriceNumber);
    await db.insert(products).values(values);
    return values;
}

export function updateProduct(id: string, input: ProductPayloadInput, priceNumber: number, discountPriceNumber: number | null) {
    return db
        .update(products)
        .set(buildProductUpdateValues(input, priceNumber, discountPriceNumber))
        .where(eq(products.id, id));
}

export function clearProductOrder(id: string) {
    return db.update(products).set({ orderId: null }).where(eq(products.id, id));
}

export function deleteProduct(id: string) {
    return db.delete(products).where(eq(products.id, id));
}

export function updateProductStock(id: string, secretData: string, hasStock: boolean) {
    return db
        .update(products)
        .set({ secretData: encrypt(secretData), isSold: !hasStock })
        .where(eq(products.id, id));
}
