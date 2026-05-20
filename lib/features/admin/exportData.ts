import { and, desc, gte, lte } from "drizzle-orm";
import { db, gachaRollLogs, orders, products, topups, users } from "@/lib/db";
import { maskTransactionRef } from "@/lib/dataProtection";
import { decryptTopupSensitiveFields } from "@/lib/sensitiveData";

export const EXPORT_ROW_LIMIT = 50000;

const ADMIN_EXPORT_TABLE_NAMES = ["orders", "users", "topups", "gacha", "products"] as const;

export type AdminExportTable = typeof ADMIN_EXPORT_TABLE_NAMES[number];

export type AdminExportPayload = {
    csv: string;
    filename: string;
};

const ADMIN_EXPORT_TABLES = new Set<string>(ADMIN_EXPORT_TABLE_NAMES);

export function isAdminExportTable(value: string): value is AdminExportTable {
    return ADMIN_EXPORT_TABLES.has(value);
}

export function getUnknownExportTableMessage(table: string) {
    return `Unknown table: "${table}". Use: ${ADMIN_EXPORT_TABLE_NAMES.join(", ")}`;
}

export function escapeCsvCell(value: unknown): string {
    if (value === null || value === undefined) return "";

    let cellText = "";
    if (value instanceof Date) {
        cellText = value.toISOString();
    } else if (typeof value === "object") {
        cellText = JSON.stringify(value);
    } else {
        cellText = String(value as string | number | boolean);
    }

    if (cellText.includes(",") || cellText.includes("\n") || cellText.includes('"')) {
        return `"${cellText.replaceAll('"', '""')}"`;
    }
    return cellText;
}

export function toCsvWithBOM(rows: Record<string, unknown>[], headers: string[]): string {
    const BOM = "\uFEFF";
    const headerLine = headers.map(escapeCsvCell).join(",");
    const dataLines = rows.map((row) =>
        headers.map((header) => escapeCsvCell(row[header])).join(",")
    );
    return BOM + [headerLine, ...dataLines].join("\r\n");
}

export function isValidDateOnly(value: string | null): value is string {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function getDateRangeError(from: string | null, to: string | null): string | null {
    if (from && !isValidDateOnly(from)) {
        return 'Invalid "from" date. Use YYYY-MM-DD.';
    }

    if (to && !isValidDateOnly(to)) {
        return 'Invalid "to" date. Use YYYY-MM-DD.';
    }

    if (from && to && from > to) {
        return '"from" date must be before or equal to "to" date.';
    }

    return null;
}

async function exportOrders(from: string | null, to: string | null, dateTag: string): Promise<AdminExportPayload> {
    const conditions = [];
    if (from) conditions.push(gte(orders.purchasedAt, from));
    if (to) conditions.push(lte(orders.purchasedAt, to + " 23:59:59"));

    const rows = await db
                    .select({
                        id: orders.id,
                        userId: orders.userId,
                        totalPrice: orders.totalPrice,
                        status: orders.status,
                        purchasedAt: orders.purchasedAt,
                    })
                    .from(orders)
                    .where(conditions.length ? and(...conditions) : undefined)
                    .orderBy(desc(orders.purchasedAt))
                    .limit(EXPORT_ROW_LIMIT);

    const headers = ["id", "userId", "totalPrice", "status", "purchasedAt"];
    return {
        csv: toCsvWithBOM(rows as Record<string, unknown>[], headers),
        filename: `orders_${dateTag}.csv`,
    };
}

async function exportUsers(dateTag: string): Promise<AdminExportPayload> {
    const rows = await db
                    .select({
                        id: users.id,
                        username: users.username,
                        email: users.email,
                        name: users.name,
                        role: users.role,
                        phone: users.phone,
                        creditBalance: users.creditBalance,
                        pointBalance: users.pointBalance,
                        totalTopup: users.totalTopup,
                        lifetimePoints: users.lifetimePoints,
                        createdAt: users.createdAt,
                    })
                    .from(users)
                    .orderBy(desc(users.createdAt))
                    .limit(EXPORT_ROW_LIMIT);

    const headers = [
        "id", "username", "email", "name", "role", "phone",
        "creditBalance", "pointBalance", "totalTopup", "lifetimePoints", "createdAt",
    ];
    return {
        csv: toCsvWithBOM(rows as Record<string, unknown>[], headers),
        filename: `users_${dateTag}.csv`,
    };
}

async function exportTopups(from: string | null, to: string | null, dateTag: string): Promise<AdminExportPayload> {
    const conditions = [];
    if (from) conditions.push(gte(topups.createdAt, from));
    if (to) conditions.push(lte(topups.createdAt, to + " 23:59:59"));

    const rows = await db
                    .select({
                        id: topups.id,
                        userId: topups.userId,
                        amount: topups.amount,
                        status: topups.status,
                        transactionRef: topups.transactionRef,
                        senderName: topups.senderName,
                        senderBank: topups.senderBank,
                        receiverName: topups.receiverName,
                        receiverBank: topups.receiverBank,
                        createdAt: topups.createdAt,
                    })
                    .from(topups)
                    .where(conditions.length ? and(...conditions) : undefined)
                    .orderBy(desc(topups.createdAt))
                    .limit(EXPORT_ROW_LIMIT);

    const decryptedRows = rows.map((row) => ({
        ...decryptTopupSensitiveFields(row),
        transactionRef: maskTransactionRef(row.transactionRef),
    }));
    const headers = [
        "id", "userId", "amount", "status", "transactionRef",
        "senderName", "senderBank", "receiverName", "receiverBank", "createdAt",
    ];
    return {
        csv: toCsvWithBOM(decryptedRows as Record<string, unknown>[], headers),
        filename: `topups_${dateTag}.csv`,
    };
}

async function exportGacha(from: string | null, to: string | null, dateTag: string): Promise<AdminExportPayload> {
    const conditions = [];
    if (from) conditions.push(gte(gachaRollLogs.createdAt, from));
    if (to) conditions.push(lte(gachaRollLogs.createdAt, to + " 23:59:59"));

    const rows = await db
                    .select({
                        id: gachaRollLogs.id,
                        userId: gachaRollLogs.userId,
                        rewardName: gachaRollLogs.rewardName,
                        tier: gachaRollLogs.tier,
                        costType: gachaRollLogs.costType,
                        costAmount: gachaRollLogs.costAmount,
                        gachaMachineId: gachaRollLogs.gachaMachineId,
                        createdAt: gachaRollLogs.createdAt,
                    })
                    .from(gachaRollLogs)
                    .where(conditions.length ? and(...conditions) : undefined)
                    .orderBy(desc(gachaRollLogs.createdAt))
                    .limit(EXPORT_ROW_LIMIT);

    const headers = [
        "id", "userId", "rewardName", "tier",
        "costType", "costAmount", "gachaMachineId", "createdAt",
    ];
    return {
        csv: toCsvWithBOM(rows as Record<string, unknown>[], headers),
        filename: `gacha_${dateTag}.csv`,
    };
}

async function exportProducts(dateTag: string): Promise<AdminExportPayload> {
    const rows = await db
                    .select({
                        id: products.id,
                        name: products.name,
                        category: products.category,
                        price: products.price,
                        discountPrice: products.discountPrice,
                        currency: products.currency,
                        isSold: products.isSold,
                        isFeatured: products.isFeatured,
                        sortOrder: products.sortOrder,
                        createdAt: products.createdAt,
                    })
                    .from(products)
                    .orderBy(desc(products.createdAt))
                    .limit(EXPORT_ROW_LIMIT);

    const headers = [
        "id", "name", "category", "price", "discountPrice",
        "currency", "isSold", "isFeatured", "sortOrder", "createdAt",
    ];
    return {
        csv: toCsvWithBOM(rows as Record<string, unknown>[], headers),
        filename: `products_${dateTag}.csv`,
    };
}

export async function getAdminExportPayload({
    table,
    from,
    to,
    dateTag,
}: {
    table: AdminExportTable;
    from: string | null;
    to: string | null;
    dateTag: string;
}): Promise<AdminExportPayload> {
    switch (table) {
        case "orders":
            return exportOrders(from, to, dateTag);
        case "users":
            return exportUsers(dateTag);
        case "topups":
            return exportTopups(from, to, dateTag);
        case "gacha":
            return exportGacha(from, to, dateTag);
        case "products":
            return exportProducts(dateTag);
    }
}
