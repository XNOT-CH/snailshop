import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requirePermissionWithCsrfMock, expireMock, activateMock, createAuditLogMock } = vi.hoisted(() => ({
    requirePermissionWithCsrfMock: vi.fn(),
    expireMock: vi.fn(),
    activateMock: vi.fn(),
    createAuditLogMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePermissionWithCsrf: requirePermissionWithCsrfMock }));
vi.mock("@/lib/auditLog", () => ({
    createAuditLog: createAuditLogMock,
    AUDIT_ACTIONS: { SEASON_PASS_LIFECYCLE_RUN: "SEASON_PASS_LIFECYCLE_RUN" },
}));
vi.mock("@/lib/seasonPass", () => ({
    expireSeasonPassSubscriptions: expireMock,
    activateQueuedSeasonPassSubscriptions: activateMock,
}));
vi.mock("@/lib/permissions", () => ({ PERMISSIONS: { SEASON_PASS_EDIT: "season_pass:edit" } }));

function request(url = "http://localhost/api/admin/season-pass/lifecycle", method = "GET") {
    return new NextRequest(url, { method });
}

describe("API: /api/admin/season-pass/lifecycle", () => {
    const originalCronSecret = process.env.CRON_SECRET;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.CRON_SECRET = "cron-secret";
        vi.stubEnv("NODE_ENV", "test");
        expireMock.mockResolvedValue(2);
        activateMock.mockResolvedValue(1);
    });

    afterEach(() => {
        process.env.CRON_SECRET = originalCronSecret;
        vi.unstubAllEnvs();
    });

    it("runs for a cron call carrying the secret", async () => {
        const { GET } = await import("@/app/api/admin/season-pass/lifecycle/route");

        const res = await GET(request("http://localhost/api/admin/season-pass/lifecycle?secret=cron-secret"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toMatchObject({ success: true, expired: 2, activated: 1 });
        expect(expireMock).toHaveBeenCalledTimes(1);
        expect(activateMock).toHaveBeenCalledTimes(1);
    });

    it("refuses a cron call without the secret and never touches a row", async () => {
        const { GET } = await import("@/app/api/admin/season-pass/lifecycle/route");

        const res = await GET(request());

        expect(res.status).toBe(401);
        expect(expireMock).not.toHaveBeenCalled();
        expect(activateMock).not.toHaveBeenCalled();
    });

    it("requires season-pass edit permission for a manual run", async () => {
        requirePermissionWithCsrfMock.mockResolvedValue({ success: false, error: "Forbidden" });
        const { POST } = await import("@/app/api/admin/season-pass/lifecycle/route");

        const res = await POST(request("http://localhost/api/admin/season-pass/lifecycle", "POST"));

        expect(res.status).toBe(401);
        expect(expireMock).not.toHaveBeenCalled();
    });

    // A cron run has no actor; a manual one does. Either way the movement is
    // recorded, which it never was while this lived inside a page render.
    it("logs who ran it, and logs nothing when nothing moved", async () => {
        requirePermissionWithCsrfMock.mockResolvedValue({ success: true, userId: "admin-1" });
        const { GET, POST } = await import("@/app/api/admin/season-pass/lifecycle/route");

        await POST(request("http://localhost/api/admin/season-pass/lifecycle", "POST"));
        expect(createAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
            userId: "admin-1",
            details: { expired: 2, activated: 1 },
        }));

        createAuditLogMock.mockClear();
        await GET(request("http://localhost/api/admin/season-pass/lifecycle?secret=cron-secret"));
        expect(createAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({ userId: null }));

        createAuditLogMock.mockClear();
        expireMock.mockResolvedValue(0);
        activateMock.mockResolvedValue(0);
        await GET(request("http://localhost/api/admin/season-pass/lifecycle?secret=cron-secret"));
        expect(createAuditLogMock).not.toHaveBeenCalled();
    });
});
