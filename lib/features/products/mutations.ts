import { eq } from "drizzle-orm";
import { db, products } from "@/lib/db";
import { buildProductInsertValues, buildProductUpdateValues } from "@/lib/features/products/shared";
import { encrypt } from "@/lib/encryption";
import { getStockCount } from "@/lib/stock";
import { mysqlNow } from "@/lib/utils/date";
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

export function deleteProduct(id: string) {
    return db.update(products).set({ deletedAt: mysqlNow() }).where(eq(products.id, id));
}

// Clearing scheduledDeleteAt is the point of the restore, not a bonus: a
// sold-out product keeps its auto-delete timer, so restoring one without
// dropping the timer just sent it straight back to the trash on the next sweep.
export function restoreProduct(id: string) {
    return db.update(products).set({ deletedAt: null, scheduledDeleteAt: null }).where(eq(products.id, id));
}

export function permanentlyDeleteProduct(id: string) {
    return db.delete(products).where(eq(products.id, id));
}

// secretData and stockSeparator are written together on purpose. They are two
// halves of one fact: purchase-time processStock splits the blob with the
// separator off the same row, and stockCount below is counted with it. Letting
// one change without the other is how a buyer ends up with the wrong slice.
export function updateProductStock(
    id: string,
    { secretData, stockSeparator }: { secretData: string; stockSeparator: string | null | undefined },
) {
    const separator = stockSeparator || "newline";
    const stockCount = getStockCount(secretData, separator);

    return db
        .update(products)
        .set({ secretData: encrypt(secretData), stockSeparator: separator, stockCount, isSold: stockCount === 0 })
        .where(eq(products.id, id));
}
