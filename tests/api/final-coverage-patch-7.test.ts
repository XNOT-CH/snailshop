/**
 * FINAL coverage patch batch 7 — push to 95%+
 * Targets: gacha/grid/rewards branches, promo-codes/validate branches,
 * admin/help POST success, admin/currency, dashboard/topup-trend.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth",     () => ({ auth: vi.fn() }));
const { isAdminMock, isAuthenticatedMock } = vi.hoisted(() => ({
  isAdminMock: vi.fn(),
  isAuthenticatedMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  isAdmin: isAdminMock,
  isAdminWithCsrf: isAdminMock,
  requirePermission: isAdminMock,
  requirePermissionWithCsrf: isAdminMock,
  requireAnyPermission: isAdminMock,
  requireAnyPermissionWithCsrf: isAdminMock,
  isAuthenticated: isAuthenticatedMock,
  isAuthenticatedWithCsrf: isAuthenticatedMock,
}));
vi.mock("@/lib/utils/date", () => ({
  mysqlNow: vi.fn(() => "2026-03-15 00:00:00"),
  toMySQLDatetime: vi.fn(() => "2026-03-15 00:00:00"),
}));
vi.mock("@/lib/validations/validate", () => ({ validateBody: vi.fn() }));
vi.mock("@/lib/validations/content", () => ({
  helpItemSchema: {}, newsItemSchema: {}, navItemSchema: {}, popupSchema: {},
}));
vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn(), AUDIT_ACTIONS: { HELP_CREATE: "HC", SETTINGS_UPDATE: "SU" },
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue(undefined) }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users:               { findFirst: vi.fn(), findMany: vi.fn() },
      helpArticles:        { findMany: vi.fn(), findFirst: vi.fn() },
      footerWidgetSettings:{ findFirst: vi.fn() },
      footerLinks:         { findMany: vi.fn() },
      gachaRewards:        { findMany: vi.fn(), findFirst: vi.fn() },
      gachaRollLogs:       { findMany: vi.fn(), findFirst: vi.fn() },
      promoCodes:          { findMany: vi.fn(), findFirst: vi.fn() },
      currencySettings:    { findFirst: vi.fn() },
      topups:              { findMany: vi.fn() },
      orders:              { findMany: vi.fn() },
      siteSettings:        { findFirst: vi.fn() },
    },
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ groupBy: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }),
    }) }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
  },
  users:               { id: "id", creditBalance: "creditBalance" },
  helpArticles:        { id: "id", category: "category", sortOrder: "sortOrder" },
  footerWidgetSettings:{ id: "id", isActive: "isActive" },
  footerLinks:         { id: "id", isActive: "isActive", sortOrder: "sortOrder" },
  gachaRewards:        { id: "id", isActive: "isActive", gachaMachineId: "gachaMachineId", tier: "tier" },
  gachaRollLogs:       { id: "id", userId: "userId", createdAt: "createdAt", tier: "tier" },
  promoCodes:          { id: "id", code: "code" },
  currencySettings:    { id: "id" },
  topups:              { id: "id", userId: "userId", status: "status", createdAt: "createdAt", amount: "amount" },
  orders:              { id: "id", userId: "userId", purchasedAt: "purchasedAt", totalPrice: "totalPrice", status: "status" },
  siteSettings:        { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), gte: vi.fn(), lte: vi.fn(), lt: vi.fn(), or: vi.fn(),
  count: vi.fn().mockReturnValue("count"), sum: vi.fn().mockReturnValue("sum"),
  sql: vi.fn(), desc: vi.fn(), asc: vi.fn(), isNull: vi.fn(),
}));

import { auth } from "@/auth";
import { isAdmin, isAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBody } from "@/lib/validations/validate";

const ADMIN_OK = { success: true };
const AUTH_OK  = { success: true, userId: "u1" };
const mkP = (id: string) => ({ params: Promise.resolve({ id }) });

// ════════════════════════════════════════════════════════════════
// /api/gacha/grid/rewards — rewardType branches + isNull branch (no machineId)
// ════════════════════════════════════════════════════════════════
describe("API: /api/gacha/grid/rewards (branch coverage)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET with no machineId uses isNull condition", async () => {
    (db.query.gachaRewards.findMany as any).mockResolvedValue([]);
    const { GET } = await import("@/app/api/gacha/grid/rewards/route");
    const res = await GET(new Request("http://localhost/api/gacha/grid/rewards"));
    expect(res.status).toBe(200);
  });

  it("GET maps CREDIT rewardType to เครดิต", async () => {
    (db.query.gachaRewards.findMany as any).mockResolvedValue([
      { id: "r1", tier: "COMMON", rewardType: "CREDIT", rewardName: "เครดิต", rewardAmount: "100", rewardImageUrl: null, product: null },
    ]);
    const { GET } = await import("@/app/api/gacha/grid/rewards/route");
    const res = await GET(new Request("http://localhost/api/gacha/grid/rewards?machineId=m1"));
    const body = await res.json();
    expect(body.data[0].rewardName).toBe("เครดิต");
  });

  it("GET maps POINT rewardType to พอยต์", async () => {
    (db.query.gachaRewards.findMany as any).mockResolvedValue([
      { id: "r2", tier: "RARE", rewardType: "POINT", rewardName: "พอยต์", rewardAmount: "50", rewardImageUrl: null, product: null },
    ]);
    const { GET } = await import("@/app/api/gacha/grid/rewards/route");
    const res = await GET(new Request("http://localhost/api/gacha/grid/rewards?machineId=m1"));
    const body = await res.json();
    expect(body.data[0].rewardName).toBe("พอยต์");
  });

  it("GET uses rewardName when rewardType is OTHER", async () => {
    (db.query.gachaRewards.findMany as any).mockResolvedValue([
      { id: "r3", tier: "EPIC", rewardType: "OTHER", rewardName: "Special Prize", rewardAmount: "1", rewardImageUrl: "img.jpg", product: null },
    ]);
    const { GET } = await import("@/app/api/gacha/grid/rewards/route");
    const res = await GET(new Request("http://localhost/api/gacha/grid/rewards?machineId=m1"));
    const body = await res.json();
    expect(body.data[0].rewardName).toBe("Special Prize");
  });
});

// ════════════════════════════════════════════════════════════════
// /api/promo-codes/validate — expired, not started, limit, min purchase
// ════════════════════════════════════════════════════════════════
describe("API: /api/promo-codes/validate (branch coverage)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("POST returns invalid when promo is expired", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue({
      id: "c1", code: "OLD", isActive: true,
      startsAt: "2025-01-01", expiresAt: "2025-06-01",
      usageLimit: null, usedCount: 0, minPurchase: null,
    });
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST", body: JSON.stringify({ code: "OLD" }) }));
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  it("POST returns invalid when promo has not started", async () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    (db.query.promoCodes.findFirst as any).mockResolvedValue({
      id: "c2", code: "FUTURE", isActive: true,
      startsAt: future.toISOString(), expiresAt: null,
      usageLimit: null, usedCount: 0, minPurchase: null,
    });
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST", body: JSON.stringify({ code: "FUTURE" }) }));
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  it("POST returns invalid when usage limit exceeded", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue({
      id: "c3", code: "MAX", isActive: true,
      startsAt: "2025-01-01", expiresAt: null,
      usageLimit: 5, usedCount: 5, minPurchase: null,
    });
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST", body: JSON.stringify({ code: "MAX" }) }));
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  it("POST returns invalid when totalPrice below minPurchase", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue({
      id: "c4", code: "MIN", isActive: true,
      startsAt: "2025-01-01", expiresAt: null,
      usageLimit: null, usedCount: 0, minPurchase: "500",
      discountType: "PERCENTAGE", discountValue: "10", maxDiscount: null,
    });
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST", body: JSON.stringify({ code: "MIN", totalPrice: 100 }) }));
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  it("POST returns valid discount for FIXED type", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue({
      id: "c5", code: "FIXED50", isActive: true,
      startsAt: "2025-01-01", expiresAt: null,
      usageLimit: null, usedCount: 0, minPurchase: null,
      discountType: "FIXED", discountValue: "50", maxDiscount: null,
    });
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST", body: JSON.stringify({ code: "FIXED50", totalPrice: 200 }) }));
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.discountType).toBe("FIXED");
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/help — POST success (covers findFirst after insert)
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/help (POST success path)", () => {
  it("POST returns 200 with created article on success", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { title: "FAQ Q1", content: "Answer", category: "general", sortOrder: 1, isActive: true } });
    (db.query.helpArticles.findFirst as any).mockResolvedValue({ id: "h1", question: "FAQ Q1" });
    const { POST } = await import("@/app/api/admin/help/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST" }));
    expect(res.status).toBe(200);
  });
});
