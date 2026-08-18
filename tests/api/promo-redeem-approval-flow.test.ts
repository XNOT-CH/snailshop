import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
    isAuthenticatedWithCsrf: vi.fn().mockResolvedValue({ success: true, userId: "u1" }),
}));

vi.mock("@/lib/rateLimit", () => ({
    checkPromoValidationRateLimit: vi.fn(() => ({ blocked: false, remainingAttempts: 5 })),
    clearPromoValidationAttempts: vi.fn(),
    getClientIp: vi.fn(() => "127.0.0.1"),
    recordFailedPromoValidation: vi.fn(),
}));

vi.mock("@/lib/security/pin", () => ({
    assertPinForProtectedAction: vi.fn().mockResolvedValue({ success: true }),
}));

const selectForUpdateMock = vi.fn();
const usageCountSelectMock = vi.fn();
const updateSetMock = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
const updateMock = vi.fn(() => ({ set: updateSetMock }));
const insertValuesMock = vi.fn().mockResolvedValue(undefined);
const insertMock = vi.fn(() => ({ values: insertValuesMock }));
const findFirstUserMock = vi.fn().mockResolvedValue({ creditBalance: "150.00" });

let selectCallCount = 0;

vi.mock("@/lib/db", () => ({
    db: {
        transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb({
            select: () => {
                selectCallCount += 1;
                // 1st select in the route = locked promo row (chained with .for("update"))
                // 2nd select = per-user usage count
                if (selectCallCount % 2 === 1) {
                    return { from: () => ({ where: () => ({ for: () => selectForUpdateMock() }) }) };
                }
                return { from: () => ({ where: () => usageCountSelectMock() }) };
            },
            update: updateMock,
            insert: insertMock,
            query: { users: { findFirst: findFirstUserMock } },
        })),
    },
    promoCodes: { code: "code", id: "id" },
    promoUsages: { promoCodeId: "promoCodeId", userId: "userId", status: "status" },
    users: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
    and: vi.fn((...args: unknown[]) => args),
    eq: vi.fn((a: unknown, b: unknown) => ({ a, b })),
    ne: vi.fn((a: unknown, b: unknown) => ({ a, b })),
    sql: vi.fn(),
}));

import { db } from "@/lib/db";

function createRedeemRequest(body: object) {
    return new NextRequest("http://localhost/api/promo-codes/redeem", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

const BASE_PROMO = {
    id: "promo1",
    code: "TOPUP100",
    codeType: "CREDIT",
    isActive: true,
    startsAt: "2020-01-01 00:00:00",
    expiresAt: null,
    usageLimit: null,
    usedCount: 0,
    usagePerUser: null,
    discountValue: "100.00",
};

describe("API: /api/promo-codes/redeem — approval-required codes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        selectCallCount = 0;
        selectForUpdateMock.mockResolvedValue([BASE_PROMO]);
        usageCountSelectMock.mockResolvedValue([{ count: 0 }]);
        findFirstUserMock.mockResolvedValue({ creditBalance: "150.00" });
    });

    it("does not credit the balance and inserts a PENDING usage when the code requires approval", async () => {
        selectForUpdateMock.mockResolvedValue([{ ...BASE_PROMO, requiresApproval: true }]);

        const { POST } = await import("@/app/api/promo-codes/redeem/route");
        const res = await POST(createRedeemRequest({ code: "TOPUP100", pin: "123456" }));
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.message).toContain("รอแอดมินอนุมัติ");
        expect(body.data.pending).toBe(true);

        // update() is only ever called for promoCodes.usedCount here — the users
        // balance update must be skipped while approval is pending.
        expect(updateMock).toHaveBeenCalledTimes(1);
        expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({ status: "PENDING" }));
    });

    it("credits the balance immediately and inserts a COMPLETED usage when approval is not required", async () => {
        selectForUpdateMock.mockResolvedValue([{ ...BASE_PROMO, requiresApproval: false }]);

        const { POST } = await import("@/app/api/promo-codes/redeem/route");
        const res = await POST(createRedeemRequest({ code: "TOPUP100", pin: "123456" }));
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.message).toContain("เติมเครดิตสำเร็จ");
        expect(body.data.pending).toBe(false);

        // update() is called for both the user's balance and promoCodes.usedCount.
        expect(updateMock).toHaveBeenCalledTimes(2);
        expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({ status: "COMPLETED" }));
    });

    it("excludes REJECTED usages (in addition to REVERTED) from the per-user quota check", async () => {
        selectForUpdateMock.mockResolvedValue([{ ...BASE_PROMO, requiresApproval: false, usagePerUser: 1 }]);
        usageCountSelectMock.mockResolvedValue([{ count: 0 }]);

        const { POST } = await import("@/app/api/promo-codes/redeem/route");
        const res = await POST(createRedeemRequest({ code: "TOPUP100", pin: "123456" }));
        expect(res.status).toBe(200);

        const drizzle = await import("drizzle-orm");
        expect(drizzle.ne).toHaveBeenCalledWith(expect.anything(), "REVERTED");
        expect(drizzle.ne).toHaveBeenCalledWith(expect.anything(), "REJECTED");
    });
});
