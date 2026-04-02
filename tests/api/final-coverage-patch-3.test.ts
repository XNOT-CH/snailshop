/**
 * FINAL coverage patch batch 3 — covers remaining ~74 uncovered lines
 * across catch blocks, 404 paths, validation branches and lib functions.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Global Mocks ──────────────────────────────────────────────
vi.mock("@/auth",      () => ({ auth: vi.fn() }));
vi.mock("@/lib/auth",  () => ({ isAdmin: vi.fn(), isAuthenticated: vi.fn() }));
vi.mock("@/lib/utils/date", () => ({ mysqlNow: vi.fn(() => "2026-03-14 00:00:00") }));
vi.mock("@/lib/validations/validate", () => ({ validateBody: vi.fn() }));
vi.mock("@/lib/validations", () => ({ loginSchema: {}, registerSchema: {} }));
vi.mock("@/lib/validations/content", () => ({
  newsItemSchema: { partial: vi.fn().mockReturnValue({}) },
  navItemSchema:  { partial: vi.fn().mockReturnValue({}) },
  popupSchema:    { partial: vi.fn().mockReturnValue({}) },
  roleSchema:     {},
  gachaRewardSchema: {},
}));
vi.mock("@/lib/validations/gacha", () => ({ gachaRewardSchema: {} }));
vi.mock("@/lib/cache", () => ({
  invalidateCache: vi.fn().mockResolvedValue(true),
  invalidateNewsCaches: vi.fn().mockResolvedValue(undefined),
  invalidatePopupCaches: vi.fn().mockResolvedValue(undefined),
  invalidateSettingsCaches: vi.fn().mockResolvedValue(undefined),
  cacheOrFetch: vi.fn((_k: string, fn: () => Promise<unknown>) => fn()),
  CACHE_KEYS: { FEATURED_PRODUCTS: "fp", SITE_SETTINGS: "ss" },
  CACHE_TTL: { LONG: 3600 },
}));
vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn().mockResolvedValue(undefined),
  auditUpdate: vi.fn().mockResolvedValue(undefined),
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: {
    NEWS_UPDATE: "NEWS_UPDATE", NEWS_DELETE: "NEWS_DELETE",
    POPUP_UPDATE: "POPUP_UPDATE", POPUP_DELETE: "POPUP_DELETE",
    ROLE_CREATE: "ROLE_CREATE", LOGIN: "LOGIN", LOGIN_FAILED: "LOGIN_FAILED",
    REGISTER: "REGISTER",
  },
}));
vi.mock("@/lib/encryption", () => ({ decrypt: vi.fn().mockReturnValue("dec"), encrypt: vi.fn().mockReturnValue("enc") }));
vi.mock("@/lib/rateLimit", () => ({
  getClientIp:            vi.fn().mockReturnValue("127.0.0.1"),
  checkLoginRateLimit:    vi.fn().mockReturnValue({ blocked: false, remainingAttempts: 5, lockoutRemaining: 0 }),
  recordFailedLogin:      vi.fn(),
  clearLoginAttempts:     vi.fn(),
  getProgressiveDelay:    vi.fn().mockReturnValue(0),
  sleep:                  vi.fn().mockResolvedValue(undefined),
  checkRegisterRateLimit: vi.fn().mockReturnValue({ blocked: false }),
}));
vi.mock("@/lib/api", () => ({ parseBody: vi.fn() }));
vi.mock("bcryptjs",   () => ({ default: { hash: vi.fn().mockResolvedValue("hashed"), compare: vi.fn().mockResolvedValue(true) } }));
vi.mock("next/headers", () => ({ cookies: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue(undefined), set: vi.fn(), delete: vi.fn() }) }));
vi.mock("@/lib/csrf", () => ({
  getCsrfTokenFromRequest: vi.fn().mockReturnValue(null),
  validateCsrfToken: vi.fn().mockResolvedValue(true),
  generateCsrfToken: vi.fn().mockReturnValue("tok"),
  createCsrfTokenPair: vi.fn().mockResolvedValue({ token: "tok", cookieValue: "cv" }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      navItems:             { findMany: vi.fn(), findFirst: vi.fn() },
      footerWidgetSettings: { findFirst: vi.fn() },
      footerLinks:          { findMany: vi.fn(), findFirst: vi.fn() },
      gachaRollLogs:        { findMany: vi.fn() },
      gachaMachines:        { findMany: vi.fn(), findFirst: vi.fn() },
      gachaRewards:         { findMany: vi.fn(), findFirst: vi.fn() },
      users:                { findFirst: vi.fn(), findMany: vi.fn() },
      newsArticles:         { findMany: vi.fn(), findFirst: vi.fn() },
      helpArticles:         { findMany: vi.fn(), findFirst: vi.fn() },
      announcementPopups:   { findMany: vi.fn(), findFirst: vi.fn() },
      roles:                { findMany: vi.fn(), findFirst: vi.fn() },
      siteSettings:         { findFirst: vi.fn() },
      products:             { findMany: vi.fn(), findFirst: vi.fn() },
      promoCodes:           { findMany: vi.fn(), findFirst: vi.fn() },
      auditLogs:            { findMany: vi.fn() },
    },
    select: vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue([{ count: 0, totalAmount: 0, total: 0, maxSort: null }]) }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }),
  },
  navItems:             { id: "id", isActive: "isActive", sortOrder: "sortOrder" },
  footerWidgetSettings: { id: "id", isActive: "isActive" },
  newsArticles:         { id: "id", isActive: "isActive" },
  announcementPopups:   { id: "id", isActive: "isActive" },
  roles:                { id: "id", name: "name", code: "code" },
  users:                { id: "id", username: "username" },
  products:             { id: "id", isSold: "isSold" },
  gachaRewards:         { id: "id", gachaMachineId: "gachaMachineId", isActive: "isActive" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), gte: vi.fn(), lte: vi.fn(), lt: vi.fn(),
  count: vi.fn(), max: vi.fn(), sql: vi.fn(), isNull: vi.fn(),
  asc: vi.fn(), desc: vi.fn(), inArray: vi.fn(),
}));

import { auth } from "@/auth";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBody } from "@/lib/validations/validate";
import { parseBody } from "@/lib/api";
import { getProgressiveDelay, sleep, checkRegisterRateLimit } from "@/lib/rateLimit";

const ADMIN_OK = { success: true };
const UNAUTH   = { success: false, error: "Unauthorized" };
const mkP = (id: string) => ({ params: Promise.resolve({ id }) });

// ════════════════════════════════════════════════════════════════
// /api/admin/news/[id] — catch blocks (GET/PUT/DELETE each have catch { return 500 })
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/news/[id] (catch block coverage)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.newsArticles.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { GET } = await import("@/app/api/admin/news/[id]/route");
    const res = await GET(new Request("http://localhost"), mkP("n1"));
    expect(res.status).toBe(500);
  });

  it("PUT returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { title: "Updated" } });
    (db.query.newsArticles.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { PUT } = await import("@/app/api/admin/news/[id]/route");
    const res = await PUT(new Request("http://localhost", { method: "PUT" }), mkP("n1"));
    expect(res.status).toBe(500);
  });

  it("DELETE returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.newsArticles.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { DELETE } = await import("@/app/api/admin/news/[id]/route");
    const res = await DELETE(new Request("http://localhost"), mkP("n1"));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/popups/[id] — GET 404/500, PUT 404, DELETE 404
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/popups/[id] (missing paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 404 when popup not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.announcementPopups.findFirst as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/admin/popups/[id]/route");
    const res = await GET(new Request("http://localhost"), mkP("p1"));
    expect(res.status).toBe(404);
  });

  it("GET returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.announcementPopups.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { GET } = await import("@/app/api/admin/popups/[id]/route");
    const res = await GET(new Request("http://localhost"), mkP("p1"));
    expect(res.status).toBe(500);
  });

  it("PUT returns 404 when popup not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { isActive: false } });
    (db.query.announcementPopups.findFirst as any).mockResolvedValue(null);
    const { PUT } = await import("@/app/api/admin/popups/[id]/route");
    const res = await PUT(new Request("http://localhost", { method: "PUT" }), mkP("p1"));
    expect(res.status).toBe(404);
  });

  it("DELETE returns 404 when popup not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.announcementPopups.findFirst as any).mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/admin/popups/[id]/route");
    const res = await DELETE(new Request("http://localhost"), mkP("p1"));
    expect(res.status).toBe(404);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/products/[id]/stock — missing secretData + 404 path
// ════════════════════════════════════════════════════════════════
describe("API: /api/products/[id]/stock (missing paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("PUT returns 400 when secretData is missing", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { PUT } = await import("@/app/api/products/[id]/stock/route");
    const res = await PUT(
      new NextRequest("http://localhost", { method: "PUT", body: JSON.stringify({ other: "data" }) }),
      mkP("p1")
    );
    expect(res.status).toBe(400);
  });

  it("PUT returns 404 when product not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.products.findFirst as any).mockResolvedValue(null);
    const { PUT } = await import("@/app/api/products/[id]/stock/route");
    const res = await PUT(
      new NextRequest("http://localhost", { method: "PUT", body: JSON.stringify({ secretData: "abc123" }) }),
      mkP("p1")
    );
    expect(res.status).toBe(404);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/register — existing user 400 + rate limit in production
// ════════════════════════════════════════════════════════════════
describe("API: /api/register (rate limit + existing user paths)", () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it("returns 400 when username already exists", async () => {
    (parseBody as any).mockResolvedValue({ data: { username: "taken", password: "Pass@123" } });
    (db.query.users.findFirst as any).mockResolvedValue({ id: "u1", username: "taken" });
    const { POST } = await import("@/app/api/register/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST" }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    (checkRegisterRateLimit as any).mockReturnValueOnce({ blocked: true, message: "Too many attempts" });
    const { POST } = await import("@/app/api/register/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST" }));
    expect(res.status).toBe(429);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/login — progressive delay path + catch 500
// ════════════════════════════════════════════════════════════════
describe("API: /api/login (progressive delay + 500)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("calls sleep when progressive delay > 0", async () => {
    (parseBody as any).mockResolvedValue({ data: { username: "user", password: "pass" } });
    (getProgressiveDelay as any).mockReturnValueOnce(100);
    (db.query.users.findFirst as any).mockResolvedValue({ id: "u1", username: "user", password: "hashed", role: "USER" });
    const { POST } = await import("@/app/api/login/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST" }));
    expect(sleep).toHaveBeenCalledWith(100);
    expect(res.status).toBe(200);
  });

  it("returns 500 on DB error", async () => {
    (parseBody as any).mockResolvedValue({ data: { username: "user", password: "pass" } });
    (db.query.users.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { POST } = await import("@/app/api/login/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST" }));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/roles — POST conflict 400 + catch 500
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/roles (POST paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("POST returns 400 when role code already exists", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { name: "Admin User", description: "", permissions: [] } });
    (db.query.roles.findFirst as any).mockResolvedValue({ id: "r1", code: "ADMIN_USER" });
    const { POST } = await import("@/app/api/admin/roles/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(400);
  });

  it("POST returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { name: "New Role", description: "", permissions: [] } });
    (db.query.roles.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { POST } = await import("@/app/api/admin/roles/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/nav-items — POST catch + GET with navCount=0 insert branch
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/nav-items (missing paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET covers count=0 branch (inserts defaults)", async () => {
    (db.select as any).mockReturnValueOnce({ from: vi.fn().mockResolvedValue([{ count: 0 }]) });
    (db.query.navItems.findMany as any).mockResolvedValue([]);
    const { GET } = await import("@/app/api/admin/nav-items/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(db.insert).toHaveBeenCalled();
  });

  it("POST returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { label: "Shop", href: "/shop" } });
    (db.select as any).mockReturnValueOnce({ from: vi.fn().mockRejectedValueOnce(new Error("DB fail")) });
    const { POST } = await import("@/app/api/admin/nav-items/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST" }));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/footer-links/settings — else branch (no settings) + PUT 500
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/footer-links/settings (missing paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET covers insert branch when settings is null", async () => {
    (db.query.footerWidgetSettings.findFirst as any)
      .mockResolvedValueOnce(null)         // first call: null → insert
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "s1" }); // second call after insert
    const { GET } = await import("@/app/api/admin/footer-links/settings/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(db.insert).toHaveBeenCalled();
  });

  it("PUT covers else branch (no existing settings → insert)", async () => {
    (db.query.footerWidgetSettings.findFirst as any)
      .mockResolvedValueOnce(null)          // no existing → insert branch
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "s1" }); // second findFirst after insert
    const { PUT } = await import("@/app/api/admin/footer-links/settings/route");
    const res = await PUT(new NextRequest("http://localhost", { method: "PUT", body: JSON.stringify({ isActive: true, title: "Menu" }) }));
    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/gacha-rewards — GET 500 + POST with CURRENCY type
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/gacha-rewards (missing paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.gachaRewards.findMany as any).mockRejectedValueOnce(new Error("DB fail"));
    const { GET } = await import("@/app/api/admin/gacha-rewards/route");
    const res = await GET(new Request("http://localhost"));
    expect(res.status).toBe(500);
  });

  it("POST returns 400 when PRODUCT type has no productId", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { rewardType: "PRODUCT", tier: "COMMON", isActive: true, probability: 1 } });
    const { POST } = await import("@/app/api/admin/gacha-rewards/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 when CURRENCY type has no rewardAmount", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { rewardType: "CURRENCY", tier: "COMMON", isActive: true, probability: 1 } });
    const { POST } = await import("@/app/api/admin/gacha-rewards/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 when CURRENCY type has no rewardName", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { rewardType: "CURRENCY", tier: "COMMON", isActive: true, probability: 1, rewardAmount: 100 } });
    const { POST } = await import("@/app/api/admin/gacha-rewards/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(400);
  });

  it("POST creates CURRENCY reward successfully", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { rewardType: "CURRENCY", tier: "COMMON", isActive: true, probability: 1, rewardAmount: 100, rewardName: "Gold" } });
    (db.query.gachaRewards.findFirst as any).mockResolvedValue({ id: "r1" });
    const { POST } = await import("@/app/api/admin/gacha-rewards/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/gacha-rewards/[id] — PUT catch
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/gacha-rewards/[id] PUT (catch coverage)", () => {
  it("PUT returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { isActive: false } });
    (db.update as any).mockImplementationOnce(() => ({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockRejectedValueOnce(new Error("DB fail")) }),
    }));
    const { PUT } = await import("@/app/api/admin/gacha-rewards/[id]/route");
    const res = await PUT(new Request("http://localhost", { method: "PUT" }), mkP("r1"));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// lib/auth — isAdminWithCsrf + isAuthenticatedWithCsrf (missing paths)
// ════════════════════════════════════════════════════════════════
describe("lib/auth (direct tests)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("isAdmin warns when ADMIN role missing from Role table", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (db.query.roles.findFirst as any).mockResolvedValue(null); // no admin role in table
    const realAuth = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
    const result = await realAuth.isAdmin();
    // Wait for fire-and-forget .then() to complete
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(result.success).toBe(true);
  });
});
