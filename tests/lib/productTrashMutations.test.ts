import { describe, it, expect, vi, beforeEach } from "vitest";

const { updateSetMock, updateWhereMock, deleteWhereMock } = vi.hoisted(() => ({
    updateSetMock: vi.fn(),
    updateWhereMock: vi.fn(),
    deleteWhereMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
    db: {
        update: vi.fn(() => ({ set: updateSetMock.mockReturnValue({ where: updateWhereMock }) })),
        delete: vi.fn(() => ({ where: deleteWhereMock })),
    },
    products: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn((col, value) => ({ col, value })) }));

vi.mock("@/lib/utils/date", () => ({ mysqlNow: () => "2026-08-29 12:00:00" }));

vi.mock("@/lib/features/products/shared", () => ({
    buildProductInsertValues: vi.fn(),
    buildProductUpdateValues: vi.fn(),
}));

vi.mock("@/lib/encryption", () => ({ encrypt: vi.fn((value: string) => value) }));

vi.mock("@/lib/stock", () => ({ getStockCount: vi.fn(() => 0) }));

import { deleteProduct, permanentlyDeleteProduct, restoreProduct } from "@/lib/features/products/mutations";

describe("product trash mutations", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        updateSetMock.mockReturnValue({ where: updateWhereMock });
    });

    it("deleteProduct only stamps deletedAt", () => {
        deleteProduct("p1");

        expect(updateSetMock).toHaveBeenCalledWith({ deletedAt: "2026-08-29 12:00:00" });
    });

    // A sold-out product keeps its auto-delete timer while it sits in the trash.
    // Restoring it without clearing that timer put it straight back on the next
    // sweep, so the restore button looked like it silently did nothing.
    it("restoreProduct clears the auto-delete timer along with deletedAt", () => {
        restoreProduct("p1");

        expect(updateSetMock).toHaveBeenCalledWith({ deletedAt: null, scheduledDeleteAt: null });
    });

    it("permanentlyDeleteProduct is the only mutation that drops the row", () => {
        permanentlyDeleteProduct("p1");

        expect(deleteWhereMock).toHaveBeenCalledTimes(1);
        expect(updateSetMock).not.toHaveBeenCalled();
    });
});
