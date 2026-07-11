/**
 * Tests for /api/admin/dashboard/kpi-breakdown (GET)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

const ZERO = { revenue: 0, orders: 0, aov: 0, topup: 0, netInflow: 0 };

const mkReq = (params = "") =>
  new NextRequest(`http://localhost/api/admin/dashboard/kpi-breakdown${params}`);

describe("API: /api/admin/dashboard/kpi-breakdown (GET)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 2026-07-11 10:30 Thai time (UTC+7) so bucket keys are deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-11T03:30:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 401 without dashboard permission", async () => {
    (requirePermission as any).mockResolvedValue(DENIED);
    const { GET } = await import("@/app/api/admin/dashboard/kpi-breakdown/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(401);
  });

  it("returns aligned daily points for range=7d", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    // Call order: current orders, current topups, previous orders, previous topups.
    (db.select as any) = vi.fn()
      .mockReturnValueOnce(mockGroupBySelect([{ key: "2026-07-11", revenue: "300", orderCount: 2 }]))
      .mockReturnValueOnce(mockGroupBySelect([{ key: "2026-07-11", total: "500" }]))
      .mockReturnValueOnce(mockGroupBySelect([{ key: "2026-07-04", revenue: "100", orderCount: 1 }]))
      .mockReturnValueOnce(mockGroupBySelect([]));

    const { GET } = await import("@/app/api/admin/dashboard/kpi-breakdown/route");
    const res = await GET(mkReq("?range=7d"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.range).toBe("7d");
    expect(body.granularity).toBe("day");
    expect(body.points).toHaveLength(7);

    const first = body.points[0];
    expect(first.date).toBe("2026-07-05");
    expect(first.previousDate).toBe("2026-06-28");
    expect(first.current).toEqual(ZERO);

    const last = body.points[6];
    expect(last.date).toBe("2026-07-11");
    expect(last.previousDate).toBe("2026-07-04");
    expect(last.current).toEqual({ revenue: 300, orders: 2, aov: 150, topup: 500, netInflow: 200 });
    expect(last.previous).toEqual({ revenue: 100, orders: 1, aov: 100, topup: 0, netInflow: -100 });
  });

  it("returns hourly points up to the current Thai hour for range=today", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    (db.select as any) = vi.fn()
      .mockReturnValueOnce(mockGroupBySelect([{ key: "2026-07-11T10", revenue: "50", orderCount: 1 }]))
      .mockReturnValueOnce(mockGroupBySelect([]))
      .mockReturnValueOnce(mockGroupBySelect([]))
      .mockReturnValueOnce(mockGroupBySelect([{ key: "2026-07-10T00", total: "20" }]));

    const { GET } = await import("@/app/api/admin/dashboard/kpi-breakdown/route");
    const res = await GET(mkReq("?range=today"));
    const body = await res.json();
    expect(body.granularity).toBe("hour");
    // Thai time is 10:30 → buckets 00:00 through 10:00.
    expect(body.points).toHaveLength(11);
    expect(body.points[0].date).toBe("2026-07-11T00");
    expect(body.points[0].previousDate).toBe("2026-07-10T00");
    expect(body.points[0].previous.topup).toBe(20);
    expect(body.points[10].date).toBe("2026-07-11T10");
    expect(body.points[10].current.revenue).toBe(50);
  });

  it("falls back to range=7d for non-comparable or unknown ranges", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    (db.select as any) = vi.fn().mockReturnValue(mockGroupBySelect([]));

    const { GET } = await import("@/app/api/admin/dashboard/kpi-breakdown/route");
    for (const param of ["?range=all", "?range=bogus", ""]) {
      const res = await GET(mkReq(param));
      const body = await res.json();
      expect(body.range).toBe("7d");
      expect(body.points).toHaveLength(7);
    }
  });

  it("returns 500 on DB error", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ groupBy: vi.fn().mockRejectedValue(new Error("DB fail")) }),
      }),
    });
    const { GET } = await import("@/app/api/admin/dashboard/kpi-breakdown/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(500);
  });
});
