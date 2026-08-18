import { and, count, desc, eq, gte, isNull, like, lte, ne, or, sql, sum } from "drizzle-orm";
import { db, orders, promoCodes, promoUsages, users } from "@/lib/db";
import { mysqlNow, toMySQLDatetime } from "@/lib/utils/date";

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
        columns: { id: true },
    });

    return Boolean(existingOrder);
}

export interface CreditCodeUsageFilters {
    search?: string;
    startDate?: Date;
    endDate?: Date;
    page: number;
    pageSize: number;
}

function buildCreditUsageFilters({ search, startDate, endDate }: Omit<CreditCodeUsageFilters, "page" | "pageSize">) {
    const filters = [eq(promoCodes.codeType, "CREDIT")];

    if (search?.trim()) {
        const likeValue = `%${search.trim()}%`;
        filters.push(
            or(
                like(users.username, likeValue),
                like(users.email, likeValue),
                like(promoUsages.promoCode, likeValue)
            )!
        );
    }

    if (startDate) {
        filters.push(gte(promoUsages.createdAt, toMySQLDatetime(startDate)));
    }

    if (endDate) {
        filters.push(lte(promoUsages.createdAt, toMySQLDatetime(endDate)));
    }

    return and(...filters);
}

export async function listCreditCodeUsages(filters: CreditCodeUsageFilters) {
    const where = buildCreditUsageFilters(filters);
    const page = Math.max(1, filters.page);
    const pageSize = Math.min(50, Math.max(1, filters.pageSize));

    const [{ total = 0 } = { total: 0 }] = await db
        .select({ total: count() })
        .from(promoUsages)
        .innerJoin(promoCodes, eq(promoUsages.promoCodeId, promoCodes.id))
        .innerJoin(users, eq(promoUsages.userId, users.id))
        .where(where);

    const totalRecords = Number(total);
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const validPage = Math.min(page, totalPages);

    const rows = totalRecords === 0
        ? []
        : await db
            .select({
                id: promoUsages.id,
                code: promoUsages.promoCode,
                amount: promoUsages.discountAmount,
                createdAt: promoUsages.createdAt,
                username: users.username,
                email: users.email,
            })
            .from(promoUsages)
            .innerJoin(promoCodes, eq(promoUsages.promoCodeId, promoCodes.id))
            .innerJoin(users, eq(promoUsages.userId, users.id))
            .where(where)
            .orderBy(desc(promoUsages.createdAt))
            .limit(pageSize)
            .offset((validPage - 1) * pageSize);

    return {
        rows,
        pagination: { page: validPage, pageSize, totalRecords, totalPages },
    };
}

export async function getCreditCodeUsageSummary() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [[todayRow], [allTimeRow], [activeCodesRow]] = await Promise.all([
        db
            .select({ count: count(), amount: sum(promoUsages.discountAmount) })
            .from(promoUsages)
            .innerJoin(promoCodes, eq(promoUsages.promoCodeId, promoCodes.id))
            .where(and(eq(promoCodes.codeType, "CREDIT"), gte(promoUsages.createdAt, toMySQLDatetime(todayStart)))),
        db
            .select({ count: count(), amount: sum(promoUsages.discountAmount) })
            .from(promoUsages)
            .innerJoin(promoCodes, eq(promoUsages.promoCodeId, promoCodes.id))
            .where(eq(promoCodes.codeType, "CREDIT")),
        db
            .select({ count: count() })
            .from(promoCodes)
            .where(and(
                eq(promoCodes.codeType, "CREDIT"),
                eq(promoCodes.isActive, true),
                lte(promoCodes.startsAt, mysqlNow()),
                or(isNull(promoCodes.expiresAt), gte(promoCodes.expiresAt, mysqlNow()))
            )),
    ]);

    return {
        today: { count: Number(todayRow?.count ?? 0), amount: Number(todayRow?.amount ?? 0) },
        allTime: { count: Number(allTimeRow?.count ?? 0), amount: Number(allTimeRow?.amount ?? 0) },
        activeCodeCount: Number(activeCodesRow?.count ?? 0),
    };
}
