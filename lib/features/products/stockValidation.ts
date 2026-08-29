import { findDuplicateStockUser } from "@/lib/stock";
import { extractStockUsers, extractUsersFromEncryptedStock } from "./shared";

export interface ProductStockCheckProduct {
    name: string;
    secretData?: string | null;
    stockSeparator?: string | null;
}

export type ProductStockUserConflict =
    | { type: "duplicate"; user: string }
    | { type: "crossProduct"; user: string; productName: string };

export function buildProductStockTakenUsers(products: ProductStockCheckProduct[]) {
    const takenUsers: Record<string, string> = {};

    for (const product of products) {
        if (!product.secretData?.trim()) continue;

        try {
            const users = extractUsersFromEncryptedStock(product.secretData, product.stockSeparator);
            for (const user of users) {
                if (user) takenUsers[user] = product.name;
            }
        } catch {
            // Keep route behavior: undecryptable product stock is skipped for duplicate hints.
        }
    }

    return takenUsers;
}

/**
 * Which of these usernames are already held by another product. Answering for a
 * named set keeps the create form from having to download every username in the
 * shop just to warn about a handful.
 */
export function findTakenUsersAmong(
    users: string[],
    products: ProductStockCheckProduct[]
): Record<string, string> {
    const wanted = new Set(users.filter(Boolean));
    if (wanted.size === 0) return {};

    const conflicts: Record<string, string> = {};

    for (const product of products) {
        if (!product.secretData?.trim()) continue;

        try {
            for (const user of extractUsersFromEncryptedStock(product.secretData, product.stockSeparator)) {
                if (user && wanted.has(user) && !conflicts[user]) {
                    conflicts[user] = product.name;
                }
            }
        } catch {
            // Undecryptable stock is skipped, same as everywhere else.
        }
    }

    return conflicts;
}

export async function findProductStockUserConflict(
    secretData: string,
    stockSeparator: string | null | undefined,
    loadProductsForStockCheck: () => Promise<ProductStockCheckProduct[]>
): Promise<ProductStockUserConflict | null> {
    const separator = stockSeparator ?? "newline";
    const duplicateUser = findDuplicateStockUser(secretData, separator);
    if (duplicateUser) return { type: "duplicate", user: duplicateUser };

    const newUsers = extractStockUsers(secretData, separator);
    if (newUsers.length === 0) return null;

    const products = await loadProductsForStockCheck();
    for (const product of products) {
        if (!product.secretData?.trim()) continue;

        try {
            const existingUsers = new Set(extractUsersFromEncryptedStock(product.secretData, product.stockSeparator));
            const collision = newUsers.find((user) => existingUsers.has(user));
            if (collision) {
                return { type: "crossProduct", user: collision, productName: product.name };
            }
        } catch {
            // Keep route behavior: undecryptable product stock does not block saving this stock.
        }
    }

    return null;
}

export function productStockUserConflictResponseMessage(conflict: ProductStockUserConflict) {
    if (conflict.type === "duplicate") {
        return `User "${conflict.user}" มีในสต็อกอยู่แล้ว`;
    }

    return `User "${conflict.user}" มีอยู่ในสต็อกของสินค้า "${conflict.productName}" แล้ว`;
}
