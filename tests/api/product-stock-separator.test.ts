import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { isAdminMock } = vi.hoisted(() => ({
  isAdminMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  isAdmin: isAdminMock,
  isAdminWithCsrf: isAdminMock,
  requirePermission: isAdminMock,
  requirePermissionWithCsrf: isAdminMock,
  requireAnyPermission: isAdminMock,
  requireAnyPermissionWithCsrf: isAdminMock,
}));
vi.mock("@/lib/features/products/mutations", () => ({
  updateProductStock: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/cache", () => ({
  invalidateProductCaches: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: { PRODUCT_UPDATE: "PRODUCT_UPDATE" },
}));
vi.mock("@/lib/features/products/queries", () => ({
  findProductById: vi.fn(),
  listOtherProductsForStockCheck: vi.fn().mockResolvedValue([]),
  listOtherProductsForTakenUsers: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/features/products/shared", () => ({
  extractStockUsers: vi.fn(() => ["user1", "user2"]),
  extractUsersFromEncryptedStock: vi.fn(() => []),
}));

import { isAdmin } from "@/lib/auth";
import { findProductById } from "@/lib/features/products/queries";
import { extractStockUsers } from "@/lib/features/products/shared";
import { updateProductStock } from "@/lib/features/products/mutations";
import { invalidateProductCaches } from "@/lib/cache";

const mkParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("API: /api/products/[id]/stock separator handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the product stockSeparator when validating incoming stock", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (findProductById as any).mockResolvedValue({
      id: "p1",
      name: "Comma Product",
      stockSeparator: "comma",
    });

    const { PUT } = await import("@/app/api/products/[id]/stock/route");
    const req = new NextRequest("http://localhost/api/products/p1/stock", {
      method: "PUT",
      body: JSON.stringify({ secretData: "user1 / pass1,user2 / pass2" }),
    });
    const res = await PUT(req, mkParams("p1"));

    expect(res.status).toBe(200);
    expect(extractStockUsers).toHaveBeenCalledWith("user1 / pass1,user2 / pass2", "comma");
  });

  it("stores the separator the request asks for, not the one already on the row", async () => {
    // The picker in the editor is only honest if this value survives. The route
    // used to read the separator off the product and ignore the body entirely,
    // so the preview and the purchase-time split could disagree.
    (isAdmin as any).mockResolvedValue({ success: true, userId: "admin-1" });
    (findProductById as any).mockResolvedValue({ id: "p1", name: "P", stockSeparator: "newline" });

    const { PUT } = await import("@/app/api/products/[id]/stock/route");
    const req = new NextRequest("http://localhost/api/products/p1/stock", {
      method: "PUT",
      body: JSON.stringify({ secretData: "a|b|c", stockSeparator: "pipe" }),
    });
    const res = await PUT(req, mkParams("p1"));

    expect(res.status).toBe(200);
    expect(updateProductStock).toHaveBeenCalledWith("p1", { secretData: "a|b|c", stockSeparator: "pipe" });
    expect(extractStockUsers).toHaveBeenCalledWith("a|b|c", "pipe");
  });

  it("rejects a separator that getDelimiter does not understand, without writing", async () => {
    // An unknown value would fall through the fallback in getDelimiter and
    // mean newline when the buyer's slice is taken.
    (isAdmin as any).mockResolvedValue({ success: true, userId: "admin-1" });
    (findProductById as any).mockResolvedValue({ id: "p1", name: "P", stockSeparator: "newline" });

    const { PUT } = await import("@/app/api/products/[id]/stock/route");
    const req = new NextRequest("http://localhost/api/products/p1/stock", {
      method: "PUT",
      body: JSON.stringify({ secretData: "a;b", stockSeparator: "emoji" }),
    });
    const res = await PUT(req, mkParams("p1"));

    expect(res.status).toBe(400);
    expect(updateProductStock).not.toHaveBeenCalled();
  });

  it("invalidates the product caches so the shop stops showing a stale count", async () => {
    (isAdmin as any).mockResolvedValue({ success: true, userId: "admin-1" });
    (findProductById as any).mockResolvedValue({ id: "p1", name: "P", stockSeparator: "newline" });

    const { PUT } = await import("@/app/api/products/[id]/stock/route");
    const req = new NextRequest("http://localhost/api/products/p1/stock", {
      method: "PUT",
      body: JSON.stringify({ secretData: "a\nb" }),
    });

    expect((await PUT(req, mkParams("p1"))).status).toBe(200);
    expect(invalidateProductCaches).toHaveBeenCalled();
  });
});
