import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ isAdmin: vi.fn() }));
vi.mock("@/lib/features/products/mutations", () => ({
  updateProductStock: vi.fn().mockResolvedValue(undefined),
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
});
