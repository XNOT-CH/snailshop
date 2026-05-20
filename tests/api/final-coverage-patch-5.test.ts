/**
 * FINAL coverage patch batch 5 — success paths and remaining condition branches.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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
  isAuthenticatedWithCsrf: isAuthenticatedMock,
}));
vi.mock("@/lib/utils/date", () => ({ mysqlNow: vi.fn(() => "2026-03-14 00:00:00") }));
vi.mock("@/lib/validations/validate", () => ({ validateBody: vi.fn() }));
vi.mock("@/lib/cache", () => ({
  invalidateCache: vi.fn(), invalidateProductCaches: vi.fn(), invalidateNewsCaches: vi.fn(),
  invalidateSettingsCaches: vi.fn(), invalidatePopupCaches: vi.fn(),
  cacheOrFetch: vi.fn((_k: string, fn: () => Promise<unknown>) => fn()),
  CACHE_KEYS: { FEATURED_PRODUCTS: "fp" }, CACHE_TTL: { LONG: 3600 },
}));
vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn(), auditUpdate: vi.fn(), createAuditLog: vi.fn(),
  AUDIT_ACTIONS: { PRODUCT_DUPLICATE: "PRODUCT_DUPLICATE", HELP_UPDATE: "HELP_UPDATE", HELP_DELETE: "HELP_DELETE", USER_ROLE_CHANGE: "USER_ROLE_CHANGE" },
}));
vi.mock("@/lib/encryption", () => ({ decrypt: vi.fn(), encrypt: vi.fn() }));
vi.mock("@/lib/rateLimit", () => ({
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
  checkRateLimit: vi.fn().mockReturnValue({ blocked: false }),
}));
vi.mock("next/headers", () => ({ cookies: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue(undefined), set: vi.fn(), delete: vi.fn() }) }));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      gachaMachines:    { findMany: vi.fn(), findFirst: vi.fn() },
      gachaRewards:     { findMany: vi.fn(), findFirst: vi.fn() },
      products:         { findMany: vi.fn(), findFirst: vi.fn() },
      users:            { findFirst: vi.fn(), findMany: vi.fn() },
      helpArticles:     { findMany: vi.fn(), findFirst: vi.fn() },
      announcementPopups: { findMany: vi.fn(), findFirst: vi.fn() },
      newsArticles:     { findMany: vi.fn(), findFirst: vi.fn() },
      roles:            { findMany: vi.fn(), findFirst: vi.fn() },
      userRoles:        { findMany: vi.fn() },
      topups:           { findMany: vi.fn() },
      promoCodes:       { findMany: vi.fn(), findFirst: vi.fn() },
      orders:           { findMany: vi.fn(), findFirst: vi.fn() },
    },
    select: vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue([{ count: 0, totalTransactions: 0, totalAmount: "0" }]) }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
  },
  products:    { id: "id", isFeatured: "isFeatured" },
  gachaMachines: { id: "id" },
  users:       { id: "id", role: "role" },
  helpArticles: { id: "id" },
  announcementPopups: { id: "id" },
  newsArticles: { id: "id" },
  roles:       { id: "id" },
  userRoles:   { userId: "userId", roleId: "roleId" },
  topups:      { id: "id", createdAt: "createdAt" },
  promoCodes:  { id: "id", code: "code" },
  orders:      { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), gte: vi.fn(), lte: vi.fn(), lt: vi.fn(),
  count: vi.fn(), max: vi.fn(), sql: vi.fn(), desc: vi.fn(), asc: vi.fn(),
  inArray: vi.fn(),
}));

import { auth } from "@/auth";
import { isAdmin, isAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBody } from "@/lib/validations/validate";

const ADMIN_OK  = { success: true, userId: "u1" };
const AUTH_OK   = { success: true, userId: "u1" };
const mkP = (id: string) => ({ params: Promise.resolve({ id }) });

// ════════════════════════════════════════════════════════════════
// /api/admin/products/[id]/duplicate — success path (covers findFirst after insert)
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/products/[id]/duplicate (success path)", () => {
  it("POST returns 200 on success", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const original = { id: "p1", name: "Shirt", description: "Desc", price: "100", discountPrice: null, imageUrl: null, category: "Game", secretData: "", isSold: false, isFeatured: false, sortOrder: 0 };
    const duplicate = { ...original, id: "new-id", name: "Shirt (สำเนา)" };
    (db.query.products.findFirst as any)
      .mockResolvedValueOnce(original)   // original found
      .mockResolvedValueOnce(duplicate); // duplicate after insert
    const { POST } = await import("@/app/api/admin/products/[id]/duplicate/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST" }), mkP("p1"));
    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/gacha-machines/[id]/duplicate — success path
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/gacha-machines/[id]/duplicate (success + 500)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("POST returns 200 on success", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const machine = { id: "m1", name: "Machine", imageUrl: null, costType: "CREDIT", costAmount: "10", categoryId: null, gameType: "STANDARD", isEnabled: true, isActive: true };
    (db.query.gachaMachines.findFirst as any)
      .mockResolvedValueOnce(machine)
      .mockResolvedValueOnce({ ...machine, id: "new-m" });
    const { POST } = await import("@/app/api/admin/gacha-machines/[id]/duplicate/route");
    const res = await POST(new Request("http://localhost"), mkP("m1"));
    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/help/[id] — GET/PUT/DELETE catch blocks + 404 paths
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/help/[id] (all paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("PUT returns 404 when article not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { title: "Updated" } });
    (db.query.helpArticles.findFirst as any).mockResolvedValue(null);
    const { PUT } = await import("@/app/api/admin/help/[id]/route");
    const res = await PUT(new NextRequest("http://localhost", { method: "PUT" }), mkP("h1"));
    expect(res.status).toBe(404);
  });

  it("PUT returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { title: "Updated" } });
    (db.query.helpArticles.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { PUT } = await import("@/app/api/admin/help/[id]/route");
    const res = await PUT(new NextRequest("http://localhost", { method: "PUT" }), mkP("h1"));
    expect(res.status).toBe(500);
  });

  it("DELETE returns 404 when article not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.helpArticles.findFirst as any).mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/admin/help/[id]/route");
    const res = await DELETE(new NextRequest("http://localhost"), mkP("h1"));
    expect(res.status).toBe(404);
  });

  it("DELETE returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.helpArticles.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { DELETE } = await import("@/app/api/admin/help/[id]/route");
    const res = await DELETE(new NextRequest("http://localhost"), mkP("h1"));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/users/[id] — missing condition branches
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/users/[id] (missing paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("PATCH returns 404 when user not found (with valid body)", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.users.findFirst as any).mockResolvedValue(null);
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const res = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ role: "USER" }) }),
      mkP("u1")
    );
    expect(res.status).toBe(404);
  });

  it("PATCH returns 400 when body is empty JSON", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const res = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: "invalid-json" }),
      mkP("u1")
    );
    expect(res.status).toBe(400);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/dashboard/purchases — 401 + 500 
// ════════════════════════════════════════════════════════════════
describe("API: /api/dashboard/purchases (missing paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/dashboard/purchases/route");
    const res = await GET(new NextRequest("http://localhost"));
    expect(res.status).toBe(401);
  });

  it("GET returns 500 on DB error", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.select as any).mockReturnValueOnce({ from: vi.fn().mockRejectedValueOnce(new Error("DB fail")) });
    const { GET } = await import("@/app/api/dashboard/purchases/route");
    const res = await GET(new NextRequest("http://localhost"));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/dashboard/members-summary — 401 + 500
// ════════════════════════════════════════════════════════════════
describe("API: /api/dashboard/members-summary (missing paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/dashboard/members-summary/route");
    const res = await GET(new NextRequest("http://localhost"));
    expect(res.status).toBe(401);
  });

  it("GET returns 500 on DB error (after auth passes)", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (db.select as any).mockReturnValue({ from: vi.fn().mockRejectedValue(new Error("DB fail")) });
    const { GET } = await import("@/app/api/dashboard/members-summary/route");
    const res = await GET(new NextRequest("http://localhost"));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/promo-codes/[id] — missing condition branches
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/promo-codes/[id] (PUT code same as existing)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("PUT succeeds when new code === existing.code (no conflict check)", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    // same code → skip conflict check → update
    (db.query.promoCodes.findFirst as any)
      .mockResolvedValueOnce({ id: "c1", code: "SAVE10" })   // existing
      .mockResolvedValueOnce({ id: "c1", code: "SAVE10" });  // updated result
    const { PUT } = await import("@/app/api/admin/promo-codes/[id]/route");
    const res = await PUT(
      new NextRequest("http://localhost", { method: "PUT", body: JSON.stringify({ code: "save10", startsAt: "2026-01-01" }) }),
      mkP("c1")
    );
    expect(res.status).toBe(200);
  });

  it("GET returns 200 when found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.promoCodes.findFirst as any).mockResolvedValue({ id: "c1", code: "SAVE10", discountValue: "10", minPurchase: "50", maxDiscount: null });
    const { GET } = await import("@/app/api/admin/promo-codes/[id]/route");
    const res = await GET(new NextRequest("http://localhost"), mkP("c1"));
    expect(res.status).toBe(200);
  });
});
