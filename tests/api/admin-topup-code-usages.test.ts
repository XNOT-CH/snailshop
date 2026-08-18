import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requirePermissionMock, requireAnyPermissionWithCsrfMock } = vi.hoisted(() => ({
    requirePermissionMock: vi.fn(),
    requireAnyPermissionWithCsrfMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    requirePermission: requirePermissionMock,
    requireAnyPermissionWithCsrf: requireAnyPermissionWithCsrfMock,
}));

vi.mock("@/lib/auditLog", () => ({
    auditFromRequest: vi.fn().mockResolvedValue(undefined),
    AUDIT_ACTIONS: { TOPUP_APPROVE: "TOPUP_APPROVE", TOPUP_REJECT: "TOPUP_REJECT" },
}));

vi.mock("@/lib/features/promo/queries", () => ({
    listCreditCodeUsages: vi.fn(),
    getCreditCodeUsageSummary: vi.fn(),
}));

const whereMock = vi.fn().mockResolvedValue({ affectedRows: 1 });
const updateMock = vi.fn(() => ({ set: vi.fn(() => ({ where: whereMock })) }));
const transactionMock = vi.fn(async (cb: (tx: unknown) => unknown) => cb({ update: updateMock }));
const findFirstMock = vi.fn();

vi.mock("@/lib/db", () => ({
    db: {
        query: { promoUsages: { findFirst: findFirstMock } },
        transaction: transactionMock,
    },
    promoUsages: { id: "id", status: "status", promoCodeId: "promoCodeId" },
    promoCodes: { id: "id", usedCount: "usedCount" },
    users: { id: "id", creditBalance: "creditBalance" },
}));

vi.mock("drizzle-orm", () => ({
    and: vi.fn((...args: unknown[]) => args),
    eq: vi.fn((a: unknown, b: unknown) => ({ a, b })),
    sql: vi.fn(),
}));

import { requireAnyPermissionWithCsrf, requirePermission } from "@/lib/auth";
import { getCreditCodeUsageSummary, listCreditCodeUsages } from "@/lib/features/promo/queries";

const SUMMARY = {
    today: { count: 1, amount: 100 },
    allTime: { count: 5, amount: 500 },
    activeCodeCount: 2,
    pendingCount: 1,
};

const PENDING_USAGE = {
    id: "pu1",
    promoCodeId: "pc1",
    userId: "u1",
    promoCode: "TOPUP100",
    discountAmount: "100.00",
    status: "PENDING",
    user: { username: "alice" },
};

describe("API: /api/admin/slips (GET topup code usage log)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        whereMock.mockResolvedValue({ affectedRows: 1 });
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
                    status: "PENDING",
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
            status: "PENDING",
            user: { username: "alice", email: "alice@example.com" },
        });
        expect(body.data.summary).toEqual(SUMMARY);
        expect(body.data.pagination).toEqual({ page: 1, pageSize: 20, totalRecords: 1, totalPages: 1 });
    });

    it("passes search, status, and pagination query params through", async () => {
        (requirePermission as any).mockResolvedValue({ success: true });

        const { GET } = await import("@/app/api/admin/slips/route");
        await GET(new NextRequest("http://localhost/api/admin/slips?search=alice&status=PENDING&page=2&pageSize=10"));

        expect(listCreditCodeUsages).toHaveBeenCalledWith(
            expect.objectContaining({ search: "alice", status: "PENDING", page: 2, pageSize: 10 })
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

describe("API: /api/admin/slips (PATCH approve/reject)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        whereMock.mockResolvedValue({ affectedRows: 1 });
        findFirstMock.mockResolvedValue(PENDING_USAGE);
    });

    const patchRequest = (body: object) =>
        new NextRequest("http://localhost/api/admin/slips", { method: "PATCH", body: JSON.stringify(body) });

    it("returns 401 when neither approve nor reject permission is held", async () => {
        (requireAnyPermissionWithCsrf as any).mockResolvedValue({ success: false, error: "Unauthorized" });
        const { PATCH } = await import("@/app/api/admin/slips/route");
        const res = await PATCH(patchRequest({ id: "pu1", action: "APPROVE" }));
        expect(res.status).toBe(401);
    });

    it("returns 400 when id or action is missing", async () => {
        (requireAnyPermissionWithCsrf as any).mockResolvedValue({ success: true, userId: "admin1" });
        const { PATCH } = await import("@/app/api/admin/slips/route");
        const res = await PATCH(patchRequest({ id: "pu1" }));
        expect(res.status).toBe(400);
    });

    it("returns 403 when the actor only has REJECT but requests APPROVE", async () => {
        (requireAnyPermissionWithCsrf as any).mockResolvedValue({ success: true, userId: "admin1" });
        (requirePermission as any).mockResolvedValue({ success: false });
        const { PATCH } = await import("@/app/api/admin/slips/route");
        const res = await PATCH(patchRequest({ id: "pu1", action: "APPROVE" }));
        expect(res.status).toBe(403);
    });

    it("returns 404 when the usage record is not found", async () => {
        (requireAnyPermissionWithCsrf as any).mockResolvedValue({ success: true, userId: "admin1" });
        (requirePermission as any).mockResolvedValue({ success: true });
        findFirstMock.mockResolvedValue(null);
        const { PATCH } = await import("@/app/api/admin/slips/route");
        const res = await PATCH(patchRequest({ id: "missing", action: "APPROVE" }));
        expect(res.status).toBe(404);
    });

    it("returns 400 when the usage is already processed", async () => {
        (requireAnyPermissionWithCsrf as any).mockResolvedValue({ success: true, userId: "admin1" });
        (requirePermission as any).mockResolvedValue({ success: true });
        findFirstMock.mockResolvedValue({ ...PENDING_USAGE, status: "COMPLETED" });
        const { PATCH } = await import("@/app/api/admin/slips/route");
        const res = await PATCH(patchRequest({ id: "pu1", action: "APPROVE" }));
        expect(res.status).toBe(400);
    });

    it("approves a pending usage and credits the user's balance", async () => {
        (requireAnyPermissionWithCsrf as any).mockResolvedValue({ success: true, userId: "admin1" });
        (requirePermission as any).mockResolvedValue({ success: true });

        const { PATCH } = await import("@/app/api/admin/slips/route");
        const res = await PATCH(patchRequest({ id: "pu1", action: "APPROVE" }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.message).toContain("100");
        expect(updateMock).toHaveBeenCalledWith({ id: "id", status: "status", promoCodeId: "promoCodeId" });
        expect(updateMock).toHaveBeenCalledWith({ id: "id", creditBalance: "creditBalance" });
    });

    it("rejects a pending usage and frees the code's usage slot without crediting", async () => {
        (requireAnyPermissionWithCsrf as any).mockResolvedValue({ success: true, userId: "admin1" });
        (requirePermission as any).mockResolvedValue({ success: true });

        const { PATCH } = await import("@/app/api/admin/slips/route");
        const res = await PATCH(patchRequest({ id: "pu1", action: "REJECT" }));
        expect(res.status).toBe(200);
        expect(updateMock).toHaveBeenCalledWith({ id: "id", status: "status", promoCodeId: "promoCodeId" });
        expect(updateMock).toHaveBeenCalledWith({ id: "id", usedCount: "usedCount" });
        expect(updateMock).not.toHaveBeenCalledWith({ id: "id", creditBalance: "creditBalance" });
    });

    it("returns 400 when two admins race to approve the same pending usage", async () => {
        (requireAnyPermissionWithCsrf as any).mockResolvedValue({ success: true, userId: "admin1" });
        (requirePermission as any).mockResolvedValue({ success: true });
        whereMock.mockResolvedValueOnce({ affectedRows: 0 });

        const { PATCH } = await import("@/app/api/admin/slips/route");
        const res = await PATCH(patchRequest({ id: "pu1", action: "APPROVE" }));
        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toMatchObject({ success: false, message: "Request already processed" });
    });
});
