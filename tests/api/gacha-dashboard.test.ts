/**
 * Tests for:
 * - /api/admin/dashboard/gacha-summary  (GET)
 * - /api/admin/dashboard/gacha-machines (GET)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({ requirePermission: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
  users: { id: "id", username: "username", name: "name", image: "image" },
  products: { id: "id", price: "price", discountPrice: "discountPrice" },
  gachaRollLogs: {
    userId: "userId", productId: "productId", tier: "tier", costType: "costType",
    costAmount: "costAmount", rewardValue: "rewardValue", gachaMachineId: "gachaMachineId", createdAt: "createdAt",
  },
  gachaMachines: { id: "id", name: "name", isActive: "isActive", isEnabled: "isEnabled" },
  gachaRewards: { gachaMachineId: "gachaMachineId", tier: "tier", probability: "probability", isActive: "isActive" },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(), count: vi.fn(), countDistinct: vi.fn(), desc: vi.fn(), eq: vi.fn(),
  gte: vi.fn(), lt: vi.fn(), sql: vi.fn(),
}));

import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED = { success: true, permissions: ["dashboard:view"] };
const DENIED = { success: false, error: "Unauthorized" };

const mockWhereSelect = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(rows) }),
});

const mockGroupBySelect = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({ groupBy: vi.fn().mockResolvedValue(rows) }),
  }),
});

const mockJoinGroupOrderLimitSelect = (rows: unknown[]) => ({
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

const mockJoinGroupSelect = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({
    leftJoin: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ groupBy: vi.fn().mockResolvedValue(rows) }),
    }),
  }),
});

const mockFromSelect = (rows: unknown[]) => ({ from: vi.fn().mockResolvedValue(rows) });

// ════════════════════════════════════════════════════════════════
// /api/admin/dashboard/gacha-summary
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/dashboard/gacha-summary (GET)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // 2026-07-11 10:30 Thai time so daily bucket keys are deterministic.
    vi.setSystemTime(new Date("2026-07-11T03:30:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mkReq = (params = "") =>
    new NextRequest(`http://localhost/api/admin/dashboard/gacha-summary${params}`);

  it("returns 401 without dashboard permission", async () => {
    (requirePermission as any).mockResolvedValue(DENIED);
    const { GET } = await import("@/app/api/admin/dashboard/gacha-summary/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(401);
  });

  it("returns kpis, daily series, top players, and distribution", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    // Call order: today, yesterday, 7d, prev 7d, range totals, daily, top players, per-player.
    (db.select as any) = vi.fn()
      .mockReturnValueOnce(mockWhereSelect([{ rolls: 12 }]))
      .mockReturnValueOnce(mockWhereSelect([{ rolls: 8 }]))
      .mockReturnValueOnce(mockWhereSelect([{ rolls: 60 }]))
      .mockReturnValueOnce(mockWhereSelect([{ rolls: 50 }]))
      .mockReturnValueOnce(mockWhereSelect([{ rolls: 200, paidRolls: "150", revenue: "3000", players: 40 }]))
      .mockReturnValueOnce(mockGroupBySelect([{ day: "2026-07-11", paid: "10", free: "2" }]))
      .mockReturnValueOnce(mockJoinGroupOrderLimitSelect([
        { id: "u1", username: "whale", name: null, image: null, rolls: 30, spent: "600" },
      ]))
      .mockReturnValueOnce(mockGroupBySelect([
        { userId: "u1", rolls: 30 },
        { userId: "u2", rolls: 1 },
        { userId: "u3", rolls: 4 },
      ]));

    const { GET } = await import("@/app/api/admin/dashboard/gacha-summary/route");
    const res = await GET(mkReq("?days=7"));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.days).toBe(7);
    expect(body.kpis).toMatchObject({
      rollsToday: 12,
      rollsYesterday: 8,
      rolls7d: 60,
      rollsPrev7d: 50,
      rangeRolls: 200,
      paidRolls: 150,
      freeRolls: 50,
      revenue: 3000,
      players: 40,
      avgRollsPerPlayer: 5,
    });

    expect(body.daily).toHaveLength(7);
    expect(body.daily[6]).toEqual({ date: "2026-07-11", paid: 10, free: 2 });
    expect(body.daily[0]).toEqual({ date: "2026-07-05", paid: 0, free: 0 });

    expect(body.topPlayers).toEqual([
      { id: "u1", username: "whale", name: null, image: null, rolls: 30, spent: 600 },
    ]);

    expect(body.distribution).toEqual([
      { key: "1", label: "1 ตา", players: 1 },
      { key: "2-5", label: "2–5 ตา", players: 1 },
      { key: "6-20", label: "6–20 ตา", players: 0 },
      { key: "21+", label: "21+ ตา", players: 1 },
    ]);
  });

  it("falls back to 30 days for an unsupported days param", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    (db.select as any) = vi.fn()
      .mockReturnValueOnce(mockWhereSelect([{ rolls: 0 }]))
      .mockReturnValueOnce(mockWhereSelect([{ rolls: 0 }]))
      .mockReturnValueOnce(mockWhereSelect([{ rolls: 0 }]))
      .mockReturnValueOnce(mockWhereSelect([{ rolls: 0 }]))
      .mockReturnValueOnce(mockWhereSelect([{ rolls: 0, paidRolls: "0", revenue: "0", players: 0 }]))
      .mockReturnValueOnce(mockGroupBySelect([]))
      .mockReturnValueOnce(mockJoinGroupOrderLimitSelect([]))
      .mockReturnValueOnce(mockGroupBySelect([]));

    const { GET } = await import("@/app/api/admin/dashboard/gacha-summary/route");
    const res = await GET(mkReq("?days=45"));
    const body = await res.json();
    expect(body.days).toBe(30);
    expect(body.daily).toHaveLength(30);
    expect(body.kpis.avgRollsPerPlayer).toBe(0);
  });

  it("returns 500 on DB error", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockRejectedValue(new Error("DB fail")) }),
    });
    const { GET } = await import("@/app/api/admin/dashboard/gacha-summary/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/dashboard/gacha-machines
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/dashboard/gacha-machines (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const mkReq = (params = "") =>
    new NextRequest(`http://localhost/api/admin/dashboard/gacha-machines${params}`);

  it("returns 401 without dashboard permission", async () => {
    (requirePermission as any).mockResolvedValue(DENIED);
    const { GET } = await import("@/app/api/admin/dashboard/gacha-machines/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(401);
  });

  it("computes RTP and tier actual-vs-expected per machine", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    // Call order: machines, stats, tier counts, expected probabilities.
    (db.select as any) = vi.fn()
      .mockReturnValueOnce(mockFromSelect([
        { id: "m1", name: "ตู้ทอง", isActive: true, isEnabled: true },
      ]))
      .mockReturnValueOnce(mockJoinGroupSelect([
        { machineId: "m1", rolls: 100, revenue: "1000", payout: "800", players: 25 },
        { machineId: null, rolls: 10, revenue: "0", payout: "50", players: 5 },
      ]))
      .mockReturnValueOnce(mockGroupBySelect([
        { machineId: "m1", tier: "common", rolls: 95 },
        { machineId: "m1", tier: "legendary", rolls: 5 },
      ]))
      .mockReturnValueOnce(mockGroupBySelect([
        { machineId: "m1", tier: "common", probability: "98" },
        { machineId: "m1", tier: "legendary", probability: "2" },
      ]));

    const { GET } = await import("@/app/api/admin/dashboard/gacha-machines/route");
    const res = await GET(mkReq("?days=30"));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.machines).toHaveLength(2);

    const m1 = body.machines[0]; // sorted by rolls desc
    expect(m1.name).toBe("ตู้ทอง");
    expect(m1.rolls).toBe(100);
    expect(m1.rtp).toBe(80);
    const legendary = m1.tiers.find((t: { tier: string }) => t.tier === "legendary");
    expect(legendary.actualPct).toBe(5);
    expect(legendary.expectedPct).toBe(2);
    expect(legendary.count).toBe(5);

    const fallback = body.machines[1];
    expect(fallback.machineId).toBeNull();
    expect(fallback.name).toContain("ตู้เริ่มต้น");
    expect(fallback.rtp).toBeNull(); // free-only machine has no revenue
  });

  it("returns 500 on DB error", async () => {
    (requirePermission as any).mockResolvedValue(ALLOWED);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockRejectedValue(new Error("DB fail")),
    });
    const { GET } = await import("@/app/api/admin/dashboard/gacha-machines/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(500);
  });
});
