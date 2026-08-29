import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
    requireAnyPermissionWithCsrfMock,
    listProductsForStockCheckMock,
    listOtherProductsForStockCheckMock,
} = vi.hoisted(() => ({
    requireAnyPermissionWithCsrfMock: vi.fn(),
    listProductsForStockCheckMock: vi.fn(),
    listOtherProductsForStockCheckMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAnyPermissionWithCsrf: requireAnyPermissionWithCsrfMock }));
vi.mock("@/lib/features/products/queries", () => ({
    listProductsForStockCheck: listProductsForStockCheckMock,
    listOtherProductsForStockCheck: listOtherProductsForStockCheckMock,
}));
vi.mock("@/lib/encryption", () => ({
    decrypt: vi.fn((data: string) => {
        if (data === "bad-encrypted-stock") throw new Error("decrypt failed");
        return data.replace(/^encrypted_/, "");
    }),
}));
vi.mock("@/lib/permissions", () => ({
    PERMISSIONS: { PRODUCT_CREATE: "product:create", PRODUCT_EDIT: "product:edit" },
}));

function request(body: unknown) {
    return new NextRequest("http://localhost/api/admin/products/stock-check", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

const existingProducts = [
    { name: "Existing Game", secretData: "encrypted_taken1 / pass1\ntaken2 / pass2", stockSeparator: "newline" },
    { name: "Broken Game", secretData: "bad-encrypted-stock", stockSeparator: "newline" },
];

describe("POST /api/admin/products/stock-check", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireAnyPermissionWithCsrfMock.mockResolvedValue({ success: true, userId: "admin-1" });
        listProductsForStockCheckMock.mockResolvedValue(existingProducts);
        listOtherProductsForStockCheckMock.mockResolvedValue(existingProducts);
    });

    // The point of the endpoint: answer for the names on screen, not for the shop.
    it("returns only the asked-for usernames that another product holds", async () => {
        const { POST } = await import("@/app/api/admin/products/stock-check/route");

        const res = await POST(request({ users: ["taken1", "free1"] }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.conflicts).toEqual({ taken1: "Existing Game" });
    });

    it("skips products whose stock cannot be decrypted", async () => {
        const { POST } = await import("@/app/api/admin/products/stock-check/route");

        const res = await POST(request({ users: ["taken1", "taken2"] }));

        expect((await res.json()).conflicts).toEqual({
            taken1: "Existing Game",
            taken2: "Existing Game",
        });
    });

    it("excludes the product being edited when asked to", async () => {
        const { POST } = await import("@/app/api/admin/products/stock-check/route");

        await POST(request({ users: ["taken1"], excludeProductId: "p1" }));

        expect(listOtherProductsForStockCheckMock).toHaveBeenCalledWith("p1");
        expect(listProductsForStockCheckMock).not.toHaveBeenCalled();
    });

    it("does not touch the database for an empty list", async () => {
        const { POST } = await import("@/app/api/admin/products/stock-check/route");

        const res = await POST(request({ users: [] }));

        expect((await res.json()).conflicts).toEqual({});
        expect(listProductsForStockCheckMock).not.toHaveBeenCalled();
    });

    it("refuses callers without product create or edit permission", async () => {
        requireAnyPermissionWithCsrfMock.mockResolvedValue({ success: false, error: "Unauthorized" });
        const { POST } = await import("@/app/api/admin/products/stock-check/route");

        const res = await POST(request({ users: ["taken1"] }));

        expect(res.status).toBe(401);
        expect(listProductsForStockCheckMock).not.toHaveBeenCalled();
    });
});
