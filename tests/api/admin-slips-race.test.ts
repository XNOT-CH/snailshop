import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { auditFromRequestMock, dbMock, requireAnyPermissionWithCsrfMock } = vi.hoisted(() => ({
    auditFromRequestMock: vi.fn(),
    requireAnyPermissionWithCsrfMock: vi.fn(),
    dbMock: {
        query: {
            topups: { findFirst: vi.fn() },
        },
        transaction: vi.fn(),
        update: vi.fn(),
    },
}));

vi.mock("@/lib/auth", () => ({
    requireAnyPermissionWithCsrf: requireAnyPermissionWithCsrfMock,
}));

vi.mock("@/lib/auditLog", () => ({
    auditFromRequest: auditFromRequestMock,
    AUDIT_ACTIONS: {
        TOPUP_APPROVE: "TOPUP_APPROVE",
        TOPUP_REJECT: "TOPUP_REJECT",
    },
}));

vi.mock("@/lib/db", () => ({
    db: dbMock,
    topups: {
        id: "id",
        status: "status",
    },
    users: {
        id: "id",
        creditBalance: "creditBalance",
    },
}));

vi.mock("drizzle-orm", () => ({
    and: vi.fn((...args) => ({ kind: "and", args })),
    eq: vi.fn((left, right) => ({ kind: "eq", left, right })),
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings: Array.from(strings), values }),
}));

vi.mock("@/lib/permissions", () => ({
    PERMISSIONS: {
        SLIP_APPROVE: "slip:approve",
        SLIP_REJECT: "slip:reject",
    },
}));

function request(action: "APPROVE" | "REJECT") {
    return new NextRequest("http://localhost/api/admin/slips", {
        method: "PATCH",
        body: JSON.stringify({ id: "topup-1", action }),
    });
}

function makeUpdate(affectedRows: number) {
    const where = vi.fn().mockResolvedValue({ affectedRows });
    const set = vi.fn(() => ({ where }));
    const update = vi.fn(() => ({ set }));

    return { set, update, where };
}

describe("API: /api/admin/slips race guards", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireAnyPermissionWithCsrfMock.mockResolvedValue({ success: true, userId: "admin-1" });
        dbMock.query.topups.findFirst.mockResolvedValue({
            amount: "500",
            id: "topup-1",
            status: "PENDING",
            user: { username: "user1" },
            userId: "user-1",
        });
    });

    it("does not credit when approval loses the pending-status transition race", async () => {
        const firstUpdate = makeUpdate(0);
        const secondUpdate = makeUpdate(1);
        const tx = {
            update: vi.fn()
                .mockReturnValueOnce({ set: firstUpdate.set })
                .mockReturnValueOnce({ set: secondUpdate.set }),
        };
        dbMock.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) => callback(tx));
        const { PATCH } = await import("@/app/api/admin/slips/route");

        const res = await PATCH(request("APPROVE"));

        expect(res.status).toBe(400);
        expect((await res.json()).message).toContain("already processed");
        expect(tx.update).toHaveBeenCalledTimes(1);
        expect(secondUpdate.set).not.toHaveBeenCalled();
        expect(auditFromRequestMock).not.toHaveBeenCalled();
    });

    it("does not audit rejection when it loses the pending-status transition race", async () => {
        const rejectedUpdate = makeUpdate(0);
        dbMock.update.mockReturnValue({ set: rejectedUpdate.set });
        const { PATCH } = await import("@/app/api/admin/slips/route");

        const res = await PATCH(request("REJECT"));

        expect(res.status).toBe(400);
        expect((await res.json()).message).toContain("already processed");
        expect(auditFromRequestMock).not.toHaveBeenCalled();
    });
});
