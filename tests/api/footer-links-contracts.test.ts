import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Both regressions this covers were silent: the write returned 200 while the
// change never reached the site. `isActive` was dropped by the validation
// schema, and no route cleared the 60s footer cache the public layout reads.
const {
    auditFromRequestMock,
    dbMock,
    deleteWhereMock,
    insertValuesMock,
    invalidateFooterCachesMock,
    requirePermissionMock,
    updateSetMock,
    updateWhereMock,
    validateBodyMock,
} = vi.hoisted(() => {
    const deleteWhereMock = vi.fn();
    const insertValuesMock = vi.fn();
    const updateWhereMock = vi.fn();
    const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));

    const dbMock = {
        insert: vi.fn(() => ({ values: insertValuesMock })),
        update: vi.fn(() => ({ set: updateSetMock })),
        delete: vi.fn(() => ({ where: deleteWhereMock })),
        select: vi.fn(() => ({ from: vi.fn(async () => [{ maxSort: 2 }]) })),
        query: {
            footerLinks: { findFirst: vi.fn(), findMany: vi.fn() },
            footerWidgetSettings: { findFirst: vi.fn() },
        },
    };

    return {
        auditFromRequestMock: vi.fn(),
        dbMock,
        deleteWhereMock,
        insertValuesMock,
        invalidateFooterCachesMock: vi.fn(),
        requirePermissionMock: vi.fn(),
        updateSetMock,
        updateWhereMock,
        validateBodyMock: vi.fn(),
    };
});

vi.mock("@/lib/auth", () => ({
    requirePermission: requirePermissionMock,
    requirePermissionWithCsrf: requirePermissionMock,
}));

vi.mock("@/lib/db", () => ({
    db: dbMock,
    footerLinks: { id: "id", isActive: "isActive", sortOrder: "sortOrder" },
    footerWidgetSettings: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
    eq: vi.fn(),
    max: vi.fn((value) => value),
}));

vi.mock("@/lib/auditLog", () => ({
    AUDIT_ACTIONS: { SETTINGS_UPDATE: "SETTINGS_UPDATE" },
    auditFromRequest: auditFromRequestMock,
}));

vi.mock("@/lib/cache", () => ({
    invalidateFooterCaches: invalidateFooterCachesMock,
}));

vi.mock("@/lib/utils/date", () => ({
    mysqlNow: vi.fn(() => "2026-09-02 00:00:00"),
}));

vi.mock("@/lib/validations/validate", () => ({
    validateBody: validateBodyMock,
}));

const ADMIN_OK = { success: true, userId: "admin-1" };

const routeParams = (id: string) => ({ params: Promise.resolve({ id }) });
const request = (method: string) =>
    new NextRequest("http://localhost/api/admin/footer-links/link-1", { method });

describe("admin footer-links write contracts", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        requirePermissionMock.mockResolvedValue(ADMIN_OK);
        dbMock.query.footerLinks.findFirst.mockResolvedValue({ id: "link-1", label: "วิธีเติมเงิน" });
        dbMock.query.footerWidgetSettings.findFirst.mockResolvedValue({ id: "default" });
    });

    it("persists isActive so a hidden link really disappears from the footer", async () => {
        validateBodyMock.mockResolvedValue({ data: { isActive: false } });
        const { PUT } = await import("@/app/api/admin/footer-links/[id]/route");

        const response = await PUT(request("PUT"), routeParams("link-1"));

        expect(response.status).toBe(200);
        expect(updateSetMock).toHaveBeenCalledWith({ isActive: false });
    });

    it("keeps isActive on the create schema so the validator does not strip it", async () => {
        const { footerLinkSchema } = await import("@/lib/validations/content");

        const parsed = footerLinkSchema.parse({
            label: "วิธีเติมเงิน",
            href: "/how-to-topup",
            isActive: false,
        });

        expect(parsed.isActive).toBe(false);
    });

    it("does not let a reorder body inherit create defaults", async () => {
        const { footerLinkUpdateSchema } = await import("@/lib/validations/content");

        // Drag-to-reorder sends only { sortOrder }. If the update schema carried
        // the create defaults, this would also rewrite column/openInNewTab/isActive.
        expect(footerLinkUpdateSchema.parse({ sortOrder: 3 })).toEqual({ sortOrder: 3 });
    });

    it("clears the footer cache on update, delete and create", async () => {
        validateBodyMock.mockResolvedValue({ data: { label: "ติดต่อเรา", href: "/contact" } });

        const { PUT, DELETE } = await import("@/app/api/admin/footer-links/[id]/route");
        await PUT(request("PUT"), routeParams("link-1"));
        expect(invalidateFooterCachesMock).toHaveBeenCalledTimes(1);

        await DELETE(request("DELETE"), routeParams("link-1"));
        expect(invalidateFooterCachesMock).toHaveBeenCalledTimes(2);

        const { POST } = await import("@/app/api/admin/footer-links/route");
        await POST(new NextRequest("http://localhost/api/admin/footer-links", { method: "POST" }));
        expect(invalidateFooterCachesMock).toHaveBeenCalledTimes(3);
    });

    it("clears the footer cache when the column titles are renamed", async () => {
        const { PUT } = await import("@/app/api/admin/footer-links/settings/route");
        const req = new NextRequest("http://localhost/api/admin/footer-links/settings", {
            method: "PUT",
            body: JSON.stringify({ title: "ลิงก์ที่ใช้บ่อย", secondaryTitle: "บัตรเกม" }),
        });

        const response = await PUT(req);

        expect(response.status).toBe(200);
        expect(updateSetMock).toHaveBeenCalledWith({
            title: "ลิงก์ที่ใช้บ่อย",
            secondaryTitle: "บัตรเกม",
        });
        expect(invalidateFooterCachesMock).toHaveBeenCalledTimes(1);
    });
});
