import { describe, expect, it } from "vitest";
import {
    buildSummaryResponse,
    getBankColor,
    matchesDateRange,
    matchesDayFilter,
    parseDateRange,
    parseSelectedDays,
} from "@/lib/features/dashboard/topupSummary";

describe("lib/features/dashboard/topupSummary", () => {
    it("parses selected weekdays by deduping, sorting, and ignoring invalid values", () => {
        expect(parseSelectedDays(null)).toBeNull();
        expect(parseSelectedDays("5,1,1,9,-1,abc,0")).toEqual([0, 1, 5]);
        expect(parseSelectedDays("x,7,-1")).toEqual([]);
    });

    it("builds the same date range behavior from explicit range and single date params", () => {
        const range = parseDateRange(new URLSearchParams("startDate=2026-05-01&endDate=2026-05-07"));
        expect(range.start.getHours()).toBe(0);
        expect(range.start.getMinutes()).toBe(0);
        expect(range.end.getHours()).toBe(23);
        expect(range.end.getMinutes()).toBe(59);
        expect(range.end.getSeconds()).toBe(59);

        const singleDate = parseDateRange(new URLSearchParams("date=2026-05-07"));
        expect(singleDate.start.getHours()).toBe(0);
        expect(singleDate.end.getHours()).toBe(23);
    });

    it("matches date range and day filters using the existing local Date behavior", () => {
        const start = new Date("2026-05-07T00:00:00");
        const end = new Date("2026-05-07T23:59:59");

        expect(matchesDateRange("2026-05-07T12:00:00", start, end)).toBe(true);
        expect(matchesDateRange("2026-05-08T00:00:00", start, end)).toBe(false);
        expect(matchesDayFilter("2026-05-07T12:00:00", null)).toBe(true);
        expect(matchesDayFilter("2026-05-07T12:00:00", [])).toBe(false);
        expect(matchesDayFilter("2026-05-07T12:00:00", [new Date("2026-05-07T12:00:00").getDay()])).toBe(true);
    });

    it("maps known and unknown bank colors with existing fallbacks", () => {
        expect(getBankColor("k bank")).toBe("#00A651");
        expect(getBankColor(null)).toBe("#9ca3af");
        expect(getBankColor("unknown bank")).toBe("#6366f1");
    });

    it("builds summary totals, pagination, hourly data, payment methods, and record shape", () => {
        const response = buildSummaryResponse({
            page: 1,
            pageSize: 2,
            rows: [
                {
                    id: "topup-1",
                    amount: "100",
                    status: "APPROVED",
                    createdAt: "2026-05-07T09:15:00.000Z",
                    senderBank: "KBANK",
                    userId: "user-1",
                    username: "alice",
                    proofImage: null,
                    transactionRef: "ABC123456789",
                    rejectReason: null,
                },
                {
                    id: "topup-2",
                    amount: 50,
                    status: "PENDING",
                    createdAt: "2026-05-07T10:00:00.000Z",
                    senderBank: null,
                    userId: "user-2",
                    user: { username: "bob" },
                    proofImage: null,
                    transactionRef: null,
                    rejectReason: null,
                },
                {
                    id: "topup-3",
                    amount: 25,
                    status: "REJECTED",
                    createdAt: "2026-05-07T11:00:00.000Z",
                    senderBank: "SCB",
                    userId: "user-3",
                    username: "carol",
                    proofImage: null,
                    transactionRef: "123456",
                    rejectReason: "bad slip",
                },
            ],
        });

        expect(response.success).toBe(true);
        expect(response.data.totalAmount).toBe(100);
        expect(response.data.totalPeople).toBe(1);
        expect(response.data.totalTransactions).toBe(1);
        expect(response.data.allTransactions).toBe(3);
        expect(response.data.averagePerTransaction).toBe(100);
        expect(response.data.statusSummary).toEqual({
            approved: { count: 1, amount: 100 },
            pending: { count: 1, amount: 50 },
            rejected: { count: 1, amount: 25 },
        });
        expect(response.data.hourlyData).toHaveLength(24);
        expect(response.data.paymentMethods).toEqual([
            { name: "KBANK", count: 1, amount: 100, color: "#00A651" },
        ]);
        expect(response.data.records).toHaveLength(2);
        expect(response.data.records[0]).toMatchObject({
            id: "topup-1",
            username: "alice",
            amount: 100,
            status: "APPROVED",
            transactionRef: "ABC***789",
            rejectReason: null,
        });
        expect(response.data.recordsPagination).toEqual({
            page: 1,
            pageSize: 2,
            totalRecords: 3,
            totalPages: 2,
        });
    });
});
