/**
 * Tests for /api/admin/dashboard/kpi-compare (GET)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({ requirePermission: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
  orders: { totalPrice: "totalPrice", purchasedAt: "purchasedAt", deletedAt: "deletedAt" },
  topups: { amount: "amount", status: "status", createdAt: "createdAt" },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(), count: vi.fn(), eq: vi.fn(), gte: vi.fn(), isNull: vi.fn(), lt: vi.fn(), sql: vi.fn(),
}));

vi.mock("@/lib/seasonPass", () => ({
  // Season Pass revenue is summed from its own table; these tests only cover the
  // order/topup side, so it contributes nothing here.
  getSeasonPassRevenueTotal: vi.fn().mockResolvedValue({ revenue: 0, sales: 0 }),
  getSeasonPassRevenueBuckets: vi.fn().mockResolvedValue(new Map()),
}));

import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED = { success: true, permissions: ["dashboard:view"] };
const DENIED = { success: false, error: "Unauthorized" };

/** select().from().where().groupBy() resolving to `rows`. */
const mockGroupBySelect = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({ groupBy: vi.fn().mockResolvedValue(rows) }),
  }),
});

const mkReq = (params = "") =>
  new NextRequest(`http://localhost/api/admin/dashboard/kpi-compare${params}`);

const VALID = "?aStart=2026-07-05&aEnd=2026-07-11&bStart=2026-06-28&bEnd=2026-07-04";

describe("API: /api/admin/dashboard/kpi-compare (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 without dashboard permission", async () => {
    (requirePermission as any).mockResolvedValue(DENIED);
    const { GET } = await import("@/app/api/admin/dashboard/kpi-compare/route");
    const res = await GET(mkReq(VALID));
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing, malformed, reversed, or oversized periods", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    const { GET } = await import("@/app/api/admin/dashboard/kpi-compare/route");
    const badParams = [
      "",
      "?aStart=2026-07-05&aEnd=2026-07-11", // missing B
      "?aStart=05/07/2026&aEnd=2026-07-11&bStart=2026-06-28&bEnd=2026-07-04", // malformed
      "?aStart=2026-07-11&aEnd=2026-07-05&bStart=2026-06-28&bEnd=2026-07-04", // reversed
      "?aStart=2020-01-01&aEnd=2026-07-11&bStart=2026-06-28&bEnd=2026-07-04", // > 366 days
    ];
    for (const params of badParams) {
      const res = await GET(mkReq(params));
      expect(res.status).toBe(400);
    }
    expect(db.select as any).not.toHaveBeenCalled();
  });

  it("returns daily points and totals for both periods", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    // Call order: A orders, A topups, B orders, B topups.
    (db.select as any) = vi.fn()
      .mockReturnValueOnce(mockGroupBySelect([
        { key: "2026-07-05", revenue: "100", orderCount: 1 },
        { key: "2026-07-11", revenue: "300", orderCount: 2 },
      ]))
      .mockReturnValueOnce(mockGroupBySelect([{ key: "2026-07-11", total: "500" }]))
      .mockReturnValueOnce(mockGroupBySelect([{ key: "2026-07-04", revenue: "200", orderCount: 1 }]))
      .mockReturnValueOnce(mockGroupBySelect([]));

    const { GET } = await import("@/app/api/admin/dashboard/kpi-compare/route");
    const res = await GET(mkReq(VALID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.granularity).toBe("day");

    expect(body.a.points).toHaveLength(7);
    expect(body.a.points[0].date).toBe("2026-07-05");
    expect(body.a.points[0].revenue).toBe(100);
    expect(body.a.points[6]).toEqual({ date: "2026-07-11", revenue: 300, orders: 2, aov: 150, topup: 500, netInflow: 200, seasonPassRevenue: 0 });
    // Totals aggregate across buckets; AOV is total revenue / total orders.
    expect(body.a.totals).toEqual({ revenue: 400, orders: 3, aov: 400 / 3, topup: 500, netInflow: 100, seasonPassRevenue: 0 });

    expect(body.b.points).toHaveLength(7);
    expect(body.b.totals).toEqual({ revenue: 200, orders: 1, aov: 200, topup: 0, netInflow: -200, seasonPassRevenue: 0 });
  });

  it("uses hourly buckets when both periods are a single day", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    (db.select as any) = vi.fn()
      .mockReturnValueOnce(mockGroupBySelect([{ key: "2026-07-11T09", revenue: "80", orderCount: 1 }]))
      .mockReturnValueOnce(mockGroupBySelect([]))
      .mockReturnValueOnce(mockGroupBySelect([]))
      .mockReturnValueOnce(mockGroupBySelect([]));

    const { GET } = await import("@/app/api/admin/dashboard/kpi-compare/route");
    const res = await GET(mkReq("?aStart=2026-07-11&aEnd=2026-07-11&bStart=2026-07-04&bEnd=2026-07-04"));
    const body = await res.json();
    expect(body.granularity).toBe("hour");
    expect(body.a.points).toHaveLength(24);
    expect(body.a.points[9].date).toBe("2026-07-11T09");
    expect(body.a.points[9].revenue).toBe(80);
    expect(body.b.points).toHaveLength(24);
  });

  it("keeps daily buckets when only one period is a single day", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    (db.select as any) = vi.fn().mockReturnValue(mockGroupBySelect([]));

    const { GET } = await import("@/app/api/admin/dashboard/kpi-compare/route");
    const res = await GET(mkReq("?aStart=2026-07-11&aEnd=2026-07-11&bStart=2026-06-28&bEnd=2026-07-04"));
    const body = await res.json();
    expect(body.granularity).toBe("day");
    expect(body.a.points).toHaveLength(1);
    expect(body.b.points).toHaveLength(7);
  });

  it("returns 500 on DB error", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ groupBy: vi.fn().mockRejectedValue(new Error("DB fail")) }),
      }),
    });
    const { GET } = await import("@/app/api/admin/dashboard/kpi-compare/route");
    const res = await GET(mkReq(VALID));
    expect(res.status).toBe(500);
  });
});
