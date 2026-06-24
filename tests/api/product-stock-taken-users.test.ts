import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requirePermissionMock, requirePermissionWithCsrfMock } = vi.hoisted(() => ({
  requirePermissionMock: vi.fn(),
  requirePermissionWithCsrfMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requirePermission: requirePermissionMock,
  requirePermissionWithCsrf: requirePermissionWithCsrfMock,
}));

vi.mock("@/lib/features/products/queries", () => ({
  findProductById: vi.fn(),
  listOtherProductsForStockCheck: vi.fn().mockResolvedValue([]),
  listOtherProductsForTakenUsers: vi.fn(),
  listProductsForStockCheck: vi.fn(),
}));

vi.mock("@/lib/features/products/mutations", () => ({
  updateProductStock: vi.fn(),
}));

vi.mock("@/lib/encryption", () => ({
  decrypt: vi.fn((data: string) => {
    if (data === "bad-encrypted-stock") throw new Error("decrypt failed");
    return data.replace(/^encrypted_/, "");
  }),
}));

import { requirePermission } from "@/lib/auth";
import { listOtherProductsForTakenUsers, listProductsForStockCheck } from "@/lib/features/products/queries";

const mkParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("API: product stock taken users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (listOtherProductsForTakenUsers as any).mockResolvedValue([]);
    (listProductsForStockCheck as any).mockResolvedValue([]);
  });

  it("returns taken users for an existing product stock page", async () => {
    (requirePermission as any).mockResolvedValue({ success: true });
    (listOtherProductsForTakenUsers as any).mockResolvedValue([
      {
        name: "Existing Game",
        secretData: "encrypted_user1 / pass1\nuser2 / pass2",
        stockSeparator: "newline",
      },
    ]);

    const { GET } = await import("@/app/api/products/[id]/stock/route");
    const res = await GET(new NextRequest("http://localhost/api/products/p1/stock"), mkParams("p1"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: true,
      takenUsers: {
        user1: "Existing Game",
        user2: "Existing Game",
      },
    });
    expect(listOtherProductsForTakenUsers).toHaveBeenCalledWith("p1");
  });

  it("keeps the existing unauthorized shape for an existing product stock page", async () => {
    (requirePermission as any).mockResolvedValue({ success: false, error: "Unauthorized" });

    const { GET } = await import("@/app/api/products/[id]/stock/route");
    const res = await GET(new NextRequest("http://localhost/api/products/p1/stock"), mkParams("p1"));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ success: false, message: "Unauthorized" });
  });

  it("returns taken users for the create product stock page", async () => {
    (requirePermission as any).mockResolvedValue({ success: true });
    (listProductsForStockCheck as any).mockResolvedValue([
      {
        name: "Existing Game",
        secretData: "encrypted_user1 / pass1",
        stockSeparator: "newline",
      },
      {
        name: "Broken Game",
        secretData: "bad-encrypted-stock",
        stockSeparator: "newline",
      },
    ]);

    const { GET } = await import("@/app/api/products/new/stock/route");
    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: true,
      takenUsers: { user1: "Existing Game" },
    });
    expect(listProductsForStockCheck).toHaveBeenCalledOnce();
  });

  it("returns 401 for the create product stock page without product-create permission", async () => {
    (requirePermission as any).mockResolvedValue({ success: false, error: "Unauthorized" });

    const { GET } = await import("@/app/api/products/new/stock/route");
    const res = await GET();

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ success: false, message: "Unauthorized" });
  });
});
