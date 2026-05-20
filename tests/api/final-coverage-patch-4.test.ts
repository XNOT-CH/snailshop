/**
 * FINAL coverage patch batch 4 — covers remaining uncovered lines &
 * condition branches across 15 routes and library functions.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Global Mocks ──────────────────────────────────────────────
vi.mock("@/auth",      () => ({ auth: vi.fn() }));
const { isAdminMock, isAuthenticatedMock } = vi.hoisted(() => ({
  isAdminMock: vi.fn(),
  isAuthenticatedMock: vi.fn(),
}));

vi.mock("@/lib/auth",  () => ({
  isAdmin: isAdminMock,
  isAdminWithCsrf: isAdminMock,
  requirePermission: isAdminMock,
  requirePermissionWithCsrf: isAdminMock,
  requireAnyPermission: isAdminMock,
  requireAnyPermissionWithCsrf: isAdminMock,
  isAuthenticated: isAuthenticatedMock,
  isAuthenticatedWithCsrf: vi.fn(async () => {
    const { auth } = await import("@/auth");
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    return { success: true, userId: session.user.id, user: session.user };
  }),
}));
vi.mock("@/lib/utils/date", () => ({
  mysqlNow: vi.fn(() => "2026-03-14 00:00:00"),
  toMySQLDatetime: vi.fn(() => "2026-03-14 00:00:00"),
}));
vi.mock("@/lib/validations/validate", () => ({ validateBody: vi.fn() }));
vi.mock("@/lib/validations/gacha", () => ({
  gachaMachineSchema: { partial: vi.fn().mockReturnValue({}) },
  gachaMachinePatchSchema: {},
  gachaRewardSchema: {},
}));
vi.mock("@/lib/cache", () => ({
  invalidateCache: vi.fn().mockResolvedValue(true),
  invalidateProductCaches: vi.fn().mockResolvedValue(undefined),
  CACHE_KEYS: { FEATURED_PRODUCTS: "fp" },
}));
vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn().mockResolvedValue(undefined),
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: {
    PURCHASE: "PURCHASE", PRODUCT_DUPLICATE: "PRODUCT_DUPLICATE",
  },
}));
vi.mock("@/lib/encryption", () => ({ decrypt: vi.fn().mockReturnValue("abc\ndef"), encrypt: vi.fn().mockReturnValue("enc") }));
vi.mock("@/lib/stock",  () => ({
  splitStock: vi.fn().mockReturnValue(["item1", "item2"]),
  getDelimiter: vi.fn().mockReturnValue("\n"),
}));
vi.mock("@/lib/mail",   () => ({ sendEmail: vi.fn().mockResolvedValue({}) }));
vi.mock("@/components/emails/PurchaseReceiptEmail", () => ({ PurchaseReceiptEmail: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      gachaMachines: { findMany: vi.fn(), findFirst: vi.fn() },
      gachaRewards:  { findMany: vi.fn(), findFirst: vi.fn() },
      products:      { findMany: vi.fn(), findFirst: vi.fn() },
      users:         { findFirst: vi.fn(), findMany: vi.fn() },
      promoCodes:    { findFirst: vi.fn() },
      topups:        { findMany: vi.fn() },
    },
    select: vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue([{ count: 0 }]) }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    $client: { getConnection: vi.fn() },
  },
  gachaMachines: { id: "id", sortOrder: "sortOrder" },
  gachaRewards:  { id: "id", gachaMachineId: "gachaMachineId", isActive: "isActive" },
  products:      { id: "id", isFeatured: "isFeatured" },
  users:         { id: "id" },
  promoCodes:    { id: "id", code: "code" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), gte: vi.fn(), lte: vi.fn(), isNull: vi.fn(),
  count: vi.fn(), max: vi.fn(), sql: vi.fn(), desc: vi.fn(), asc: vi.fn(),
}));

import { auth } from "@/auth";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBody } from "@/lib/validations/validate";

const ADMIN_OK = { success: true };
const UNAUTH   = { success: false, error: "Unauthorized" };
const mkP = (id: string) => ({ params: Promise.resolve({ id }) });

// ════════════════════════════════════════════════════════════════
// /api/admin/gacha-machines/reorder — missing paths
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/gacha-machines/reorder", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("POST returns 400 when orders is not an array", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { POST } = await import("@/app/api/admin/gacha-machines/reorder/route");
    const res = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ orders: "not-array" }) }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      success: false,
      message: "Invalid payload",
    });
  });

  it("POST returns 500 with non-Error thrown object", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.update as any).mockImplementationOnce(() => { throw "string error"; });
    const { POST } = await import("@/app/api/admin/gacha-machines/reorder/route");
    const res = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ orders: [{ id: "m1", sortOrder: 0 }] }) }));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      success: false,
      message: "Unknown error",
    });
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/products/[id]/duplicate — 404 path
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/products/[id]/duplicate (missing paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("POST returns 404 when original product not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.products.findFirst as any).mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/admin/products/[id]/duplicate/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST" }), mkP("p1"));
    expect(res.status).toBe(404);
  });

  it("POST returns 403 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false });
    const { POST } = await import("@/app/api/admin/products/[id]/duplicate/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST" }), mkP("p1"));
    expect(res.status).toBe(403);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/products/[id]/featured — inner JSON catch + zod error
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/products/[id]/featured (missing paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("PATCH returns 400 on invalid JSON body (inner catch)", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { PATCH } = await import("@/app/api/admin/products/[id]/featured/route");
    const res = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: "invalid-json" }),
      mkP("p1")
    );
    expect(res.status).toBe(400);
  });

  it("PATCH returns 400 when zod validation fails (isFeatured missing)", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { PATCH } = await import("@/app/api/admin/products/[id]/featured/route");
    const res = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ isFeatured: "not-boolean" }) }),
      mkP("p1")
    );
    expect(res.status).toBe(400);
  });

  it("PATCH returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.update as any).mockImplementationOnce(() => ({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockRejectedValueOnce(new Error("DB fail")) }),
    }));
    const { PATCH } = await import("@/app/api/admin/products/[id]/featured/route");
    const res = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ isFeatured: true }) }),
      mkP("p1")
    );
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/gacha-machines/[id] — 404 path + ternary for costAmount
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/gacha-machines/[id] (missing paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 404 when machine not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.gachaMachines.findFirst as any).mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/admin/gacha-machines/[id]/route");
    const res = await GET(new Request("http://localhost"), mkP("m1"));
    expect(res.status).toBe(404);
  });

  it("PATCH updates costAmount as string (covers ternary branch)", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { costAmount: 100, isActive: true } });
    (db.query.gachaMachines.findFirst as any).mockResolvedValue({ id: "m1", name: "Test" });
    (db.query.gachaRewards.findMany as any).mockResolvedValue([
      { probability: "100", isActive: true, rewardType: "CREDIT", rewardName: "Credit", rewardAmount: "1" },
    ]);
    const { PATCH } = await import("@/app/api/admin/gacha-machines/[id]/route");
    const res = await PATCH(new Request("http://localhost", { method: "PATCH" }), mkP("m1"));
    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/dashboard/topup-summary — 403 + startDate/endDate range mode
// ════════════════════════════════════════════════════════════════
describe("API: /api/dashboard/topup-summary (missing paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 403 when not admin role", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", role: "USER" } });
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(new NextRequest("http://localhost/api/dashboard/topup-summary"));
    expect(res.status).toBe(403);
  });

  it("GET covers startDate+endDate range mode (parseDateRange branch)", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (db.query.topups.findMany as any).mockResolvedValue([]);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(new NextRequest("http://localhost/api/dashboard/topup-summary?startDate=2026-01-01&endDate=2026-03-31"));
    expect(res.status).toBe(200);
  });

  it("GET processes PENDING and REJECTED status", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (db.query.topups.findMany as any).mockResolvedValue([
      { id: "t1", userId: "u1", amount: "100", status: "PENDING", createdAt: "2026-03-14 10:00:00", senderBank: "KBANK", user: { username: "user1" } },
      { id: "t2", userId: "u2", amount: "50", status: "REJECTED", createdAt: "2026-03-14 11:00:00", senderBank: null, user: { username: "user2" } },
      { id: "t3", userId: "u3", amount: "200", status: "APPROVED", createdAt: "2026-03-14 09:00:00", senderBank: "KBANK", user: { username: "user3" } },
    ]);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(new NextRequest("http://localhost/api/dashboard/topup-summary"));
    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/purchase — missing condition branches
// ════════════════════════════════════════════════════════════════
describe("API: /api/purchase (missing validation paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 400 when productId is missing", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST", body: JSON.stringify({ quantity: 1 }) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when quantity is invalid (float)", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST", body: JSON.stringify({ productId: "p1", quantity: 1.5 }) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when quantity is 0", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST", body: JSON.stringify({ productId: "p1", quantity: 0 }) }));
    expect(res.status).toBe(400);
  });

  it("returns 401/404 when getAuthUser finds no user in DB", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST", body: JSON.stringify({ productId: "p1", quantity: 1 }) }));
    // getAuthUser returns { error, status: 404 } → route returns 404
    expect([401, 404]).toContain(res.status);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/gacha-machines/[id]/duplicate — 404 path
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/gacha-machines/[id]/duplicate (404 path)", () => {
  it("POST returns 404 when machine not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.gachaMachines.findFirst as any).mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/admin/gacha-machines/[id]/duplicate/route");
    const res = await POST(new Request("http://localhost"), mkP("m1"));
    expect(res.status).toBe(404);
  });
});
