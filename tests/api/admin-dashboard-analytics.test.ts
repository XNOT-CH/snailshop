/**
 * Tests for:
 * - /api/admin/dashboard/kpi-summary   (GET)
 * - /api/admin/dashboard/best-sellers  (GET)
 * - /api/admin/dashboard/sales-heatmap (GET)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({ requirePermission: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
  orders: { totalPrice: "totalPrice", purchasedAt: "purchasedAt", deletedAt: "deletedAt", productName: "productName", productImage: "productImage" },
  topups: { amount: "amount", status: "status", createdAt: "createdAt" },
  users: { creditBalance: "creditBalance" },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(), count: vi.fn(), eq: vi.fn(), gte: vi.fn(), isNull: vi.fn(), lt: vi.fn(), sql: vi.fn(),
}));

import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED = { success: true, permissions: ["dashboard:view"] };
const DENIED = { success: false, error: "Unauthorized" };

/** select().from().where() resolving to `rows` (kpi-summary shape). */
const mockWhereSelect = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(rows) }),
});

/** select().from().where().groupBy() resolving to `rows` (heatmap shape). */
const mockGroupBySelect = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({ groupBy: vi.fn().mockResolvedValue(rows) }),
  }),
});

/** select().from().where().groupBy().orderBy().limit() resolving to `rows` (best-sellers shape). */
const mockLimitSelect = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      groupBy: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(rows) }),
      }),
    }),
  }),
});

// ════════════════════════════════════════════════════════════════
// /api/admin/dashboard/kpi-summary
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/dashboard/kpi-summary (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const mkReq = (params = "") =>
    new NextRequest(`http://localhost/api/admin/dashboard/kpi-summary${params}`);

  it("returns 401 without dashboard permission", async () => {
    (requirePermission as any).mockResolvedValue(DENIED);
    const { GET } = await import("@/app/api/admin/dashboard/kpi-summary/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(401);
  });

  it("returns current and previous metrics for range=7d", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    // Call order: current orders, current topups, previous orders, previous topups.
    (db.select as any) = vi.fn()
      .mockReturnValueOnce(mockWhereSelect([{ revenue: "1000", orderCount: 4 }]))
      .mockReturnValueOnce(mockWhereSelect([{ total: "1500" }]))
      .mockReturnValueOnce(mockWhereSelect([{ revenue: "500", orderCount: 2 }]))
      .mockReturnValueOnce(mockWhereSelect([{ total: "400" }]));

    const { GET } = await import("@/app/api/admin/dashboard/kpi-summary/route");
    const res = await GET(mkReq("?range=7d"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.range).toBe("7d");
    expect(body.current).toEqual({ revenue: 1000, orders: 4, aov: 250, topup: 1500, netInflow: 500 });
    expect(body.previous).toEqual({ revenue: 500, orders: 2, aov: 250, topup: 400, netInflow: -100 });
  });

  it("returns null previous and zero aov for range=all with no orders", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    (db.select as any) = vi.fn()
      .mockReturnValueOnce(mockWhereSelect([{ revenue: "0", orderCount: 0 }]))
      .mockReturnValueOnce(mockWhereSelect([{ total: "0" }]));

    const { GET } = await import("@/app/api/admin/dashboard/kpi-summary/route");
    const res = await GET(mkReq("?range=all"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.previous).toBeNull();
    expect(body.current.aov).toBe(0);
    expect((db.select as any)).toHaveBeenCalledTimes(2);
  });

  it("falls back to range=7d for an unknown range param", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    (db.select as any) = vi.fn().mockReturnValue(mockWhereSelect([{ revenue: "0", orderCount: 0, total: "0" }]));

    const { GET } = await import("@/app/api/admin/dashboard/kpi-summary/route");
    const res = await GET(mkReq("?range=bogus"));
    const body = await res.json();
    expect(body.range).toBe("7d");
  });

  it("returns 500 on DB error", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockRejectedValue(new Error("DB fail")) }),
    });
    const { GET } = await import("@/app/api/admin/dashboard/kpi-summary/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/dashboard/best-sellers
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/dashboard/best-sellers (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const mkReq = (params = "") =>
    new NextRequest(`http://localhost/api/admin/dashboard/best-sellers${params}`);

  it("returns 401 without dashboard permission", async () => {
    (requirePermission as any).mockResolvedValue(DENIED);
    const { GET } = await import("@/app/api/admin/dashboard/best-sellers/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(401);
  });

  it("returns ranked products with numeric units/revenue", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    (db.select as any) = vi.fn().mockReturnValue(mockLimitSelect([
      { productName: "ROV Account", productImage: "/rov.webp", units: "5", revenue: "2500" },
      { productName: null, productImage: null, units: "1", revenue: "100" },
    ]));

    const { GET } = await import("@/app/api/admin/dashboard/best-sellers/route");
    const res = await GET(mkReq("?range=30d"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toEqual({ productName: "ROV Account", productImage: "/rov.webp", units: 5, revenue: 2500 });
    expect(body.data[1].productName).toBe("(ไม่มีชื่อสินค้า)");
  });

  it("returns 500 on DB error", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockImplementation(() => { throw new Error("DB fail"); }) }),
    });
    const { GET } = await import("@/app/api/admin/dashboard/best-sellers/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/dashboard/sales-heatmap
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/dashboard/sales-heatmap (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 without dashboard permission", async () => {
    (requirePermission as any).mockResolvedValue(DENIED);
    const { GET } = await import("@/app/api/admin/dashboard/sales-heatmap/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns weekday/hour buckets with numeric values", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    (db.select as any) = vi.fn().mockReturnValue(mockGroupBySelect([
      { weekday: "0", hour: "13", orderCount: "3", revenue: "900" },
    ]));

    const { GET } = await import("@/app/api/admin/dashboard/sales-heatmap/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.windowDays).toBe(30);
    expect(body.data[0]).toEqual({ weekday: 0, hour: 13, orders: 3, revenue: 900 });
  });

  it("returns 500 on DB error", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ groupBy: vi.fn().mockRejectedValue(new Error("DB fail")) }) }),
    });
    const { GET } = await import("@/app/api/admin/dashboard/sales-heatmap/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
