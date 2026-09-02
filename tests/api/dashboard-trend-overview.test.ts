/**
 * Comprehensive tests for dashboard/topup-trend
 * The route is admin/auth-protected and uses db.select() aggregations
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => {
  const mockWhere = vi.fn().mockResolvedValue([]);
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
  return {
    db: {
      query: { users: { findFirst: vi.fn() } },
      select: mockSelect,
    },
    users: { id: "id", creditBalance: "creditBalance" },
    orders: { userId: "u", purchasedAt: "p", totalPrice: "t", status: "s" },
    topups: { userId: "u", status: "s", createdAt: "c", amount: "a" },
  };
});

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), gte: vi.fn(), lte: vi.fn(),
  sum: vi.fn(), count: vi.fn(), isNull: vi.fn(),
}));

import { auth } from "@/auth";
import { db } from "@/lib/db";

// ─── topup-trend ─────────────────────────────────────────────────────────────
describe("API: /api/dashboard/topup-trend (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const mkReq = (url = "http://localhost/api/dashboard/topup-trend") => new NextRequest(url);
  const ADMIN = { user: { id: "u1", role: "ADMIN" } };

  it("returns 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/dashboard/topup-trend/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", role: "USER" } });
    const { GET } = await import("@/app/api/dashboard/topup-trend/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(403);
  });

  it("returns success with empty topup list (default 7-day range)", async () => {
    (auth as any).mockResolvedValue(ADMIN);
    // db.select chain returns empty array
    const mockDb = db as any;
    mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) });

    const { GET } = await import("@/app/api/dashboard/topup-trend/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(7); // 7-8 days (Math.round on 23:59:59 end)
  });

  it("returns success with startDate/endDate range", async () => {
    (auth as any).mockResolvedValue(ADMIN);
    const mockDb = db as any;
    mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) });

    const { GET } = await import("@/app/api/dashboard/topup-trend/route");
    const res = await GET(mkReq("http://localhost/api/dashboard/topup-trend?startDate=2026-03-01&endDate=2026-03-07"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(7); // 7-8 entries (inclusive range with time rounding)
  });

  it("aggregates APPROVED topups into daily amounts", async () => {
    (auth as any).mockResolvedValue(ADMIN);
    const mockDb = db as any;
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { amount: "500", status: "APPROVED", createdAt: "2026-03-14 10:00:00" },
          { amount: "200", status: "PENDING", createdAt: "2026-03-14 11:00:00" },
        ]),
      }),
    });

    const { GET } = await import("@/app/api/dashboard/topup-trend/route");
    const res = await GET(mkReq("http://localhost/api/dashboard/topup-trend?date=2026-03-14"));
    const body = await res.json();
    expect(body.success).toBe(true);
    const today = body.data.find((d: any) => d.rawDate === "2026-03-14");
    expect(today?.amount).toBe(500); // PENDING not counted in amount
    expect(today?.transactions).toBe(2); // both counted in transactions
  });

  it("uses single date param for 7-day window", async () => {
    (auth as any).mockResolvedValue(ADMIN);
    const mockDb = db as any;
    mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) });

    const { GET } = await import("@/app/api/dashboard/topup-trend/route");
    const res = await GET(mkReq("http://localhost/api/dashboard/topup-trend?date=2026-03-14"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(7);
  });
});
