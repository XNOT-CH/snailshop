import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  requirePermission: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(),
    query: {
      products: {
        findFirst: vi.fn(),
      },
    },
  },
  products: { id: "id" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));
vi.mock("@/lib/utils/date", () => ({ mysqlNow: vi.fn(() => "2026-01-01 00:00:00") }));
vi.mock("@/lib/permissions", () => ({
  PERMISSIONS: {
    PRODUCT_CREATE: "PRODUCT_CREATE",
  },
}));

import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";

const mkParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("API: /api/admin/products/[id]/duplicate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preserves key product fields on duplicate", async () => {
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    (requirePermission as any).mockResolvedValue({ success: true });
    (db.insert as any).mockReturnValue({ values: valuesMock });
    (db.query.products.findFirst as any)
      .mockResolvedValueOnce({
        id: "p1",
        name: "Point Product",
        description: "Desc",
        price: "100",
        discountPrice: "80",
        imageUrl: "/cover.png",
        imageUrls: ["/cover.png", "/gallery.png"],
        category: "Games",
        currency: "POINT",
        stockSeparator: "comma",
        autoDeleteAfterSale: 60,
      })
      .mockResolvedValueOnce({ id: "p2", name: "Point Product (สำเนา)" });

    const { POST } = await import("@/app/api/admin/products/[id]/duplicate/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST" }), mkParams("p1"));

    expect(res.status).toBe(200);
    expect(valuesMock).toHaveBeenCalledWith(expect.objectContaining({
      discountPrice: "80",
      imageUrls: ["/cover.png", "/gallery.png"],
      currency: "POINT",
      stockSeparator: "comma",
      autoDeleteAfterSale: 60,
    }));
  });
});
