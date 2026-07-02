import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { auditFromRequestMock, requirePermissionWithCsrfMock, runAutoDeleteMock } = vi.hoisted(() => ({
    auditFromRequestMock: vi.fn(),
    requirePermissionWithCsrfMock: vi.fn(),
    runAutoDeleteMock: vi.fn(),
}));

vi.mock("@/lib/autoDelete", () => ({
    runAutoDelete: runAutoDeleteMock,
}));

vi.mock("@/lib/auth", () => ({
    requirePermissionWithCsrf: requirePermissionWithCsrfMock,
}));

vi.mock("@/lib/auditLog", () => ({
    auditFromRequest: auditFromRequestMock,
    AUDIT_ACTIONS: {
        PRODUCT_DELETE: "PRODUCT_DELETE",
    },
}));

vi.mock("@/lib/permissions", () => ({
    PERMISSIONS: {
        PRODUCT_DELETE: "product:delete",
    },
}));

function request(url = "http://localhost/api/admin/auto-delete/run", method = "GET") {
    return new NextRequest(url, { method });
}

describe("API: /api/admin/auto-delete/run", () => {
    const originalCronSecret = process.env.CRON_SECRET;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.CRON_SECRET = "cron-secret";
        vi.stubEnv("NODE_ENV", "test");
        runAutoDeleteMock.mockResolvedValue({ deleted: 0, names: [], deletedItems: [] });
    });

    afterEach(() => {
        process.env.CRON_SECRET = originalCronSecret;
        vi.unstubAllEnvs();
    });

    it("rejects GET requests without the cron secret and does not use admin session fallback", async () => {
        const { GET } = await import("@/app/api/admin/auto-delete/run/route");

        const res = await GET(request());

        expect(res.status).toBe(401);
        expect(requirePermissionWithCsrfMock).not.toHaveBeenCalled();
        expect(runAutoDeleteMock).not.toHaveBeenCalled();
    });

    it("allows GET only when the cron secret matches", async () => {
        const { GET } = await import("@/app/api/admin/auto-delete/run/route");

        const res = await GET(request("http://localhost/api/admin/auto-delete/run?secret=cron-secret"));

        expect(res.status).toBe(200);
        expect(runAutoDeleteMock).toHaveBeenCalledTimes(1);
        expect(auditFromRequestMock).not.toHaveBeenCalled();
    });

    it("requires CSRF-backed product delete permission for manual POST runs", async () => {
        requirePermissionWithCsrfMock.mockResolvedValue({ success: true, userId: "admin-1" });
        runAutoDeleteMock.mockResolvedValue({
            deleted: 1,
            names: ["Sold product"],
            deletedItems: [{ id: "p1", name: "Sold product" }],
        });
        const { POST } = await import("@/app/api/admin/auto-delete/run/route");

        const res = await POST(request("http://localhost/api/admin/auto-delete/run", "POST"));

        expect(res.status).toBe(200);
        expect(requirePermissionWithCsrfMock).toHaveBeenCalledTimes(1);
        expect(runAutoDeleteMock).toHaveBeenCalledTimes(1);
        expect(auditFromRequestMock).toHaveBeenCalledWith(expect.any(NextRequest), expect.objectContaining({
            userId: "admin-1",
            action: "PRODUCT_DELETE",
        }));
    });
});
