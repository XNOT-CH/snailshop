import { describe, it, expect, vi, beforeEach } from "vitest";

const { createAuditLogMock, findManyMock, deleteWhereMock, updateSetMock, updateWhereMock, isNullMock } = vi.hoisted(() => ({
    createAuditLogMock: vi.fn(),
    findManyMock: vi.fn(),
    deleteWhereMock: vi.fn(),
    updateSetMock: vi.fn(),
    updateWhereMock: vi.fn(),
    isNullMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
    db: {
        query: { products: { findMany: findManyMock } },
        delete: vi.fn(() => ({ where: deleteWhereMock })),
        update: vi.fn(() => ({
            set: updateSetMock.mockReturnValue({ where: updateWhereMock }),
        })),
    },
    products: {
        id: "id",
        isSold: "isSold",
        scheduledDeleteAt: "scheduledDeleteAt",
        deletedAt: "deletedAt",
        orderId: "orderId",
    },
}));

vi.mock("drizzle-orm", () => ({
    and: vi.fn(),
    eq: vi.fn(),
    isNotNull: vi.fn(),
    isNull: isNullMock,
    lte: vi.fn(),
    sql: vi.fn(),
}));

vi.mock("@/lib/utils/date", () => ({
    mysqlNow: () => "2026-08-29 12:00:00",
}));

vi.mock("@/lib/auditLog", () => ({
    createAuditLog: createAuditLogMock,
    AUDIT_ACTIONS: { PRODUCT_DELETE: "PRODUCT_DELETE" },
}));

import { runAutoDelete } from "@/lib/autoDelete";

function soldProduct(id: string, name: string, orderId: string | null = null) {
    return {
        id,
        name,
        category: "steam",
        imageUrl: null,
        scheduledDeleteAt: "2026-08-29 00:00:00",
        orderId,
    };
}

describe("runAutoDelete", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        updateSetMock.mockReturnValue({ where: updateWhereMock });
    });

    // The timer used to drop the row outright while the trash page promised the
    // same products were recoverable. Soft-deleting is what makes that promise
    // true, so it is the assertion that matters most here.
    it("moves every expired product into the trash instead of destroying it", async () => {
        findManyMock.mockResolvedValue([soldProduct("p1", "Steam key"), soldProduct("p2", "Netflix")]);

        const result = await runAutoDelete();

        expect(result.deleted).toBe(2);
        expect(result.names).toEqual(["Steam key", "Netflix"]);
        expect(updateWhereMock).toHaveBeenCalledTimes(2);
        expect(deleteWhereMock).not.toHaveBeenCalled();
    });

    // Leaving the timer set would keep a trashed product in the "waiting to be
    // deleted" list and re-sweep it on every page load.
    it("stamps deletedAt and clears the timer", async () => {
        findManyMock.mockResolvedValue([soldProduct("p1", "Steam key")]);

        await runAutoDelete();

        expect(updateSetMock).toHaveBeenCalledWith({
            deletedAt: "2026-08-29 12:00:00",
            scheduledDeleteAt: null,
        });
    });

    it("excludes products that are already in the trash", async () => {
        findManyMock.mockResolvedValue([]);

        await runAutoDelete();

        expect(isNullMock).toHaveBeenCalledWith("deletedAt");
    });

    // This is the behaviour the route used to own. Auditing here means a cron
    // run leaves a trail too, so it needs to stay covered.
    it("writes one audit log describing the batch", async () => {
        findManyMock.mockResolvedValue([soldProduct("p1", "Steam key")]);

        await runAutoDelete();

        expect(createAuditLogMock).toHaveBeenCalledTimes(1);
        expect(createAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
            action: "PRODUCT_DELETE",
            resource: "Product",
            resourceId: "auto-delete",
            resourceName: "Auto-trashed 1 products",
            details: expect.objectContaining({
                reason: "auto_delete_cron",
                trashedProducts: [expect.objectContaining({ id: "p1", name: "Steam key" })],
            }),
        }));
    });

    // A sweep that rides along with a page load has no actor. Falling back to the
    // current session logged whoever opened the page as the one who deleted.
    it("credits nobody unless an actor is passed in", async () => {
        findManyMock.mockResolvedValue([soldProduct("p1", "Steam key")]);

        await runAutoDelete();

        expect(createAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({ userId: null }));

        createAuditLogMock.mockClear();
        await runAutoDelete({ actorId: "admin-1" });

        expect(createAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({ userId: "admin-1" }));
    });

    it("does not audit when nothing was due for deletion", async () => {
        findManyMock.mockResolvedValue([]);

        const result = await runAutoDelete();

        expect(result).toEqual({ deleted: 0, names: [], deletedItems: [] });
        expect(createAuditLogMock).not.toHaveBeenCalled();
    });

    it("skips a product that fails to trash without aborting the batch or over-reporting", async () => {
        findManyMock.mockResolvedValue([soldProduct("p1", "Steam key"), soldProduct("p2", "Netflix")]);
        updateWhereMock.mockRejectedValueOnce(new Error("deadlock"));
        vi.spyOn(console, "error").mockImplementation(() => {});

        const result = await runAutoDelete();

        expect(result.deleted).toBe(1);
        expect(result.names).toEqual(["Netflix"]);
        expect(createAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
            resourceName: "Auto-trashed 1 products",
        }));
    });
});
