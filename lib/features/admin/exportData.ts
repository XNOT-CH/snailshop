import { and, desc, gte, lte } from "drizzle-orm";
import { db, gachaRollLogs, orders, products, topups, users } from "@/lib/db";
import { decryptUserSensitiveFields } from "@/lib/sensitiveData";
import { maskTransactionRef } from "@/lib/dataProtection";
import { decryptTopupSensitiveFields } from "@/lib/sensitiveData";
import { mysqlDateTimeToIso, TH_TIME_ZONE } from "@/lib/utils/date";

export const EXPORT_ROW_LIMIT = 50000;

/** Joins the address parts a customer filled in into one readable line. */
function joinAddressLine(parts: unknown[]): string {
    return parts
        .map((part) => (typeof part === "string" ? part.trim() : ""))
        .filter(Boolean)
        .join(" ");
}

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

    // Guard against CSV/formula injection: a cell that starts with = + - @ (or a
    // tab/CR) can execute as a formula when opened in Excel/Sheets. Exports carry
    // user-controlled text (usernames, sender names, reward names), so neutralise
    // it with a leading apostrophe — but keep plain negative numbers intact.
    if (/^[=+\-@\t\r]/.test(cellText) && !/^-?\d+(\.\d+)?$/.test(cellText)) {
        cellText = `'${cellText}`;
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

// ── Thai-localised CSV output ─────────────────────────────────────
// Exports are read by staff in Excel, so headers and coded values are rendered
// in Thai and dates in Asia/Bangkok time. Raw numeric amounts are left untouched
// so spreadsheets can still sum them.

export interface ExportColumn {
    key: string;
    header: string;
    format?: (value: unknown, row: Record<string, unknown>) => unknown;
}

const thaiDateFormatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
});

export function formatThaiDateTime(value: unknown): string {
    if (value === null || value === undefined || value === "") return "";
    const raw = value instanceof Date ? value.toISOString() : String(value);
    const iso = mysqlDateTimeToIso(raw) ?? raw;
    const date = new Date(iso);
    if (Number.isNaN(date.valueOf())) return raw;
    // "sv-SE" yields a clean "YYYY-MM-DD HH:mm:ss" and avoids the Buddhist-era
    // year that a th-TH locale would inject.
    return thaiDateFormatter.format(date).replace(",", "");
}

function mapValue(map: Record<string, string>, value: unknown): string {
    if (value === null || value === undefined || value === "") return "";
    const key = String(value);
    return map[key] ?? map[key.toUpperCase()] ?? map[key.toLowerCase()] ?? key;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
    COMPLETED: "สำเร็จ",
    PENDING: "รอดำเนินการ",
    PROCESSING: "กำลังดำเนินการ",
    PAID: "ชำระแล้ว",
    CANCELLED: "ยกเลิก",
    FAILED: "ล้มเหลว",
    REFUNDED: "คืนเงิน",
};

const TOPUP_STATUS_LABELS: Record<string, string> = {
    PENDING: "รอตรวจสอบ",
    APPROVED: "อนุมัติ",
    REJECTED: "ปฏิเสธ",
};

const ROLE_LABELS: Record<string, string> = {
    ADMIN: "แอดมิน",
    MODERATOR: "ผู้ดูแล",
    USER: "สมาชิก",
};

const COST_TYPE_LABELS: Record<string, string> = {
    CREDIT: "เครดิต",
    POINT: "พอยต์",
    FREE: "ฟรี",
};

const TIER_LABELS: Record<string, string> = {
    common: "ธรรมดา",
    rare: "หายาก",
    epic: "หายากมาก",
    legendary: "ตำนาน",
};

const formatBool = (value: unknown): string => (value ? "ใช่" : "ไม่");
const formatOrderStatus = (value: unknown) => mapValue(ORDER_STATUS_LABELS, value);
const formatTopupStatus = (value: unknown) => mapValue(TOPUP_STATUS_LABELS, value);
const formatRole = (value: unknown) => mapValue(ROLE_LABELS, value);
const formatCostType = (value: unknown) => mapValue(COST_TYPE_LABELS, value);
const formatTier = (value: unknown) => mapValue(TIER_LABELS, value);

/** Build a CSV with Thai headers and formatted values, reusing the BOM writer. */
export function buildLocalizedCsv(columns: ExportColumn[], records: Record<string, unknown>[]): string {
    const headers = columns.map((column) => column.header);
    const rows = records.map((record) => {
        const row: Record<string, unknown> = {};
        for (const column of columns) {
            row[column.header] = column.format
                ? column.format(record[column.key], record)
                : record[column.key];
        }
        return row;
    });
    return toCsvWithBOM(rows, headers);
}

/**
 * Date-range bounds come from the UI as Thai calendar dates, but createdAt /
 * purchasedAt are stored in UTC. Convert the Thai day boundary to a UTC MySQL
 * datetime so rows near midnight land on the correct day (Thailand = UTC+7).
 */
function thaiDayBoundaryUtc(dateOnly: string, endOfDay: boolean): string {
    const time = endOfDay ? "23:59:59" : "00:00:00";
    return new Date(`${dateOnly}T${time}+07:00`).toISOString().slice(0, 19).replace("T", " ");
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

const ORDER_COLUMNS: ExportColumn[] = [
    { key: "id", header: "รหัสคำสั่งซื้อ" },
    { key: "userId", header: "รหัสผู้ใช้" },
    { key: "totalPrice", header: "ยอดรวม (บาท)" },
    { key: "status", header: "สถานะ", format: formatOrderStatus },
    { key: "purchasedAt", header: "วันที่ซื้อ", format: formatThaiDateTime },
];

async function exportOrders(from: string | null, to: string | null, dateTag: string): Promise<AdminExportPayload> {
    const conditions = [];
    if (from) conditions.push(gte(orders.purchasedAt, thaiDayBoundaryUtc(from, false)));
    if (to) conditions.push(lte(orders.purchasedAt, thaiDayBoundaryUtc(to, true)));

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

    return {
        csv: buildLocalizedCsv(ORDER_COLUMNS, rows as Record<string, unknown>[]),
        filename: `orders_${dateTag}.csv`,
    };
}

const USER_COLUMNS: ExportColumn[] = [
    { key: "id", header: "รหัสผู้ใช้" },
    { key: "username", header: "ชื่อผู้ใช้" },
    { key: "email", header: "อีเมล" },
    { key: "name", header: "ชื่อ" },
    { key: "role", header: "บทบาท", format: formatRole },
    { key: "phone", header: "เบอร์โทร" },
    { key: "creditBalance", header: "เครดิตคงเหลือ (บาท)" },
    { key: "pointBalance", header: "พอยต์คงเหลือ" },
    { key: "totalTopup", header: "เติมเงินสะสม (บาท)" },
    { key: "lifetimePoints", header: "พอยต์สะสม" },
    { key: "createdAt", header: "วันที่สมัคร", format: formatThaiDateTime },
    // Collected on the account settings page for prize shipping and tax
    // invoices; until now nothing in the app could read them back.
    { key: "shipFullName", header: "ผู้รับของรางวัล" },
    { key: "shipPhone", header: "เบอร์ผู้รับ" },
    { key: "shipAddressLine", header: "ที่อยู่จัดส่งรางวัล" },
    { key: "taxFullName", header: "ชื่อผู้ออกใบกำกับภาษี" },
    { key: "taxAddressLine", header: "ที่อยู่ใบกำกับภาษี" },
];

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
                        shipFullName: users.shipFullName,
                        shipPhone: users.shipPhone,
                        shipAddress: users.shipAddress,
                        shipSubdistrict: users.shipSubdistrict,
                        shipDistrict: users.shipDistrict,
                        shipProvince: users.shipProvince,
                        shipPostalCode: users.shipPostalCode,
                        taxFullName: users.taxFullName,
                        taxAddress: users.taxAddress,
                        taxSubdistrict: users.taxSubdistrict,
                        taxDistrict: users.taxDistrict,
                        taxProvince: users.taxProvince,
                        taxPostalCode: users.taxPostalCode,
                    })
                    .from(users)
                    .orderBy(desc(users.createdAt))
                    .limit(EXPORT_ROW_LIMIT);

    // Addresses are stored encrypted, and the sheet needs one readable line.
    const decrypted = rows.map((row) => {
        const plain = decryptUserSensitiveFields(row as Record<string, unknown>);
        return {
            ...plain,
            shipAddressLine: joinAddressLine([
                plain.shipAddress, plain.shipSubdistrict, plain.shipDistrict,
                plain.shipProvince, plain.shipPostalCode,
            ]),
            taxAddressLine: joinAddressLine([
                plain.taxAddress, plain.taxSubdistrict, plain.taxDistrict,
                plain.taxProvince, plain.taxPostalCode,
            ]),
        };
    });

    return {
        csv: buildLocalizedCsv(USER_COLUMNS, decrypted as Record<string, unknown>[]),
        filename: `users_${dateTag}.csv`,
    };
}

const TOPUP_COLUMNS: ExportColumn[] = [
    { key: "id", header: "รหัสรายการ" },
    { key: "userId", header: "รหัสผู้ใช้" },
    { key: "amount", header: "จำนวนเงิน (บาท)" },
    { key: "status", header: "สถานะ", format: formatTopupStatus },
    { key: "transactionRef", header: "อ้างอิงธุรกรรม" },
    { key: "senderName", header: "ชื่อผู้โอน" },
    { key: "senderBank", header: "ธนาคารผู้โอน" },
    { key: "receiverName", header: "ชื่อผู้รับ" },
    { key: "receiverBank", header: "ธนาคารผู้รับ" },
    { key: "createdAt", header: "วันที่ทำรายการ", format: formatThaiDateTime },
];

async function exportTopups(from: string | null, to: string | null, dateTag: string): Promise<AdminExportPayload> {
    const conditions = [];
    if (from) conditions.push(gte(topups.createdAt, thaiDayBoundaryUtc(from, false)));
    if (to) conditions.push(lte(topups.createdAt, thaiDayBoundaryUtc(to, true)));

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
    return {
        csv: buildLocalizedCsv(TOPUP_COLUMNS, decryptedRows as Record<string, unknown>[]),
        filename: `topups_${dateTag}.csv`,
    };
}

const GACHA_COLUMNS: ExportColumn[] = [
    { key: "id", header: "รหัสรายการ" },
    { key: "userId", header: "รหัสผู้ใช้" },
    { key: "rewardName", header: "ของรางวัล" },
    { key: "tier", header: "ระดับ", format: formatTier },
    { key: "costType", header: "ประเภทที่ใช้จ่าย", format: formatCostType },
    { key: "costAmount", header: "จำนวนที่ใช้จ่าย" },
    { key: "gachaMachineId", header: "รหัสตู้กาชา" },
    { key: "createdAt", header: "วันที่หมุน", format: formatThaiDateTime },
];

async function exportGacha(from: string | null, to: string | null, dateTag: string): Promise<AdminExportPayload> {
    const conditions = [];
    if (from) conditions.push(gte(gachaRollLogs.createdAt, thaiDayBoundaryUtc(from, false)));
    if (to) conditions.push(lte(gachaRollLogs.createdAt, thaiDayBoundaryUtc(to, true)));

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

    return {
        csv: buildLocalizedCsv(GACHA_COLUMNS, rows as Record<string, unknown>[]),
        filename: `gacha_${dateTag}.csv`,
    };
}

const PRODUCT_COLUMNS: ExportColumn[] = [
    { key: "id", header: "รหัสสินค้า" },
    { key: "name", header: "ชื่อสินค้า" },
    { key: "category", header: "หมวดหมู่" },
    { key: "price", header: "ราคา (บาท)" },
    { key: "discountPrice", header: "ราคาลด (บาท)" },
    { key: "currency", header: "สกุลเงิน" },
    { key: "isSold", header: "ขายแล้ว", format: formatBool },
    { key: "isFeatured", header: "สินค้าแนะนำ", format: formatBool },
    { key: "sortOrder", header: "ลำดับ" },
    { key: "createdAt", header: "วันที่เพิ่ม", format: formatThaiDateTime },
];

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

    return {
        csv: buildLocalizedCsv(PRODUCT_COLUMNS, rows as Record<string, unknown>[]),
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
