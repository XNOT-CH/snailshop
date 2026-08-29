import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
    requirePermissionWithCsrfMock,
    findProductByIdMock,
    restoreProductMock,
    findConflictMock,
    decryptMock,
} = vi.hoisted(() => ({
    requirePermissionWithCsrfMock: vi.fn(),
    findProductByIdMock: vi.fn(),
    restoreProductMock: vi.fn(),
    findConflictMock: vi.fn(),
    decryptMock: vi.fn((value: string | null | undefined) => `decrypted:${value ?? ""}`),
}));

vi.mock("@/lib/auth", () => ({ requirePermissionWithCsrf: requirePermissionWithCsrfMock }));
vi.mock("@/lib/auditLog", () => ({
    auditFromRequest: vi.fn(),
    AUDIT_ACTIONS: { PRODUCT_RESTORE: "PRODUCT_RESTORE" },
}));
vi.mock("@/lib/cache", () => ({ invalidateProductCaches: vi.fn() }));
vi.mock("@/lib/features/products/mutations", () => ({ restoreProduct: restoreProductMock }));
vi.mock("@/lib/features/products/queries", () => ({
    findProductById: findProductByIdMock,
    listOtherProductsForStockCheck: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/features/products/shared", () => ({ decryptProductSecret: decryptMock }));
vi.mock("@/lib/features/products/stockValidation", () => ({
    findProductStockUserConflict: findConflictMock,
    productStockUserConflictResponseMessage: (conflict: { user: string; productName: string }) =>
        `User "${conflict.user}" มีอยู่ในสต็อกของสินค้า "${conflict.productName}" แล้ว`,
}));
vi.mock("@/lib/permissions", () => ({ PERMISSIONS: { PRODUCT_DELETE: "product:delete" } }));

function request() {
    return new NextRequest("http://localhost/api/products/p1/restore", { method: "POST" });
}

const params = { params: Promise.resolve({ id: "p1" }) };

const trashedProduct = {
    id: "p1",
    name: "Steam key",
    deletedAt: "2026-08-29 10:00:00",
    secretData: "encrypted-stock",
    stockSeparator: "newline",
};

describe("POST /api/products/[id]/restore", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requirePermissionWithCsrfMock.mockResolvedValue({ success: true, userId: "admin-1" });
        findProductByIdMock.mockResolvedValue(trashedProduct);
        findConflictMock.mockResolvedValue(null);
        decryptMock.mockImplementation((value: string | null | undefined) => `decrypted:${value ?? ""}`);
    });

    it("restores a product whose stock collides with nothing", async () => {
        const { POST } = await import("@/app/api/products/[id]/restore/route");

        const res = await POST(request(), params);

        expect(res.status).toBe(200);
        expect(restoreProductMock).toHaveBeenCalledWith("p1");
        expect(findConflictMock).toHaveBeenCalledWith("decrypted:encrypted-stock", "newline", expect.any(Function));
    });

    // Stock checks skip the trash, so a username can be handed to a new product
    // while this one waits there. Restoring blindly would duplicate the account.
    it("refuses to restore when its stock is now held by another product", async () => {
        findConflictMock.mockResolvedValue({ type: "crossProduct", user: "player1", productName: "Netflix" });
        const { POST } = await import("@/app/api/products/[id]/restore/route");

        const res = await POST(request(), params);
        const body = await res.json();

        expect(res.status).toBe(409);
        expect(body.message).toContain("player1");
        expect(body.message).toContain("Netflix");
        expect(restoreProductMock).not.toHaveBeenCalled();
    });

    it("still restores when the stock cannot be decrypted", async () => {
        decryptMock.mockImplementation(() => {
            throw new Error("bad key");
        });
        const { POST } = await import("@/app/api/products/[id]/restore/route");

        const res = await POST(request(), params);

        expect(res.status).toBe(200);
        expect(findConflictMock).toHaveBeenCalledWith("", "newline", expect.any(Function));
        expect(restoreProductMock).toHaveBeenCalledWith("p1");
    });

    it("404s for a product that is not in the trash", async () => {
        findProductByIdMock.mockResolvedValue({ ...trashedProduct, deletedAt: null });
        const { POST } = await import("@/app/api/products/[id]/restore/route");

        const res = await POST(request(), params);

        expect(res.status).toBe(404);
        expect(findConflictMock).not.toHaveBeenCalled();
        expect(restoreProductMock).not.toHaveBeenCalled();
    });
});
