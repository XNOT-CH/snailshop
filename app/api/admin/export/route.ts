import { NextRequest, NextResponse } from "next/server";
import { db, orders, users, topups, gachaRollLogs, products } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { desc, gte, lte, and } from "drizzle-orm";
import { formatDateInTimeZone } from "@/lib/utils/date";

const EXPORT_ROW_LIMIT = 50000;

// ─── helpers ──────────────────────────────────────────────────────────────────

function escapeCell(value: unknown): string {
    if (value === null || value === undefined) return "";
    
    // Safely convert Objects/Dates to strings to avoid [object Object]
    let str = "";
    if (value instanceof Date) {
        str = value.toISOString();
    } else if (typeof value === "object") {
        str = JSON.stringify(value);
    } else {
        str = String(value as string | number | boolean);
    }

    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replaceAll('"', '""')}"`;
    }
    return str;
}

/** Convert array of objects to CSV string with UTF-8 BOM */
function toCsvWithBOM(rows: Record<string, unknown>[], headers: string[]): string {
    const BOM = "\uFEFF"; // UTF-8 BOM → Excel opens correctly on Windows
    const headerLine = headers.map(escapeCell).join(",");
    const dataLines = rows.map((row) =>
        headers.map((h) => escapeCell(row[h])).join(",")
    );
    return BOM + [headerLine, ...dataLines].join("\r\n");
}

function csvResponse(csv: string, filename: string) {
    return new NextResponse(csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "X-Export-Row-Limit": String(EXPORT_ROW_LIMIT),
        },
    });
}

function isValidDateOnly(value: string | null): value is string {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getDateRangeError(from: string | null, to: string | null): string | null {
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

// ─── main route ───────────────────────────────────────────────────────────────

async function exportOrders(from: string | null, to: string | null, dateTag: string) {
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
    return csvResponse(toCsvWithBOM(rows as never, headers), `orders_${dateTag}.csv`);
}

async function exportUsers(dateTag: string) {
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
    return csvResponse(toCsvWithBOM(rows as never, headers), `users_${dateTag}.csv`);
}

async function exportTopups(from: string | null, to: string | null, dateTag: string) {
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

    const headers = [
        "id", "userId", "amount", "status", "transactionRef",
        "senderName", "senderBank", "receiverName", "receiverBank", "createdAt",
    ];
    return csvResponse(toCsvWithBOM(rows as never, headers), `topups_${dateTag}.csv`);
}

async function exportGacha(from: string | null, to: string | null, dateTag: string) {
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
    return csvResponse(toCsvWithBOM(rows as never, headers), `gacha_${dateTag}.csv`);
}

async function exportProducts(dateTag: string) {
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
    return csvResponse(toCsvWithBOM(rows as never, headers), `products_${dateTag}.csv`);
}

export async function GET(request: NextRequest) {
    const authCheck = await isAdmin();
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table") ?? "orders";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const dateRangeError = getDateRangeError(from, to);

    if (dateRangeError) {
        return NextResponse.json({ success: false, message: dateRangeError }, { status: 400 });
    }

    const dateTag = formatDateInTimeZone(new Date());

    try {
        switch (table) {
            case "orders":
                return await exportOrders(from, to, dateTag);
            case "users":
                return await exportUsers(dateTag);
            case "topups":
                return await exportTopups(from, to, dateTag);
            case "gacha":
                return await exportGacha(from, to, dateTag);
            case "products":
                return await exportProducts(dateTag);
            default:
                return NextResponse.json(
                    { success: false, message: `Unknown table: "${table}". Use: orders, users, topups, gacha, products` },
                    { status: 400 }
                );
        }
    } catch (error: unknown) {
        console.error("CSV export error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Export failed" },
            { status: 500 }
        );
    }
}
