/**
 * Tests for /api/admin/dashboard/member-insights (GET)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({ requirePermission: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
  users: {
    id: "id", username: "username", name: "name", image: "image",
    creditBalance: "creditBalance", lastLoginAt: "lastLoginAt", createdAt: "createdAt",
  },
  orders: { userId: "userId", totalPrice: "totalPrice", purchasedAt: "purchasedAt", deletedAt: "deletedAt" },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(), count: vi.fn(), countDistinct: vi.fn(), desc: vi.fn(), eq: vi.fn(),
  gte: vi.fn(), isNull: vi.fn(), lt: vi.fn(), or: vi.fn(), sql: vi.fn(),
}));

import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED = { success: true, permissions: ["dashboard:view"] };
const DENIED = { success: false, error: "Unauthorized" };

/** select().from().where() resolving to `rows`. */
const mockWhereSelect = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(rows) }),
});

/** select().from() resolving to `rows` (no where). */
const mockFromSelect = (rows: unknown[]) => ({ from: vi.fn().mockResolvedValue(rows) });

/** select().from().innerJoin().where().groupBy().orderBy().limit() resolving to `rows`. */
const mockSpenderSelect = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({
    innerJoin: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        groupBy: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(rows) }),
        }),
      }),
    }),
  }),
});

/** select().from().where().orderBy().limit() resolving to `rows`. */
const mockAtRiskSelect = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(rows) }),
    }),
  }),
});

/** select().from().innerJoin().where() resolving to `rows`. */
const mockJoinWhereSelect = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({
    innerJoin: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(rows) }),
  }),
});

/**
 * Call order: active today, active 7d, total members, buyers,
 * credit holders, top spenders, at-risk list, at-risk aggregate,
 * new-vs-returning.
 */
function mockAllSelects() {
  (db.select as any) = vi.fn()
    .mockReturnValueOnce(mockWhereSelect([{ activeToday: 12 }]))
    .mockReturnValueOnce(mockWhereSelect([{ active7d: 40 }]))
    .mockReturnValueOnce(mockFromSelect([{ totalMembers: 200 }]))
    .mockReturnValueOnce(mockWhereSelect([{ buyers: 80 }]))
    .mockReturnValueOnce(mockWhereSelect([{ creditHolders: 30, creditOutstanding: "1500.50" }]))
    .mockReturnValueOnce(mockSpenderSelect([
      { id: "u1", username: "whale", name: "Whale", image: null, creditBalance: "10.00", totalSpent: "9000", orderCount: 12 },
    ]))
    .mockReturnValueOnce(mockAtRiskSelect([
      { id: "u2", username: "ghost", name: null, image: null, creditBalance: "300.00", lastLoginAt: "2026-01-01 08:00:00" },
      { id: "u3", username: "never", name: null, image: null, creditBalance: "50.00", lastLoginAt: null },
    ]))
    .mockReturnValueOnce(mockWhereSelect([{ atRiskCount: 5, atRiskCredit: "980" }]))
    .mockReturnValueOnce(mockJoinWhereSelect([{ newRevenue: "1200", returningRevenue: "4800" }]));
}

const mkReq = (params = "") =>
  new NextRequest(`http://localhost/api/admin/dashboard/member-insights${params}`);

describe("API: /api/admin/dashboard/member-insights (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 without dashboard permission", async () => {
    (requirePermission as any).mockResolvedValue(DENIED);
    const { GET } = await import("@/app/api/admin/dashboard/member-insights/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(401);
  });

  it("returns activity, spender, at-risk, and revenue-split insights", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    mockAllSelects();

    const { GET } = await import("@/app/api/admin/dashboard/member-insights/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.spenderRange).toBe("30d");
    expect(body.activeToday).toBe(12);
    expect(body.active7d).toBe(40);
    expect(body.totalMembers).toBe(200);
    expect(body.buyers).toBe(80);
    expect(body.creditHolders).toBe(30);
    expect(body.creditOutstanding).toBe(1500.5);

    expect(body.topSpenders).toEqual([
      { id: "u1", username: "whale", name: "Whale", image: null, creditBalance: 10, totalSpent: 9000, orderCount: 12 },
    ]);

    expect(body.atRisk.count).toBe(5);
    expect(body.atRisk.credit).toBe(980);
    expect(body.atRisk.users).toHaveLength(2);
    expect(body.atRisk.users[0].creditBalance).toBe(300);
    expect(body.atRisk.users[1].lastLoginAt).toBeNull();

    expect(body.newVsReturning).toEqual({ newRevenue: 1200, returningRevenue: 4800 });
  });

  it("accepts spenders=all and echoes the range", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    mockAllSelects();

    const { GET } = await import("@/app/api/admin/dashboard/member-insights/route");
    const res = await GET(mkReq("?spenders=all"));
    const body = await res.json();
    expect(body.spenderRange).toBe("all");
  });

  it("returns 500 on DB error", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockRejectedValue(new Error("DB fail")) }),
    });
    const { GET } = await import("@/app/api/admin/dashboard/member-insights/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(500);
  });
});
