import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { findManyMock, andMock, neMock, isNullMock } = vi.hoisted(() => ({
    findManyMock: vi.fn(),
    andMock: vi.fn((...parts: unknown[]) => ({ and: parts })),
    neMock: vi.fn((col: unknown, value: unknown) => ({ ne: [col, value] })),
    isNullMock: vi.fn((col: unknown) => ({ isNull: col })),
}));

vi.mock("@/lib/db", () => ({
    db: { query: { products: { findMany: findManyMock, findFirst: vi.fn() } } },
    products: { id: "id", deletedAt: "deletedAt" },
}));

vi.mock("drizzle-orm", () => ({
    and: andMock,
    eq: vi.fn(),
    isNull: isNullMock,
    ne: neMock,
}));

import {
    listOtherProductsForStockCheck,
    listOtherProductsForTakenUsers,
    listProductsForStockCheck,
} from "@/lib/features/products/queries";

// The stock-conflict scans read every product row, so a sold-out product sitting
// in the trash used to keep reserving its usernames — and since auto-delete now
// parks products there instead of dropping them, that reservation never expires.
describe("product stock-check queries", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        findManyMock.mockResolvedValue([]);
        // The test-env branch of these helpers skips the where clause entirely.
        vi.stubEnv("NODE_ENV", "development");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("listProductsForStockCheck ignores products in the trash", async () => {
        await listProductsForStockCheck();

        expect(isNullMock).toHaveBeenCalledWith("deletedAt");
        expect(findManyMock).toHaveBeenCalledWith(
            expect.objectContaining({ where: { isNull: "deletedAt" } })
        );
    });

    it("listOtherProductsForStockCheck ignores the edited product and the trash", async () => {
        await listOtherProductsForStockCheck("p1");

        expect(neMock).toHaveBeenCalledWith("id", "p1");
        expect(isNullMock).toHaveBeenCalledWith("deletedAt");
        expect(andMock).toHaveBeenCalledWith({ ne: ["id", "p1"] }, { isNull: "deletedAt" });
    });

    it("listOtherProductsForTakenUsers ignores the trash too", async () => {
        await listOtherProductsForTakenUsers("p1");

        expect(isNullMock).toHaveBeenCalledWith("deletedAt");
        expect(andMock).toHaveBeenCalledWith({ ne: ["id", "p1"] }, { isNull: "deletedAt" });
    });
});
