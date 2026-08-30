import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requirePermissionWithCsrfMock, extendMock, cancelMock, auditMock } = vi.hoisted(() => ({
    requirePermissionWithCsrfMock: vi.fn(),
    extendMock: vi.fn(),
    cancelMock: vi.fn(),
    auditMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePermissionWithCsrf: requirePermissionWithCsrfMock }));
vi.mock("@/lib/auditLog", () => ({
    auditFromRequest: auditMock,
    AUDIT_ACTIONS: {
        SEASON_PASS_SUBSCRIPTION_EXTEND: "SEASON_PASS_SUBSCRIPTION_EXTEND",
        SEASON_PASS_SUBSCRIPTION_CANCEL: "SEASON_PASS_SUBSCRIPTION_CANCEL",
    },
}));
vi.mock("@/lib/features/seasonPass/adminActions", () => ({
    extendSeasonPassSubscription: extendMock,
    cancelSeasonPassSubscription: cancelMock,
}));
vi.mock("@/lib/permissions", () => ({ PERMISSIONS: { SEASON_PASS_EDIT: "season_pass:edit" } }));

const params = { params: Promise.resolve({ id: "sub-1" }) };

function request(body: unknown) {
    return new NextRequest("http://localhost/api/admin/season-pass/subscriptions/sub-1", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

describe("POST /api/admin/season-pass/subscriptions/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requirePermissionWithCsrfMock.mockResolvedValue({ success: true, userId: "admin-1" });
        extendMock.mockResolvedValue({
            ok: true,
            status: 200,
            subscription: { userId: "u1" },
            previousEndAt: "2026-09-01 00:00:00",
            endAt: "2026-09-08 00:00:00",
            days: 7,
        });
        cancelMock.mockResolvedValue({ ok: true, status: 200, subscription: { userId: "u1" }, refundAmount: 50 });
    });

    it("extends a pass and records the old and new end date", async () => {
        const { POST } = await import("@/app/api/admin/season-pass/subscriptions/[id]/route");

        const res = await POST(request({ action: "extend", days: 7 }), params);

        expect(res.status).toBe(200);
        expect(extendMock).toHaveBeenCalledWith("sub-1", 7);
        expect(auditMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            action: "SEASON_PASS_SUBSCRIPTION_EXTEND",
            details: expect.objectContaining({
                targetUserId: "u1",
                changes: [{ field: "endAt", old: "2026-09-01 00:00:00", new: "2026-09-08 00:00:00" }],
            }),
        }));
    });

    // Handing credits back is the one action here that moves money, so the trail
    // has to name the amount and the customer.
    it("cancels with a refund and records the amount", async () => {
        const { POST } = await import("@/app/api/admin/season-pass/subscriptions/[id]/route");

        const res = await POST(request({ action: "cancel", refund: true }), params);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.refundAmount).toBe(50);
        expect(cancelMock).toHaveBeenCalledWith("sub-1", { refund: true });
        expect(auditMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            action: "SEASON_PASS_SUBSCRIPTION_CANCEL",
            details: expect.objectContaining({ targetUserId: "u1", refundAmount: 50 }),
        }));
    });

    it("refuses callers without season-pass edit permission", async () => {
        requirePermissionWithCsrfMock.mockResolvedValue({ success: false, error: "Forbidden" });
        const { POST } = await import("@/app/api/admin/season-pass/subscriptions/[id]/route");

        const res = await POST(request({ action: "extend", days: 7 }), params);

        expect(res.status).toBe(401);
        expect(extendMock).not.toHaveBeenCalled();
        expect(cancelMock).not.toHaveBeenCalled();
    });

    it("rejects an unknown action and logs nothing", async () => {
        const { POST } = await import("@/app/api/admin/season-pass/subscriptions/[id]/route");

        const res = await POST(request({ action: "grant-everything" }), params);

        expect(res.status).toBe(400);
        expect(auditMock).not.toHaveBeenCalled();
    });

    it("passes a rejected extension straight through", async () => {
        extendMock.mockResolvedValue({ ok: false, status: 400, message: "จำนวนวันต้องเป็น 1–90 วัน" });
        const { POST } = await import("@/app/api/admin/season-pass/subscriptions/[id]/route");

        const res = await POST(request({ action: "extend", days: 999 }), params);

        expect(res.status).toBe(400);
        expect(auditMock).not.toHaveBeenCalled();
    });
});
