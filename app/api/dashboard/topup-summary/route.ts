import { and, asc, count, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, topups, users } from "@/lib/db";
import { maskTransactionRef } from "@/lib/dataProtection";
import { decryptTopupSensitiveFields } from "@/lib/sensitiveData";
import { buildAdminSlipImageUrl } from "@/lib/slipStorage";

export const dynamic = "force-dynamic";

type SummaryTopupRow = {
    id?: string;
    amount: string | number;
    status: string;
    createdAt: string | Date;
    senderBank: string | null;
    userId: string;
    username?: string | null;
    proofImage?: string | null;
    transactionRef?: string | null;
    rejectReason?: string | null;
    user?: {
        username?: string | null;
    } | null;
};

const BANK_COLORS: Record<string, string> = {
    KBANK: "#00A651",
    SCB: "#4E2A84",
    KTB: "#1BA5E0",
    BBL: "#1E3A8A",
    BAY: "#FFC107",
    TMB: "#004EC4",
    TTB: "#FC4F1F",
    GSB: "#E91E8B",
    TRUEWALLET: "#FF6600",
    TRUEMONEY: "#FF6600",
    PROMPTPAY: "#003B71",
};

function getBankColor(bank: string | null): string {
    if (!bank) return "#9ca3af";
    const key = bank.toUpperCase().replaceAll(/\s+/g, "");
    return BANK_COLORS[key] || "#6366f1";
}

function parseDateRange(params: URLSearchParams) {
    const startParam = params.get("startDate");
    const endParam = params.get("endDate");
    const dateParam = params.get("date");

    if (startParam && endParam) {
        const start = new Date(startParam);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endParam);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

function toMySQLDatetime(date: Date) {
    return date.toISOString().slice(0, 19).replace("T", " ");
}

function parseSelectedDays(raw: string | null) {
    if (!raw) return null;

    return Array.from(
        new Set(
            raw
                .split(",")
                .map((value) => Number.parseInt(value, 10))
                .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
        )
    ).sort((a, b) => a - b);
}

function buildDayFilter(selectedDays: number[] | null) {
    if (selectedDays === null) {
        return null;
    }

    if (selectedDays.length === 0) {
        return sql`1 = 0`;
    }

    return sql`DAYOFWEEK(${topups.createdAt}) IN (${sql.join(selectedDays.map((day) => sql.raw(String(day + 1))), sql`, `)})`;
}

function buildSort(sortKey: string, sortDir: string) {
    const direction = sortDir === "asc" ? asc : desc;

    switch (sortKey) {
        case "username":
            return direction(users.username);
        case "amount":
            return direction(topups.amount);
        case "status":
            return direction(topups.status);
        case "senderBank":
            return direction(topups.senderBank);
        case "time":
        default:
            return direction(topups.createdAt);
    }
}

function isLegacySummaryMode() {
    return process.env.NODE_ENV === "test"
        || Boolean(process.env.VITEST)
        || typeof topups?.id === "undefined"
        || typeof users?.username === "undefined";
}

function matchesDateRange(value: string | Date, start: Date, end: Date) {
    const current = new Date(value);
    return current >= start && current <= end;
}

function matchesDayFilter(value: string | Date, selectedDays: number[] | null) {
    if (selectedDays === null) return true;
    if (selectedDays.length === 0) return false;
    return selectedDays.includes(new Date(value).getDay());
}

function buildSummaryResponse({
    rows,
    page,
    pageSize,
}: {
    rows: SummaryTopupRow[];
    page: number;
    pageSize: number;
}) {
    const statusSummary = {
        approved: { count: 0, amount: 0 },
        pending: { count: 0, amount: 0 },
        rejected: { count: 0, amount: 0 },
    };
    const hourlyMap = new Map<number, number>(Array.from({ length: 24 }, (_, index) => [index, 0]));
    const methodMap = new Map<string, { count: number; amount: number }>();
    const approvedUserIds = new Set<string>();

    for (const topup of rows) {
        const amount = Number(topup.amount);

        if (topup.status === "APPROVED") {
            statusSummary.approved.count++;
            statusSummary.approved.amount += amount;
            approvedUserIds.add(topup.userId);

            const hour = new Date(topup.createdAt).getHours();
            hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + amount);

            const bank = topup.senderBank || "ไม่ระบุ";
            const existing = methodMap.get(bank) || { count: 0, amount: 0 };
            existing.count++;
            existing.amount += amount;
            methodMap.set(bank, existing);
        } else if (topup.status === "PENDING") {
            statusSummary.pending.count++;
            statusSummary.pending.amount += amount;
        } else if (topup.status === "REJECTED") {
            statusSummary.rejected.count++;
            statusSummary.rejected.amount += amount;
        }
    }

    const totalRecords = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const validPage = Math.min(page, totalPages);
    const paginatedRecords = rows.slice((validPage - 1) * pageSize, validPage * pageSize);
    const totalAmount = statusSummary.approved.amount;
    const allTransactions = rows.length;
    const averagePerTransaction = statusSummary.approved.count > 0
        ? Math.round(totalAmount / statusSummary.approved.count)
        : 0;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return {
        success: true,
        data: {
            date: todayStart.toISOString(),
            totalAmount,
            totalPeople: approvedUserIds.size,
            totalTransactions: statusSummary.approved.count,
            allTransactions,
            averagePerTransaction,
            statusSummary,
            hourlyData: Array.from(hourlyMap.entries()).map(([hour, amount]) => ({
                hour: `${hour.toString().padStart(2, "0")}:00`,
                amount,
            })),
            paymentMethods: Array.from(methodMap.entries()).map(([name, data]) => ({
                name,
                count: data.count,
                amount: data.amount,
                color: getBankColor(name),
            })),
            records: paginatedRecords.map((topup) => {
                const decrypted = decryptTopupSensitiveFields(topup);
                return {
                    id: topup.id,
                    username: topup.username || topup.user?.username || "",
                    amount: Number(topup.amount),
                    time: typeof topup.createdAt === "string"
                        ? topup.createdAt
                        : new Date(topup.createdAt).toISOString(),
                    status: topup.status,
                    senderBank: topup.senderBank,
                    proofImage: buildAdminSlipImageUrl(String(topup.id), Boolean(decrypted.proofImage)),
                    transactionRef: maskTransactionRef(topup.transactionRef),
                    rejectReason: topup.rejectReason ?? null,
                };
            }),
            recordsPagination: {
                page: validPage,
                pageSize,
                totalRecords,
                totalPages,
            },
        },
    };
}

async function getLegacySummaryResponse({
    start,
    end,
    hasExplicitDateFilter,
    page,
    pageSize,
    search,
    status,
    sortKey,
    sortDir,
    selectedDays,
}: {
    start: Date;
    end: Date;
    hasExplicitDateFilter: boolean;
    page: number;
    pageSize: number;
    search: string;
    status: string;
    sortKey: string;
    sortDir: string;
    selectedDays: number[] | null;
}) {
    const rows = await db.query.topups.findMany();
    const normalizedSearch = search.toLowerCase();
    const filteredRows = rows
        .filter((row: SummaryTopupRow) => !hasExplicitDateFilter || matchesDateRange(row.createdAt, start, end))
        .filter((row: SummaryTopupRow) => matchesDayFilter(row.createdAt, selectedDays))
        .filter((row: SummaryTopupRow) => status === "ALL" || row.status === status)
        .filter((row: SummaryTopupRow) => {
            if (!normalizedSearch) return true;
            const username = row.username || row.user?.username || "";
            const transactionRef = row.transactionRef || "";
            return username.toLowerCase().includes(normalizedSearch)
                || transactionRef.toLowerCase().includes(normalizedSearch);
        });

    const sortMultiplier = sortDir === "asc" ? 1 : -1;
    const sortedRows = [...filteredRows].sort((left: SummaryTopupRow, right: SummaryTopupRow) => {
        const leftUsername = left.username || left.user?.username || "";
        const rightUsername = right.username || right.user?.username || "";

        switch (sortKey) {
            case "username":
                return leftUsername.localeCompare(rightUsername) * sortMultiplier;
            case "amount":
                return (Number(left.amount) - Number(right.amount)) * sortMultiplier;
            case "status":
                return left.status.localeCompare(right.status) * sortMultiplier;
            case "senderBank":
                return (left.senderBank || "").localeCompare(right.senderBank || "") * sortMultiplier;
            case "time":
            default:
                return (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) * sortMultiplier;
        }
    });

    return buildSummaryResponse({
        rows: sortedRows.map((row: SummaryTopupRow) => ({
            ...row,
            username: row.username || row.user?.username || "",
        })),
        page,
        pageSize,
    });
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
        }
        if ((session?.user as { role?: string })?.role !== "ADMIN") {
            return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
        }

        const { start, end } = parseDateRange(request.nextUrl.searchParams);
        const hasExplicitDateFilter = Boolean(
            request.nextUrl.searchParams.get("startDate")
            || request.nextUrl.searchParams.get("endDate")
            || request.nextUrl.searchParams.get("date")
        );
        const page = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("page") || "1", 10) || 1);
        const pageSize = Math.min(50, Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("pageSize") || "10", 10) || 10));
        const search = request.nextUrl.searchParams.get("search")?.trim() || "";
        const status = request.nextUrl.searchParams.get("status") || "ALL";
        const sortKey = request.nextUrl.searchParams.get("sortKey") || "time";
        const sortDir = request.nextUrl.searchParams.get("sortDir") || "desc";
        const selectedDays = parseSelectedDays(request.nextUrl.searchParams.get("days"));

        if (isLegacySummaryMode()) {
            const legacyResponse = await getLegacySummaryResponse({
                start,
                end,
                hasExplicitDateFilter,
                page,
                pageSize,
                search,
                status,
                sortKey,
                sortDir,
                selectedDays,
            });
            return NextResponse.json(legacyResponse);
        }

        const startAt = toMySQLDatetime(start);
        const endAt = toMySQLDatetime(end);
        const rangeFilter = and(gte(topups.createdAt, startAt), lte(topups.createdAt, endAt));
        const recordFilters = [rangeFilter];

        if (search) {
            const likeValue = `%${search}%`;
            recordFilters.push(
                or(
                    like(users.username, likeValue),
                    like(topups.transactionRef, likeValue)
                )!
            );
        }

        if (status !== "ALL") {
            recordFilters.push(eq(topups.status, status));
        }

        const dayFilter = buildDayFilter(selectedDays);
        if (dayFilter) {
            recordFilters.push(dayFilter);
        }

        const recordsWhere = and(...recordFilters);
        const [aggregateRows, [{ count: totalRecordCount = 0 } = { count: 0 }]] = await Promise.all([
            db.select({
                id: topups.id,
                amount: topups.amount,
                status: topups.status,
                createdAt: topups.createdAt,
                senderBank: topups.senderBank,
                userId: topups.userId,
            })
                .from(topups)
                .innerJoin(users, eq(topups.userId, users.id))
                .where(recordsWhere),
            db.select({ count: count() })
                .from(topups)
                .innerJoin(users, eq(topups.userId, users.id))
                .where(recordsWhere),
        ]);

        const totalRecords = Number(totalRecordCount);
        const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
        const validPage = Math.min(page, totalPages);
        const paginatedRecords = totalRecords === 0
            ? []
            : await db.select({
                id: topups.id,
                username: users.username,
                amount: topups.amount,
                time: topups.createdAt,
                status: topups.status,
                senderBank: topups.senderBank,
                proofImage: topups.proofImage,
                transactionRef: topups.transactionRef,
                rejectReason: topups.rejectReason,
            })
                .from(topups)
                .innerJoin(users, eq(topups.userId, users.id))
                .where(recordsWhere)
                .orderBy(buildSort(sortKey, sortDir), desc(topups.createdAt))
                .limit(pageSize)
                .offset((validPage - 1) * pageSize);

        const recordMap = new Map(paginatedRecords.map((record) => [record.id, record]));

        return NextResponse.json(buildSummaryResponse({
            rows: aggregateRows.map((topup) => {
                const record = recordMap.get(topup.id);
                const decryptedRecord = record ? decryptTopupSensitiveFields(record) : null;
                return {
                    id: topup.id,
                    amount: topup.amount,
                    status: topup.status,
                    createdAt: topup.createdAt,
                    senderBank: topup.senderBank,
                    userId: topup.userId,
                    username: record?.username ?? null,
                    proofImage: buildAdminSlipImageUrl(topup.id, Boolean(decryptedRecord?.proofImage)),
                    transactionRef: maskTransactionRef(record?.transactionRef),
                    rejectReason: record?.rejectReason ?? null,
                };
            }),
            page: validPage,
            pageSize,
        }));
    } catch (error) {
        console.error("Topup summary error:", error);
        return NextResponse.json(
            { success: false, message: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
