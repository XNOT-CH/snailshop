import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Invite links carry what the shop pays per channel. These tests hold the two
// guards on them: only an admin with the invite permissions gets in, and a
// published code can never be silently changed or re-enabled underneath.

const { requirePermission, requirePermissionWithCsrf } = vi.hoisted(() => ({
    requirePermission: vi.fn(),
    requirePermissionWithCsrf: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePermission, requirePermissionWithCsrf }));
vi.mock("@/lib/auditLog", () => ({
    auditFromRequest: vi.fn(),
    AUDIT_ACTIONS: { INVITE_CREATE: "INVITE_CREATE", INVITE_UPDATE: "INVITE_UPDATE" },
}));

vi.mock("@/lib/features/invites/queries", () => ({
    listInviteCodesWithStats: vi.fn().mockResolvedValue([]),
    findInviteCodeByCode: vi.fn().mockResolvedValue(undefined),
    findInviteCodeById: vi.fn().mockResolvedValue({ id: "invite-1", code: "TIKTOK1" }),
}));

vi.mock("@/lib/features/invites/mutations", () => ({
    createInviteCode: vi.fn().mockResolvedValue({ id: "invite-1", code: "TIKTOK1" }),
    updateInviteCode: vi.fn().mockResolvedValue({ id: "invite-1", code: "TIKTOK1" }),
}));

import { findInviteCodeByCode, listInviteCodesWithStats } from "@/lib/features/invites/queries";
import { createInviteCode, updateInviteCode } from "@/lib/features/invites/mutations";

const ALLOWED = { success: true, userId: "admin-1" };
const DENIED = { success: false, error: "Forbidden" };

function jsonRequest(url: string, method: string, body: unknown) {
    return new NextRequest(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

const VALID_BODY = { code: "TIKTOK1", label: "TikTok — น้องเอ" };

describe("API: /api/admin/invite-codes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requirePermission.mockResolvedValue(ALLOWED);
        requirePermissionWithCsrf.mockResolvedValue(ALLOWED);
        vi.mocked(listInviteCodesWithStats).mockResolvedValue([]);
        vi.mocked(findInviteCodeByCode).mockResolvedValue(undefined as any);
    });

    it("refuses to list the stats without the view permission", async () => {
        requirePermission.mockResolvedValue(DENIED);

        const { GET } = await import("@/app/api/admin/invite-codes/route");
        const res = await GET(new NextRequest("http://localhost/api/admin/invite-codes"));

        expect(res.status).toBe(401);
        expect(listInviteCodesWithStats).not.toHaveBeenCalled();
    });

    it("passes a valid date range through to the query", async () => {
        const { GET } = await import("@/app/api/admin/invite-codes/route");
        await GET(
            new NextRequest(
                "http://localhost/api/admin/invite-codes?startDate=2026-09-01&endDate=2026-09-07",
            ),
        );

        expect(listInviteCodesWithStats).toHaveBeenCalledWith({
            startDate: "2026-09-01",
            endDate: "2026-09-07",
        });
    });

    it("ignores a malformed date instead of passing it to SQL", async () => {
        const { GET } = await import("@/app/api/admin/invite-codes/route");
        await GET(
            new NextRequest("http://localhost/api/admin/invite-codes?startDate=yesterday"),
        );

        expect(listInviteCodesWithStats).toHaveBeenCalledWith({
            startDate: undefined,
            endDate: undefined,
        });
    });

    it("refuses to create without the edit permission (and CSRF)", async () => {
        requirePermissionWithCsrf.mockResolvedValue(DENIED);

        const { POST } = await import("@/app/api/admin/invite-codes/route");
        const res = await POST(
            jsonRequest("http://localhost/api/admin/invite-codes", "POST", VALID_BODY),
        );

        expect(res.status).toBe(401);
        expect(createInviteCode).not.toHaveBeenCalled();
    });

    it("rejects a code that already exists, even a switched-off one", async () => {
        vi.mocked(findInviteCodeByCode).mockResolvedValue({
            id: "old",
            code: "TIKTOK1",
            isActive: false,
        } as any);

        const { POST } = await import("@/app/api/admin/invite-codes/route");
        const res = await POST(
            jsonRequest("http://localhost/api/admin/invite-codes", "POST", VALID_BODY),
        );

        expect(res.status).toBe(400);
        expect(createInviteCode).not.toHaveBeenCalled();
    });

    it("rejects a code with characters that would not survive a URL", async () => {
        const { POST } = await import("@/app/api/admin/invite-codes/route");
        const res = await POST(
            jsonRequest("http://localhost/api/admin/invite-codes", "POST", {
                ...VALID_BODY,
                code: "ติ๊กต็อก/1",
            }),
        );

        expect(res.status).toBe(400);
        expect(createInviteCode).not.toHaveBeenCalled();
    });

    it("rejects a destination that would send shoppers off-site", async () => {
        const { POST } = await import("@/app/api/admin/invite-codes/route");
        const res = await POST(
            jsonRequest("http://localhost/api/admin/invite-codes", "POST", {
                ...VALID_BODY,
                destination: "//evil.example.com",
            }),
        );

        expect(res.status).toBe(400);
        expect(createInviteCode).not.toHaveBeenCalled();
    });

    it("stores the code uppercased", async () => {
        const { POST } = await import("@/app/api/admin/invite-codes/route");
        await POST(
            jsonRequest("http://localhost/api/admin/invite-codes", "POST", {
                ...VALID_BODY,
                code: "tiktok1",
            }),
        );

        expect(createInviteCode).toHaveBeenCalledWith(
            expect.objectContaining({ code: "TIKTOK1" }),
        );
    });
});

describe("API: /api/admin/invite-codes/[id]", () => {
    const params = { params: Promise.resolve({ id: "invite-1" }) };

    beforeEach(() => {
        vi.clearAllMocks();
        requirePermissionWithCsrf.mockResolvedValue(ALLOWED);
    });

    it("refuses to edit without the edit permission (and CSRF)", async () => {
        requirePermissionWithCsrf.mockResolvedValue(DENIED);

        const { PATCH } = await import("@/app/api/admin/invite-codes/[id]/route");
        const res = await PATCH(
            jsonRequest("http://localhost/api/admin/invite-codes/invite-1", "PATCH", {
                isActive: false,
            }),
            params,
        );

        expect(res.status).toBe(401);
        expect(updateInviteCode).not.toHaveBeenCalled();
    });

    it("never changes the code, even when one is sent", async () => {
        const { PATCH } = await import("@/app/api/admin/invite-codes/[id]/route");
        await PATCH(
            jsonRequest("http://localhost/api/admin/invite-codes/invite-1", "PATCH", {
                code: "STOLEN",
                label: "ชื่อใหม่",
            }),
            params,
        );

        expect(updateInviteCode).toHaveBeenCalledWith(
            "invite-1",
            expect.not.objectContaining({ code: expect.anything() }),
        );
    });

    it("does not re-enable a switched-off code when isActive was not sent", async () => {
        // The .partial() trap: a schema default would arrive here as
        // isActive: true and quietly turn a stopped channel back on.
        const { PATCH } = await import("@/app/api/admin/invite-codes/[id]/route");
        await PATCH(
            jsonRequest("http://localhost/api/admin/invite-codes/invite-1", "PATCH", {
                label: "ชื่อใหม่",
            }),
            params,
        );

        expect(updateInviteCode).toHaveBeenCalledWith("invite-1", { label: "ชื่อใหม่" });
    });

    it("has no DELETE handler — codes are switched off, never removed", async () => {
        const route = await import("@/app/api/admin/invite-codes/[id]/route");

        expect("DELETE" in route).toBe(false);
    });
});

describe("invite-code access rules", () => {
    it("is gated by invite:view rather than falling through to the /api/admin catch-all", async () => {
        // ADMIN_API_RULES matches in array order and ends with a catch-all on
        // "/api/admin". A rule added below it never matches, and marketing
        // spend would be readable by anyone who can open the admin panel.
        const { getRequiredPermissionForAdminApi, getRequiredPermissionForAdminPage } =
            await import("@/lib/adminAccess");

        expect(getRequiredPermissionForAdminApi("/api/admin/invite-codes")).toBe("invite:view");
        expect(getRequiredPermissionForAdminApi("/api/admin/invite-codes/invite-1")).toBe(
            "invite:view",
        );
        expect(getRequiredPermissionForAdminPage("/admin/invite-codes")).toBe("invite:view");
    });
});
