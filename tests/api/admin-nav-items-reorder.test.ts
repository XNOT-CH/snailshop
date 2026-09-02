/**
 * Guards and payload contract for POST /api/admin/nav-items/reorder
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/lib/auth", () => ({
    requirePermissionWithCsrf: authMock,
}));

const { updateMock, setMock, whereMock } = vi.hoisted(() => {
    const whereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn(() => ({ where: whereMock }));
    const updateMock = vi.fn(() => ({ set: setMock }));
    return { updateMock, setMock, whereMock };
});

vi.mock("@/lib/db", () => ({
    db: { update: updateMock },
    navItems: { id: "id", sortOrder: "sortOrder" },
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

vi.mock("@/lib/auditLog", () => ({
    auditFromRequest: vi.fn(),
    AUDIT_ACTIONS: { SETTINGS_UPDATE: "SETTINGS_UPDATE" },
}));

function reorderRequest(body: unknown) {
    return new NextRequest("http://localhost/api/admin/nav-items/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("API: /api/admin/nav-items/reorder", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        whereMock.mockResolvedValue(undefined);
    });

    it("returns 401 without SETTINGS_EDIT permission", async () => {
        authMock.mockResolvedValue({ success: false, error: "Unauthorized" });
        const { POST } = await import("@/app/api/admin/nav-items/reorder/route");

        const res = await POST(reorderRequest({ orders: [{ id: "a", sortOrder: 0 }] }));

        expect(res.status).toBe(401);
        expect(updateMock).not.toHaveBeenCalled();
    });

    it("rejects a malformed payload without writing", async () => {
        authMock.mockResolvedValue({ success: true, userId: "admin-1" });
        const { POST } = await import("@/app/api/admin/nav-items/reorder/route");

        for (const body of [
            {},
            { orders: [] },
            { orders: "nope" },
            { orders: [{ id: "a" }] },
            { orders: [{ id: "a", sortOrder: "1" }] },
            { orders: [{ id: "", sortOrder: 0 }] },
            { orders: [{ id: "a", sortOrder: 1.5 }] },
        ]) {
            const res = await POST(reorderRequest(body));
            expect(res.status, JSON.stringify(body)).toBe(400);
        }

        expect(updateMock).not.toHaveBeenCalled();
    });

    it("writes the new sortOrder for every item", async () => {
        authMock.mockResolvedValue({ success: true, userId: "admin-1" });
        const { POST } = await import("@/app/api/admin/nav-items/reorder/route");

        const res = await POST(
            reorderRequest({
                orders: [
                    { id: "nav-b", sortOrder: 0 },
                    { id: "nav-a", sortOrder: 1 },
                ],
            }),
        );

        expect(res.status).toBe(200);
        expect(updateMock).toHaveBeenCalledTimes(2);
        expect(setMock).toHaveBeenNthCalledWith(1, { sortOrder: 0 });
        expect(setMock).toHaveBeenNthCalledWith(2, { sortOrder: 1 });
    });

    it("returns 500 when a write fails", async () => {
        authMock.mockResolvedValue({ success: true, userId: "admin-1" });
        whereMock.mockRejectedValueOnce(new Error("db down"));
        const { POST } = await import("@/app/api/admin/nav-items/reorder/route");

        const res = await POST(reorderRequest({ orders: [{ id: "nav-a", sortOrder: 0 }] }));

        expect(res.status).toBe(500);
    });
});
