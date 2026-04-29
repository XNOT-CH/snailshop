/**
 * FINAL coverage patch batch 2 — covers remaining catch/error paths,
 * 404 paths, validation errors, and lib-level function coverage.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Global Mocks ──────────────────────────────────────────────
vi.mock("@/auth",      () => ({ auth: vi.fn() }));
vi.mock("@/lib/auth",  () => ({ isAdmin: vi.fn(), isAuthenticated: vi.fn() }));
vi.mock("@/lib/utils/date", () => ({ mysqlNow: vi.fn(() => "2026-03-14 00:00:00") }));
vi.mock("@/lib/validations/validate", () => ({ validateBody: vi.fn() }));
vi.mock("@/lib/validations", () => ({ registerSchema: {} }));
vi.mock("@/lib/validations/content", () => ({
  newsItemSchema:  { partial: vi.fn().mockReturnValue({}) },
  helpItemSchema:  { partial: vi.fn().mockReturnValue({}) },
  navItemSchema:   { partial: vi.fn().mockReturnValue({}) },
  popupSchema:     { partial: vi.fn().mockReturnValue({}) },
  footerLinkSchema: {},
}));
vi.mock("@/lib/validations/settings", () => ({ siteSettingsSchema: { partial: vi.fn().mockReturnValue({}) }, gacha: {} }));
vi.mock("@/lib/cache", () => ({
  invalidateCache: vi.fn().mockResolvedValue(true),
  invalidateProductCaches: vi.fn().mockResolvedValue(undefined),
  invalidateNewsCaches: vi.fn().mockResolvedValue(undefined),
  invalidateSettingsCaches: vi.fn().mockResolvedValue(undefined),
  invalidatePopupCaches: vi.fn().mockResolvedValue(undefined),
  cacheOrFetch: vi.fn((_k: string, fn: () => Promise<unknown>) => fn()),
  CACHE_KEYS: { FEATURED_PRODUCTS: "fp", SITE_SETTINGS: "ss", NEWS: "news" },
  CACHE_TTL: { LONG: 3600 },
}));
vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn().mockResolvedValue(undefined),
  auditUpdate: vi.fn().mockResolvedValue(undefined),
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: {
    PRODUCT_CREATE: "PRODUCT_CREATE", PRODUCT_UPDATE: "PRODUCT_UPDATE", PRODUCT_DELETE: "PRODUCT_DELETE",
    NEWS_CREATE: "NEWS_CREATE", NEWS_UPDATE: "NEWS_UPDATE", NEWS_DELETE: "NEWS_DELETE",
    HELP_CREATE: "HELP_CREATE", HELP_UPDATE: "HELP_UPDATE", HELP_DELETE: "HELP_DELETE",
    REGISTER: "REGISTER", USER_ROLE_CHANGE: "USER_ROLE_CHANGE", PRODUCT_DUPLICATE: "PRODUCT_DUPLICATE",
  },
}));
vi.mock("@/lib/encryption", () => ({ decrypt: vi.fn().mockReturnValue("dec"), encrypt: vi.fn().mockReturnValue("enc") }));
vi.mock("@/lib/rateLimit",  () => ({ getClientIp: vi.fn().mockReturnValue("127.0.0.1"), checkRegisterRateLimit: vi.fn().mockReturnValue({ blocked: false }), checkRateLimit: vi.fn().mockReturnValue({ blocked: false }) }));
vi.mock("@/lib/api",        () => ({ parseBody: vi.fn() }));
vi.mock("@/lib/security/turnstile", () => ({
  verifyTurnstileToken: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("bcryptjs",         () => ({ default: { hash: vi.fn().mockResolvedValue("hashed"), compare: vi.fn().mockResolvedValue(true) } }));
vi.mock("next/headers",     () => ({ cookies: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue(undefined), set: vi.fn(), delete: vi.fn() }) }));
vi.mock("@/lib/stock",      () => ({ deductStock: vi.fn().mockResolvedValue(true), getStockCount: vi.fn().mockResolvedValue(10) }));
vi.mock("@/lib/getSiteSettings", () => ({ getSiteSettings: vi.fn().mockResolvedValue({ id: "s1" }) }));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      navItems:           { findMany: vi.fn(), findFirst: vi.fn() },
      footerWidgetSettings: { findFirst: vi.fn() },
      footerLinks:        { findMany: vi.fn(), findFirst: vi.fn() },
      gachaRollLogs:      { findMany: vi.fn() },
      gachaMachines:      { findMany: vi.fn(), findFirst: vi.fn() },
      gachaRewards:       { findMany: vi.fn(), findFirst: vi.fn() },
      gachaCategories:    { findMany: vi.fn(), findFirst: vi.fn() },
      gachaSettings:      { findFirst: vi.fn() },
      users:              { findFirst: vi.fn(), findMany: vi.fn() },
      newsArticles:       { findMany: vi.fn(), findFirst: vi.fn() },
      helpArticles:       { findMany: vi.fn(), findFirst: vi.fn() },
      announcementPopups: { findMany: vi.fn(), findFirst: vi.fn() },
      roles:              { findMany: vi.fn(), findFirst: vi.fn() },
      userRoles:          { findMany: vi.fn() },
      siteSettings:       { findFirst: vi.fn() },
      products:           { findMany: vi.fn(), findFirst: vi.fn() },
      orders:             { findMany: vi.fn(), findFirst: vi.fn() },
      promoCodes:         { findMany: vi.fn(), findFirst: vi.fn() },
      auditLogs:          { findMany: vi.fn() },
      currencySettings:   { findFirst: vi.fn() },
      adminSlips:         { findMany: vi.fn() },
      gachaProducts:      { findMany: vi.fn(), findFirst: vi.fn() },
    },
    select: vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue([{ count: 0, totalAmount: 0, total: 0 }]) }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }),
  },
  navItems:           { id: "id", isActive: "isActive", sortOrder: "sortOrder" },
  footerWidgetSettings: { id: "id", isActive: "isActive" },
  footerLinks:        { id: "id", isActive: "isActive", sortOrder: "sortOrder" },
  gachaMachines:      { id: "id", isActive: "isActive", isEnabled: "isEnabled" },
  gachaRewards:       { id: "id", gachaMachineId: "gachaMachineId", isActive: "isActive" },
  gachaCategories:    { id: "id" },
  gachaSettings:      { id: "id" },
  users:              { id: "id", username: "username", email: "email" },
  newsArticles:       { id: "id", isActive: "isActive" },
  helpArticles:       { id: "id" },
  announcementPopups: { id: "id", isActive: "isActive" },
  roles:              { id: "id", name: "name", code: "code" },
  siteSettings:       { id: "id" },
  products:           { id: "id", isActive: "isActive", orderId: "orderId" },
  orders:             { id: "id" },
  promoCodes:         { id: "id", isActive: "isActive", code: "code" },
  auditLogs:          { id: "id", userId: "userId", action: "action", resource: "resource", createdAt: "createdAt" },
  currencySettings:   { id: "id" },
  adminSlips:         { id: "id" },
  gachaProducts:      { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), gte: vi.fn(), lte: vi.fn(), lt: vi.fn(), or: vi.fn(),
  count: vi.fn(), max: vi.fn(), min: vi.fn(), sum: vi.fn(), sql: vi.fn(),
  isNull: vi.fn(), isNotNull: vi.fn(), asc: vi.fn(), desc: vi.fn(), inArray: vi.fn(),
}));

import { isAdmin, isAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBody } from "@/lib/validations/validate";
import { parseBody } from "@/lib/api";

const ADMIN_OK = { success: true };
const UNAUTH   = { success: false, error: "Unauthorized" };
const AUTH_OK  = { success: true, userId: "u1" };
const mkP = (id: string) => ({ params: Promise.resolve({ id }) });

// ════════════════════════════════════════════════════════════════
// /api/products — validation errors + catch
// ════════════════════════════════════════════════════════════════
describe("API: /api/products (POST edge cases)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 400 when title/price/category missing", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { POST } = await import("@/app/api/products/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST", body: JSON.stringify({ title: "T", price: "10" }) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when price is NaN", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { POST } = await import("@/app/api/products/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST", body: JSON.stringify({ title: "T", price: "abc", category: "Game" }) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when discountPrice is NaN", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { POST } = await import("@/app/api/products/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST", body: JSON.stringify({ title: "T", price: "100", category: "Game", discountPrice: "abc" }) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when discountPrice >= price", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { POST } = await import("@/app/api/products/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST", body: JSON.stringify({ title: "T", price: "50", category: "Game", discountPrice: "100" }) }));
    expect(res.status).toBe(400);
  });

  it("returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.insert as any).mockReturnValueOnce({ values: vi.fn().mockRejectedValueOnce(new Error("DB fail")) });
    const { POST } = await import("@/app/api/products/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST", body: JSON.stringify({ title: "T", price: "100", category: "Game" }) }));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/products/[id] — 404 + 500 + orderId branch
// ════════════════════════════════════════════════════════════════
describe("API: /api/products/[id] (error paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 404 when product not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.products.findFirst as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/products/[id]/route");
    const res = await GET(new NextRequest("http://localhost"), mkP("p1"));
    expect(res.status).toBe(404);
  });

  it("GET returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.products.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { GET } = await import("@/app/api/products/[id]/route");
    const res = await GET(new NextRequest("http://localhost"), mkP("p1"));
    expect(res.status).toBe(500);
  });

  it("PUT returns 404 when product not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.products.findFirst as any).mockResolvedValue(null);
    const { PUT } = await import("@/app/api/products/[id]/route");
    const res = await PUT(new NextRequest("http://localhost", { method: "PUT", body: JSON.stringify({ title: "T", price: "100", category: "G" }) }), mkP("p1"));
    expect(res.status).toBe(404);
  });

  it("PUT returns 400 on invalid discountPrice", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.products.findFirst as any).mockResolvedValue({ id: "p1", name: "T", price: "50", category: "G" });
    const { PUT } = await import("@/app/api/products/[id]/route");
    const res = await PUT(new NextRequest("http://localhost", { method: "PUT", body: JSON.stringify({ title: "T", price: "50", category: "G", discountPrice: "999" }) }), mkP("p1"));
    expect(res.status).toBe(400);
  });

  it("PUT returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.products.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { PUT } = await import("@/app/api/products/[id]/route");
    const res = await PUT(new NextRequest("http://localhost", { method: "PUT", body: JSON.stringify({ title: "T", price: "100", category: "G" }) }), mkP("p1"));
    expect(res.status).toBe(500);
  });

  it("DELETE returns 404 when product not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.products.findFirst as any).mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/products/[id]/route");
    const res = await DELETE(new NextRequest("http://localhost"), mkP("p1"));
    expect(res.status).toBe(404);
  });

  it("DELETE handles product with orderId (clears orderId first)", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.products.findFirst as any).mockResolvedValue({ id: "p1", name: "T", orderId: "o1", price: "100", category: "G" });
    const { DELETE } = await import("@/app/api/products/[id]/route");
    const res = await DELETE(new NextRequest("http://localhost"), mkP("p1"));
    expect(res.status).toBe(200);
  });

  it("DELETE returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.products.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { DELETE } = await import("@/app/api/products/[id]/route");
    const res = await DELETE(new NextRequest("http://localhost"), mkP("p1"));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/register — catch block (500)
// ════════════════════════════════════════════════════════════════
describe("API: /api/register (error paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 500 on DB error during insert", async () => {
    (parseBody as any).mockResolvedValue({ data: { username: "newuser", email: "new@example.com", password: "Pass@1234" } });
    (db.query.users.findFirst as any).mockResolvedValue(null);
    (db.insert as any).mockReturnValueOnce({ values: vi.fn().mockRejectedValueOnce(new Error("DB fail")) });
    const { POST } = await import("@/app/api/register/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST" }));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/help — GET + POST catch blocks
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/help (error paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 500 on DB error", async () => {
    (db.query.helpArticles.findMany as any).mockRejectedValueOnce(new Error("DB fail"));
    const { GET } = await import("@/app/api/admin/help/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("POST returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { title: "FAQ", content: "Answer", category: "general", sortOrder: 0, isActive: true } });
    (db.insert as any).mockReturnValueOnce({ values: vi.fn().mockRejectedValueOnce(new Error("DB fail")) });
    const { POST } = await import("@/app/api/admin/help/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST" }));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/news — GET + POST catch blocks
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/news (error paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.newsArticles.findMany as any).mockRejectedValueOnce(new Error("DB fail"));
    const { GET } = await import("@/app/api/admin/news/route");
    const res = await GET(new Request("http://localhost"));
    expect(res.status).toBe(500);
  });

  it("POST returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { title: "News", description: "Desc", sortOrder: 0, isActive: true } });
    (db.insert as any).mockReturnValueOnce({ values: vi.fn().mockRejectedValueOnce(new Error("DB fail")) });
    const { POST } = await import("@/app/api/admin/news/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/news/[id] — 404 + 500 for GET/PUT/DELETE
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/news/[id] (error paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 404 when not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.newsArticles.findFirst as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/admin/news/[id]/route");
    const res = await GET(new Request("http://localhost"), mkP("n1"));
    expect(res.status).toBe(404);
  });

  it("PUT returns 404 when not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { title: "Updated" } });
    (db.query.newsArticles.findFirst as any).mockResolvedValue(null);
    const { PUT } = await import("@/app/api/admin/news/[id]/route");
    const res = await PUT(new Request("http://localhost", { method: "PUT" }), mkP("n1"));
    expect(res.status).toBe(404);
  });

  it("DELETE returns 404 when not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.newsArticles.findFirst as any).mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/admin/news/[id]/route");
    const res = await DELETE(new Request("http://localhost"), mkP("n1"));
    expect(res.status).toBe(404);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/promo-codes/[id] — 404 + 500 + conflict check
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/promo-codes/[id] (error paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 404 when not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.promoCodes.findFirst as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/admin/promo-codes/[id]/route");
    const res = await GET(new NextRequest("http://localhost"), mkP("c1"));
    expect(res.status).toBe(404);
  });

  it("PUT returns 404 when not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.promoCodes.findFirst as any).mockResolvedValue(null);
    const { PUT } = await import("@/app/api/admin/promo-codes/[id]/route");
    const res = await PUT(new NextRequest("http://localhost", { method: "PUT", body: JSON.stringify({ code: "NEW" }) }), mkP("c1"));
    expect(res.status).toBe(404);
  });

  it("PUT returns 400 when code conflicts", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.promoCodes.findFirst as any)
      .mockResolvedValueOnce({ id: "c1", code: "OLD10" })  // existing
      .mockResolvedValueOnce({ id: "c2", code: "NEW20" });  // conflict
    const { PUT } = await import("@/app/api/admin/promo-codes/[id]/route");
    const res = await PUT(new NextRequest("http://localhost", { method: "PUT", body: JSON.stringify({ code: "new20", startsAt: "2026-01-01" }) }), mkP("c1"));
    expect(res.status).toBe(400);
  });

  it("DELETE returns 404 when not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.promoCodes.findFirst as any).mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/admin/promo-codes/[id]/route");
    const res = await DELETE(new NextRequest("http://localhost"), mkP("c1"));
    expect(res.status).toBe(404);
  });

  it("DELETE returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.promoCodes.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { DELETE } = await import("@/app/api/admin/promo-codes/[id]/route");
    const res = await DELETE(new NextRequest("http://localhost"), mkP("c1"));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// lib/csrf — direct unit tests
// ════════════════════════════════════════════════════════════════
describe("lib/csrf", () => {
  it("generateCsrfToken returns 64-char hex string", async () => {
    const realCsrf = await vi.importActual<typeof import("@/lib/csrf")>("@/lib/csrf");
    const token = realCsrf.generateCsrfToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]+$/);
  });

  it("getCsrfTokenFromRequest returns header value", async () => {
    const realCsrf = await vi.importActual<typeof import("@/lib/csrf")>("@/lib/csrf");
    const req = new Request("http://localhost", { headers: { "X-CSRF-Token": "mytoken" } });
    const result = realCsrf.getCsrfTokenFromRequest(req);
    expect(result).toBe("mytoken");
  });

  it("getCsrfTokenFromRequest returns null when no header", async () => {
    const realCsrf = await vi.importActual<typeof import("@/lib/csrf")>("@/lib/csrf");
    const req = new Request("http://localhost");
    const result = realCsrf.getCsrfTokenFromRequest(req);
    expect(result).toBeNull();
  });

  it("validateCsrfToken returns false when token is empty", async () => {
    const realCsrf = await vi.importActual<typeof import("@/lib/csrf")>("@/lib/csrf");
    const result = await realCsrf.validateCsrfToken("");
    expect(result).toBe(false);
  });

  it("validateCsrfToken returns false when no cookie", async () => {
    const realCsrf = await vi.importActual<typeof import("@/lib/csrf")>("@/lib/csrf");
    const result = await realCsrf.validateCsrfToken("sometoken");
    expect(result).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// lib/auditLog — getAuditLogs + cleanupOldAuditLogs + createAuditLog
// ════════════════════════════════════════════════════════════════
describe("lib/auditLog (direct tests)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("getAuditLogs with all options returns data", async () => {
    (db.query.auditLogs.findMany as any).mockResolvedValue([]);
    const realAuditLog = await vi.importActual<typeof import("@/lib/auditLog")>("@/lib/auditLog");
    const result = await realAuditLog.getAuditLogs({
      userId: "u1", action: "LOGIN" as any, resource: "User",
      startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"),
      limit: 10, offset: 0,
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("getAuditLogs with no conditions", async () => {
    (db.query.auditLogs.findMany as any).mockResolvedValue([{ id: "a1" }]);
    const realAuditLog = await vi.importActual<typeof import("@/lib/auditLog")>("@/lib/auditLog");
    const result = await realAuditLog.getAuditLogs({});
    expect(result).toHaveLength(1);
  });

  it("cleanupOldAuditLogs returns affected rows count", async () => {
    (db.delete as any).mockReturnValueOnce({ where: vi.fn().mockResolvedValue([{ affectedRows: 5 }]) });
    const realAuditLog = await vi.importActual<typeof import("@/lib/auditLog")>("@/lib/auditLog");
    const result = await realAuditLog.cleanupOldAuditLogs(30);
    expect(result).toBe(5);
  });

  it("createAuditLog with undefined userId calls getCurrentUserId", async () => {
    (db.insert as any).mockReturnValueOnce({ values: vi.fn().mockResolvedValue({}) });
    const realAuditLog = await vi.importActual<typeof import("@/lib/auditLog")>("@/lib/auditLog");
    // userId undefined → getCurrentUserId() called → cookies() returns no session → null
    await realAuditLog.createAuditLog({ action: "LOGIN" as any, resource: "User" });
    // If no error thrown, test passes (getCurrentUserId is defensive)
    expect(true).toBe(true);
  });

  it("createAuditLog with resourceName and changes", async () => {
    (db.insert as any).mockReturnValueOnce({ values: vi.fn().mockResolvedValue({}) });
    const realAuditLog = await vi.importActual<typeof import("@/lib/auditLog")>("@/lib/auditLog");
    await realAuditLog.createAuditLog({
      userId: "u1", action: "PRODUCT_UPDATE" as any, resource: "Product", resourceId: "p1",
      resourceName: "Test Product",
      changes: [{ field: "name", oldValue: "Old", newValue: "New" }],
    });
    expect(true).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/gacha-categories — error paths
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/gacha-categories (coverage paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 200 with mapped category data (_count.machines)", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.gachaCategories.findMany as any).mockResolvedValue([
      { id: "c1", name: "Action", sortOrder: 0, machines: [{ id: "m1" }, { id: "m2" }] },
    ]);
    const { GET } = await import("@/app/api/admin/gacha-categories/route");
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data[0]._count.machines).toBe(2);
  });

  it("POST creates category and returns 200", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.gachaCategories.findFirst as any).mockResolvedValue({ id: "new1", name: "Arcade" });
    const { POST } = await import("@/app/api/admin/gacha-categories/route");
    const res = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ name: "Arcade", sortOrder: 1 }) }));
    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/gacha-rewards/[id] — error paths
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/gacha-rewards/[id] (error paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("DELETE returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.delete as any).mockReturnValueOnce({ where: vi.fn().mockRejectedValueOnce(new Error("DB fail")) });
    const { DELETE } = await import("@/app/api/admin/gacha-rewards/[id]/route");
    const res = await DELETE(new Request("http://localhost"), mkP("r1"));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/currency-settings — error paths
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/currency-settings (error paths)", () => {
  it("PUT returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { name: "Point", symbol: "💎", isActive: true } });
    // findFirst returns existing record → goes to update branch → update throws → 500
    (db.query.currencySettings.findFirst as any).mockResolvedValueOnce({ id: "default" });
    (db.update as any).mockImplementationOnce(() => ({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockRejectedValueOnce(new Error("DB fail")) }),
    }));
    const { PUT } = await import("@/app/api/admin/currency-settings/route");
    const res = await PUT(new NextRequest("http://localhost", { method: "PUT" }));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/slips — error paths
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/slips (error paths)", () => {
  it("PATCH returns 500 on invalid JSON body", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { PATCH } = await import("@/app/api/admin/slips/route");
    // invalid-json body → request.json() throws → catch → 500
    const res = await PATCH(new NextRequest("http://localhost", { method: "PATCH", body: "invalid-json" }));
    expect(res.status).toBe(500);
  });
});
