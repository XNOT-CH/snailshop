import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requirePermissionMock, updateRewardsMock, setMock, findFirstMock, getPlanMock, auditMock, getRewardsMock } = vi.hoisted(() => ({
    requirePermissionMock: vi.fn(),
    auditMock: vi.fn(),
    getRewardsMock: vi.fn(),
    updateRewardsMock: vi.fn(),
    setMock: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
    findFirstMock: vi.fn(),
    getPlanMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    requirePermission: requirePermissionMock,
    requirePermissionWithCsrf: requirePermissionMock,
    requireAnyPermission: requirePermissionMock,
    requireAnyPermissionWithCsrf: requirePermissionMock,
}));

vi.mock("@/lib/db", () => ({
    db: {
        update: vi.fn(() => ({ set: setMock })),
        query: { seasonPassPlans: { findFirst: findFirstMock } },
    },
    seasonPassPlans: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

vi.mock("@/lib/seasonPass", () => ({
    getOrCreateSeasonPassPlan: getPlanMock,
    getAdminSeasonPassRewards: getRewardsMock,
    updateAdminSeasonPassRewards: updateRewardsMock,
}));

vi.mock("@/lib/auditLog", () => ({
    auditFromRequest: auditMock,
    AUDIT_ACTIONS: {
        SEASON_PASS_PLAN_UPDATE: "SEASON_PASS_PLAN_UPDATE",
        SEASON_PASS_REWARDS_UPDATE: "SEASON_PASS_REWARDS_UPDATE",
    },
}));

function rewardsRequest(rewards: unknown) {
    return new NextRequest("http://localhost/api/admin/season-pass/rewards", {
        method: "PUT",
        body: JSON.stringify({ rewards }),
    });
}

function reward(overrides: Record<string, unknown> = {}) {
    return { dayNumber: 1, rewardType: "credits", amount: "50", label: "เครดิต 50", ...overrides };
}

describe("API: /api/admin/season-pass/rewards (PUT)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        requirePermissionMock.mockResolvedValue({ success: true });
        updateRewardsMock.mockResolvedValue([]);
        getRewardsMock.mockResolvedValue([
            { dayNumber: 1, rewardType: "credits", amount: "10", label: "เครดิต 10", highlight: false },
        ]);
        setMock.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    });

    it("saves a reward inside the allowed range", async () => {
        const { PUT } = await import("@/app/api/admin/season-pass/rewards/route");

        const res = await PUT(rewardsRequest([reward()]));

        expect(res.status).toBe(200);
        expect(updateRewardsMock).toHaveBeenCalledOnce();
        expect(auditMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                action: "SEASON_PASS_REWARDS_UPDATE",
                details: expect.objectContaining({
                    changes: [{ field: "day 1", old: "credits 10", new: "credits 50" }],
                }),
            }),
        );
    });

    // A board day pays straight into a customer balance, so an extra digit is a
    // real payout rather than a typo that someone notices later.
    it("refuses an amount past the sanity cap", async () => {
        const { PUT } = await import("@/app/api/admin/season-pass/rewards/route");

        const res = await PUT(rewardsRequest([reward({ amount: "1000001" })]));

        expect(res.status).toBe(400);
        expect(updateRewardsMock).not.toHaveBeenCalled();
    });

    it("still refuses negative amounts", async () => {
        const { PUT } = await import("@/app/api/admin/season-pass/rewards/route");

        const res = await PUT(rewardsRequest([reward({ amount: "-10" })]));

        expect(res.status).toBe(400);
        expect(updateRewardsMock).not.toHaveBeenCalled();
    });

    it("refuses a day past the board length", async () => {
        const { PUT } = await import("@/app/api/admin/season-pass/rewards/route");

        const res = await PUT(rewardsRequest([reward({ dayNumber: 31 })]));

        expect(res.status).toBe(400);
        expect(updateRewardsMock).not.toHaveBeenCalled();
    });
});

describe("API: /api/admin/season-pass/plan (PUT) — sale status", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        requirePermissionMock.mockResolvedValue({ success: true });
        getPlanMock.mockResolvedValue({ id: "plan-1", durationDays: 30, isActive: false });
        findFirstMock.mockResolvedValue({ id: "plan-1", isActive: false });
        setMock.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    });

    // A payload that says nothing about the sale status used to mean "on sale",
    // so saving a paused plan for any other reason quietly reopened it.
    it("leaves a paused plan paused when the payload omits isActive", async () => {
        const { PUT } = await import("@/app/api/admin/season-pass/plan/route");

        const res = await PUT(new NextRequest("http://localhost/api/admin/season-pass/plan", {
            method: "PUT",
            body: JSON.stringify({ name: "Season Pass 30 วัน", price: "50.00" }),
        }));

        expect(res.status).toBe(200);
        expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    });

    it("still honours an explicit isActive", async () => {
        const { PUT } = await import("@/app/api/admin/season-pass/plan/route");

        await PUT(new NextRequest("http://localhost/api/admin/season-pass/plan", {
            method: "PUT",
            body: JSON.stringify({ name: "Season Pass 30 วัน", price: "50.00", isActive: true }),
        }));

        expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }));
    });
});
