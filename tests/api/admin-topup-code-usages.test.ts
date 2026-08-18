import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requirePermissionMock } = vi.hoisted(() => ({
    requirePermissionMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    requirePermission: requirePermissionMock,
}));

vi.mock("@/lib/features/promo/queries", () => ({
    listCreditCodeUsages: vi.fn(),
    getCreditCodeUsageSummary: vi.fn(),
}));

import { requirePermission } from "@/lib/auth";
import { getCreditCodeUsageSummary, listCreditCodeUsages } from "@/lib/features/promo/queries";

const SUMMARY = {
    today: { count: 1, amount: 100 },
    allTime: { count: 5, amount: 500 },
    activeCodeCount: 2,
};

describe("API: /api/admin/slips (GET topup code usage log)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getCreditCodeUsageSummary as any).mockResolvedValue(SUMMARY);
        (listCreditCodeUsages as any).mockResolvedValue({
            rows: [],
            pagination: { page: 1, pageSize: 20, totalRecords: 0, totalPages: 1 },
        });
    });

    it("returns 401 when not authorized", async () => {
        (requirePermission as any).mockResolvedValue({ success: false, error: "Unauthorized" });
        const { GET } = await import("@/app/api/admin/slips/route");
        const res = await GET(new NextRequest("http://localhost/api/admin/slips"));
        expect(res.status).toBe(401);
        await expect(res.json()).resolves.toEqual({ success: false, message: "Unauthorized" });
    });

    it("returns paginated usage records and summary on success", async () => {
        (requirePermission as any).mockResolvedValue({ success: true });
        (listCreditCodeUsages as any).mockResolvedValue({
            rows: [
                {
                    id: "u1",
                    code: "TOPUP100",
                    amount: "100.00",
                    status: "COMPLETED",
                    createdAt: "2026-03-14 10:00:00",
                    username: "alice",
                    email: "alice@example.com",
                },
            ],
            pagination: { page: 1, pageSize: 20, totalRecords: 1, totalPages: 1 },
        });

        const { GET } = await import("@/app/api/admin/slips/route");
        const res = await GET(new NextRequest("http://localhost/api/admin/slips"));
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.records).toHaveLength(1);
        expect(body.data.records[0]).toMatchObject({
            id: "u1",
            code: "TOPUP100",
            amount: 100,
            status: "COMPLETED",
            user: { username: "alice", email: "alice@example.com" },
        });
        expect(body.data.summary).toEqual(SUMMARY);
        expect(body.data.pagination).toEqual({ page: 1, pageSize: 20, totalRecords: 1, totalPages: 1 });
    });

    it("passes search, status, and pagination query params through", async () => {
        (requirePermission as any).mockResolvedValue({ success: true });

        const { GET } = await import("@/app/api/admin/slips/route");
        await GET(new NextRequest("http://localhost/api/admin/slips?search=alice&status=COMPLETED&page=2&pageSize=10"));

        expect(listCreditCodeUsages).toHaveBeenCalledWith(
            expect.objectContaining({ search: "alice", status: "COMPLETED", page: 2, pageSize: 10 })
        );
    });

    it("returns 500 when the query layer throws", async () => {
        (requirePermission as any).mockResolvedValue({ success: true });
        (listCreditCodeUsages as any).mockRejectedValue(new Error("DB fail"));

        const { GET } = await import("@/app/api/admin/slips/route");
        const res = await GET(new NextRequest("http://localhost/api/admin/slips"));
        expect(res.status).toBe(500);
    });
});
