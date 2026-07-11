/**
 * Tests for /api/admin/dashboard/stale-stock (GET)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({ requirePermission: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
  products: {
    id: "id", name: "name", imageUrl: "imageUrl", category: "category",
    price: "price", discountPrice: "discountPrice", stockCount: "stockCount",
    isSold: "isSold", createdAt: "createdAt",
  },
  orders: { productId: "productId", purchasedAt: "purchasedAt", deletedAt: "deletedAt" },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(), desc: vi.fn(), eq: vi.fn(), gt: vi.fn(), gte: vi.fn(),
  isNull: vi.fn(), lt: vi.fn(), notExists: vi.fn(), or: vi.fn(), sql: vi.fn(),
}));

import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED = { success: true, permissions: ["dashboard:view"] };
const DENIED = { success: false, error: "Unauthorized" };

/** select().from().where().orderBy().limit() resolving to `rows`. */
const mockListSelect = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(rows) }),
    }),
  }),
});

/** select().from().where() resolving to `rows`. */
const mockWhereSelect = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(rows) }),
});

/** The notExists subquery builds a select().from().where() chain that is never awaited. */
const mockSubquerySelect = () => ({
  from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({}) }),
});

const mkReq = (params = "") =>
  new NextRequest(`http://localhost/api/admin/dashboard/stale-stock${params}`);

describe("API: /api/admin/dashboard/stale-stock (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 without dashboard permission", async () => {
    (requirePermission as any).mockResolvedValue(DENIED);
    const { GET } = await import("@/app/api/admin/dashboard/stale-stock/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(401);
  });

  it("returns stale items with totals and normalized numbers", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    // Call order: notExists subquery select, list select, totals select.
    (db.select as any) = vi.fn()
      .mockReturnValueOnce(mockSubquerySelect())
      .mockReturnValueOnce(mockListSelect([
        {
          id: "p1", name: "Account A", imageUrl: null, category: "game",
          price: "199.00", stockCount: 4, stuckValue: "796.00",
          lastSoldAt: "2026-05-01 10:00:00", createdAt: "2026-01-01 08:00:00",
        },
        {
          id: "p2", name: "Account B", imageUrl: "/x.webp", category: "game",
          price: "50.00", stockCount: null, stuckValue: "0.00",
          lastSoldAt: null, createdAt: "2026-02-01 08:00:00",
        },
      ]))
      .mockReturnValueOnce(mockWhereSelect([{ staleCount: 12, totalStuckValue: "3500.50" }]));

    const { GET } = await import("@/app/api/admin/dashboard/stale-stock/route");
    const res = await GET(mkReq("?days=60"));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.days).toBe(60);
    expect(body.staleCount).toBe(12);
    expect(body.totalStuckValue).toBe(3500.5);
    expect(body.items).toHaveLength(2);
    expect(body.items[0]).toMatchObject({ id: "p1", price: 199, stockCount: 4, stuckValue: 796 });
    expect(body.items[0].lastSoldAt).toContain("2026-05-01");
    expect(body.items[1].stockCount).toBeNull();
    expect(body.items[1].lastSoldAt).toBeNull();
  });

  it("falls back to 30 days for an unsupported days param", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    (db.select as any) = vi.fn()
      .mockReturnValueOnce(mockSubquerySelect())
      .mockReturnValueOnce(mockListSelect([]))
      .mockReturnValueOnce(mockWhereSelect([{ staleCount: 0, totalStuckValue: "0" }]));

    const { GET } = await import("@/app/api/admin/dashboard/stale-stock/route");
    const res = await GET(mkReq("?days=45"));
    const body = await res.json();
    expect(body.days).toBe(30);
    expect(body.items).toEqual([]);
  });

  it("returns 500 on DB error", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockRejectedValue(new Error("DB fail")) }),
        }),
      }),
    });
    const { GET } = await import("@/app/api/admin/dashboard/stale-stock/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(500);
  });
});
