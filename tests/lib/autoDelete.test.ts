import { describe, it, expect, vi, beforeEach } from "vitest";

const { createAuditLogMock, findManyMock, deleteWhereMock, updateWhereMock } = vi.hoisted(() => ({
    createAuditLogMock: vi.fn(),
    findManyMock: vi.fn(),
    deleteWhereMock: vi.fn(),
    updateWhereMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
    db: {
        query: { products: { findMany: findManyMock } },
        delete: vi.fn(() => ({ where: deleteWhereMock })),
        update: vi.fn(() => ({ set: vi.fn(() => ({ where: updateWhereMock })) })),
    },
    products: {
        id: "id",
        isSold: "isSold",
        scheduledDeleteAt: "scheduledDeleteAt",
        orderId: "orderId",
    },
}));

vi.mock("drizzle-orm", () => ({
    and: vi.fn(),
    eq: vi.fn(),
    isNotNull: vi.fn(),
    lte: vi.fn(),
    sql: vi.fn(),
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
    });

    it("deletes every expired product and reports them", async () => {
        findManyMock.mockResolvedValue([soldProduct("p1", "Steam key"), soldProduct("p2", "Netflix")]);

        const result = await runAutoDelete();

        expect(result.deleted).toBe(2);
        expect(result.names).toEqual(["Steam key", "Netflix"]);
        expect(deleteWhereMock).toHaveBeenCalledTimes(2);
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
            resourceName: "Auto-deleted 1 products",
            details: expect.objectContaining({
                reason: "auto_delete_cron",
                deletedProducts: [expect.objectContaining({ id: "p1", name: "Steam key" })],
            }),
        }));
    });

    it("clears the order link before deleting a product that has one", async () => {
        findManyMock.mockResolvedValue([soldProduct("p1", "Steam key", "order-1")]);

        await runAutoDelete();

        expect(updateWhereMock).toHaveBeenCalledTimes(1);
        expect(deleteWhereMock).toHaveBeenCalledTimes(1);
    });

    it("does not audit when nothing was due for deletion", async () => {
        findManyMock.mockResolvedValue([]);

        const result = await runAutoDelete();

        expect(result).toEqual({ deleted: 0, names: [], deletedItems: [] });
        expect(createAuditLogMock).not.toHaveBeenCalled();
    });

    it("skips a product that fails to delete without aborting the batch or over-reporting", async () => {
        findManyMock.mockResolvedValue([soldProduct("p1", "Steam key"), soldProduct("p2", "Netflix")]);
        deleteWhereMock.mockRejectedValueOnce(new Error("FK constraint"));
        vi.spyOn(console, "error").mockImplementation(() => {});

        const result = await runAutoDelete();

        expect(result.deleted).toBe(1);
        expect(result.names).toEqual(["Netflix"]);
        expect(createAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
            resourceName: "Auto-deleted 1 products",
        }));
    });
});
