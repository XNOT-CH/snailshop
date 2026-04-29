/**
 * FINAL coverage patch — covers remaining catch/error paths and edge cases
 * across 15+ partially-covered routes and lib files.
 *
 * Pattern: for each route with a catch block, make the primary DB call throw.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Global Mocks ──────────────────────────────────────────────
vi.mock("@/auth",      () => ({ auth: vi.fn() }));
vi.mock("@/lib/auth",  () => ({ isAdmin: vi.fn(), isAuthenticated: vi.fn() }));
vi.mock("@/lib/utils/date", () => ({ mysqlNow: vi.fn(() => "2026-03-14 00:00:00") }));
vi.mock("@/lib/validations/validate", () => ({ validateBody: vi.fn() }));
vi.mock("@/lib/validations/content", () => ({
  newsItemSchema: {}, helpArticleSchema: {},
  helpItemSchema: { partial: vi.fn().mockReturnValue({}) },
  navItemSchema:  { partial: vi.fn().mockReturnValue({}) },
  popupSchema:    { partial: vi.fn().mockReturnValue({}) },
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
  CACHE_KEYS: { FEATURED_PRODUCTS: "fp", SITE_SETTINGS: "ss" },
  CACHE_TTL: { LONG: 3600 },
}));
vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn().mockResolvedValue(undefined),
  auditUpdate: vi.fn().mockResolvedValue(undefined),
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  getAuditLogs: vi.fn().mockResolvedValue([]),
  getChanges: vi.fn().mockReturnValue([]),
  cleanupOldAuditLogs: vi.fn().mockResolvedValue(0),
  AUDIT_ACTIONS: {
    SETTINGS_UPDATE: "SETTINGS_UPDATE", ROLE_UPDATE: "ROLE_UPDATE",
    ROLE_DELETE: "ROLE_DELETE", HELP_UPDATE: "HELP_UPDATE", HELP_DELETE: "HELP_DELETE",
    USER_ROLE_CHANGE: "USER_ROLE_CHANGE", PRODUCT_DUPLICATE: "PRODUCT_DUPLICATE",
  },
}));
vi.mock("@/lib/encryption", () => ({ decrypt: vi.fn().mockReturnValue("dec"), encrypt: vi.fn().mockReturnValue("enc") }));
vi.mock("@/lib/rateLimit",  () => ({ getClientIp: vi.fn().mockReturnValue("127.0.0.1"), checkRegisterRateLimit: vi.fn().mockReturnValue({ blocked: false }) }));
vi.mock("@/lib/api",        () => ({ parseBody: vi.fn() }));
vi.mock("bcryptjs",         () => ({ default: { hash: vi.fn().mockResolvedValue("hashed"), compare: vi.fn().mockResolvedValue(true) } }));
vi.mock("next/headers",     () => ({ cookies: vi.fn().mockResolvedValue({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }) }));
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
      users:              { findFirst: vi.fn(), findMany: vi.fn() },
      newsArticles:       { findMany: vi.fn(), findFirst: vi.fn() },
      helpArticles:       { findMany: vi.fn(), findFirst: vi.fn() },
      announcementPopups: { findMany: vi.fn(), findFirst: vi.fn() },
      roles:              { findMany: vi.fn(), findFirst: vi.fn() },
      userRoles:          { findMany: vi.fn() },
      siteSettings:       { findFirst: vi.fn() },
      gachaSettings:      { findFirst: vi.fn() },
      promoCodes:         { findMany: vi.fn(), findFirst: vi.fn() },
      auditLogs:          { findMany: vi.fn() },
      orders:             { findMany: vi.fn() },
    },
    select: vi.fn(),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }),
  },
  navItems:           { isActive: "isActive", sortOrder: "sortOrder", id: "id" }, footerWidgetSettings: { id: "id", isActive: "isActive" },
  footerLinks:        { isActive: "isActive", id: "id", sortOrder: "sortOrder" },
  gachaRollLogs:      { userId: "userId", createdAt: "createdAt", tier: "tier", id: "id" },
  gachaMachines:      { id: "id", isActive: "isActive", isEnabled: "isEnabled" },
  gachaRewards:       { id: "id", gachaMachineId: "gachaMachineId", isActive: "isActive" },
  users:              { id: "id", username: "username" },
  newsArticles:       { id: "id", isActive: "isActive" },
  helpArticles:       { id: "id", isPublished: "isPublished" },
  announcementPopups: { id: "id", isActive: "isActive" },
  roles:              { id: "id", name: "name" },
  siteSettings:       { id: "id" },
  gachaSettings:      { id: "id" },
  promoCodes:         { id: "id", isActive: "isActive" },
  auditLogs:          { userId: "userId", action: "action", resource: "resource", createdAt: "createdAt", id: "id" },
  products:           { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), gte: vi.fn(), lte: vi.fn(), lt: vi.fn(),
  count: vi.fn(), max: vi.fn(), sql: vi.fn(), isNull: vi.fn(), asc: vi.fn(), desc: vi.fn(),
}));

import { auth }          from "@/auth";
import { isAdmin, isAuthenticated } from "@/lib/auth";
import { db }            from "@/lib/db";
import { validateBody }  from "@/lib/validations/validate";
import { parseBody }     from "@/lib/api";

const ADMIN_OK = { success: true };
const UNAUTH   = { success: false, error: "Unauthorized" };
const AUTH_OK  = { success: true, userId: "u1" };
const mkParams = (id: string) => ({ params: Promise.resolve({ id }) });

// ════════════════════════════════════════════════════════════════
// /api/nav-items — catch block
// ════════════════════════════════════════════════════════════════
describe("API: /api/nav-items (error path)", () => {
  it("returns 500 on DB error", async () => {
    (db.query.navItems.findMany as any).mockRejectedValueOnce(new Error("DB fail"));
    const { GET } = await import("@/app/api/nav-items/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/footer-widget — catch block
// ════════════════════════════════════════════════════════════════
describe("API: /api/footer-widget (error path)", () => {
  it("returns 500 on DB error", async () => {
    (db.query.footerWidgetSettings.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { GET } = await import("@/app/api/footer-widget/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/session — deprecated legacy endpoint
// ════════════════════════════════════════════════════════════════
describe("API: /api/session (error paths)", () => {
  it("POST returns 410 when the legacy route is disabled", async () => {
    const { POST } = await import("@/app/api/session/route");
    const res = await POST();
    expect(res.status).toBe(410);
  });

  it("DELETE returns 410 when the legacy route is disabled", async () => {
    const { DELETE } = await import("@/app/api/session/route");
    const res = await DELETE();
    expect(res.status).toBe(410);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/profile — 404 when user not found + 500 catch
// ════════════════════════════════════════════════════════════════
describe("API: /api/profile (edge paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 404 when user not found in DB", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/profile/route");
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns 500 on DB error", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { GET } = await import("@/app/api/profile/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/gacha/history — catch block
// ════════════════════════════════════════════════════════════════
describe("API: /api/gacha/history (error path)", () => {
  it("returns 500 on DB error", async () => {
    (isAuthenticated as any).mockResolvedValue(AUTH_OK);
    (db.query.gachaRollLogs.findMany as any).mockRejectedValueOnce(new Error("DB fail"));
    const { GET } = await import("@/app/api/gacha/history/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/news — catch block (public route)
// ════════════════════════════════════════════════════════════════
describe("API: /api/news (error path)", () => {
  it("returns 500 on DB error", async () => {
    (db.query.newsArticles.findMany as any).mockRejectedValueOnce(new Error("DB fail"));
    const { GET } = await import("@/app/api/news/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/help/[id] — PUT error path (no GET handler exists)
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/help/[id] (error paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("PUT returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { title: "Updated" } });
    (db.query.helpArticles.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { PUT } = await import("@/app/api/admin/help/[id]/route");
    const res = await PUT(new NextRequest("http://localhost", { method: "PUT" }), mkParams("h1"));
    expect(res.status).toBe(500);
  });

  it("DELETE returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.helpArticles.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { DELETE } = await import("@/app/api/admin/help/[id]/route");
    const res = await DELETE(new NextRequest("http://localhost"), mkParams("h1"));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/roles  — GET all + error paths
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/roles (error paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { GET } = await import("@/app/api/admin/roles/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.roles.findMany as any).mockRejectedValueOnce(new Error("DB fail"));
    const { GET } = await import("@/app/api/admin/roles/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/promo-codes — catch blocks
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/promo-codes (error paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.promoCodes.findMany as any).mockRejectedValueOnce(new Error("DB fail"));
    const { GET } = await import("@/app/api/admin/promo-codes/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("POST returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { code: "SAVE10", discountType: "PERCENTAGE", discountValue: 10, minPurchase: 0, maxDiscount: null, usageLimit: null, startsAt: "2026-01-01", expiresAt: null, isActive: true } });
    (db.query.promoCodes.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { POST } = await import("@/app/api/admin/promo-codes/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST" }));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/footer-links — catch blocks
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/footer-links (error paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.footerLinks.findMany as any).mockRejectedValueOnce(new Error("DB fail"));
    const { GET } = await import("@/app/api/admin/footer-links/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("POST returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { label: "Shop", href: "/shop", openInNewTab: false } });
    (db.select as any) = vi.fn().mockReturnValue({ from: vi.fn().mockRejectedValueOnce(new Error("DB fail")) });
    const { POST } = await import("@/app/api/admin/footer-links/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST" }));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/footer-links/[id] — catch blocks
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/footer-links/[id] (error paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("PUT returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { isActive: false } });
    (db.query.footerLinks.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { PUT } = await import("@/app/api/admin/footer-links/[id]/route");
    const res = await PUT(new NextRequest("http://localhost"), mkParams("f1"));
    expect(res.status).toBe(500);
  });

  it("DELETE returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.delete as any).mockReturnValueOnce({ where: vi.fn().mockRejectedValueOnce(new Error("DB fail")) });
    const { DELETE } = await import("@/app/api/admin/footer-links/[id]/route");
    const res = await DELETE(new NextRequest("http://localhost"), mkParams("f1"));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/gacha-settings — error paths
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/gacha-settings (error paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.gachaSettings.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { GET } = await import("@/app/api/admin/gacha-settings/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("PUT returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { enabled: true } });
    (db.query.gachaSettings.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { PUT } = await import("@/app/api/admin/gacha-settings/route");
    const res = await PUT(new Request("http://localhost"));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/settings — error paths
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/settings (error paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.siteSettings.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { GET } = await import("@/app/api/admin/settings/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("PUT returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { heroTitle: "Test" } });
    (db.query.siteSettings.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { PUT } = await import("@/app/api/admin/settings/route");
    const res = await PUT(new Request("http://localhost"));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/nav-items/[id] — error paths
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/nav-items/[id] (error paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("PUT returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { label: "Home", href: "/" } });
    (db.query.navItems.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { PUT } = await import("@/app/api/admin/nav-items/[id]/route");
    const res = await PUT(new NextRequest("http://localhost"), mkParams("n1"));
    expect(res.status).toBe(500);
  });

  it("DELETE returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.delete as any).mockReturnValueOnce({ where: vi.fn().mockRejectedValueOnce(new Error("DB fail")) });
    const { DELETE } = await import("@/app/api/admin/nav-items/[id]/route");
    const res = await DELETE(new NextRequest("http://localhost"), mkParams("n1"));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/user/settings — deprecated legacy endpoint
// ════════════════════════════════════════════════════════════════
describe("API: /api/user/settings (error paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("PATCH returns 410 when the legacy route is disabled", async () => {
    const { PATCH } = await import("@/app/api/user/settings/route");
    const res = await PATCH();
    expect(res.status).toBe(410);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/popups — error paths
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/popups (error paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.announcementPopups.findMany as any).mockRejectedValueOnce(new Error("DB fail"));
    const { GET } = await import("@/app/api/admin/popups/route");
    const res = await GET(new Request("http://localhost"));
    expect(res.status).toBe(500);
  });

  it("POST returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { title: "Popup", imageUrl: "/p.webp", sortOrder: 0, isActive: true, dismissOption: "once" } });
    (db.query.announcementPopups.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { POST } = await import("@/app/api/admin/popups/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/roles/[id] — error paths
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/roles/[id] (error paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.roles.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { GET } = await import("@/app/api/admin/roles/[id]/route");
    const res = await GET(new NextRequest("http://localhost"), mkParams("r1"));
    expect(res.status).toBe(500);
  });

  it("PUT returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.roles.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { PUT } = await import("@/app/api/admin/roles/[id]/route");
    const res = await PUT(
      new NextRequest("http://localhost", { method: "PUT", body: JSON.stringify({ name: "Admin", code: "ADMIN" }) }),
      mkParams("r1")
    );
    expect(res.status).toBe(500);
  });

  it("DELETE returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.roles.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { DELETE } = await import("@/app/api/admin/roles/[id]/route");
    const res = await DELETE(new NextRequest("http://localhost"), mkParams("r1"));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/gacha-machines/[id]/duplicate — error path
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/gacha-machines/[id]/duplicate (error path)", () => {
  it("returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.gachaMachines.findFirst as any).mockRejectedValueOnce(new Error("DB fail"));
    const { POST } = await import("@/app/api/admin/gacha-machines/[id]/duplicate/route");
    const res = await POST(new Request("http://localhost"), mkParams("m1"));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// lib/auditLog — direct unit tests
// ════════════════════════════════════════════════════════════════
describe("lib/auditLog", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("getChanges with null oldData adds new fields", async () => {
    const { getChanges } = await import("@/lib/auditLog");
    // Unmock for real implementation
    const realModule = await vi.importActual<typeof import("@/lib/auditLog")>("@/lib/auditLog");
    const changes = realModule.getChanges(null, { name: "Alice", score: null }, ["name"]);
    expect(changes).toHaveLength(1); // score is null, only name tracked (score null skipped)
    expect(changes[0].field).toBe("name");
  });

  it("getChanges with fieldsToTrack filter", async () => {
    const realModule = await vi.importActual<typeof import("@/lib/auditLog")>("@/lib/auditLog");
    const changes = realModule.getChanges(
      { name: "Alice", role: "USER" },
      { name: "Bob", role: "ADMIN" },
      ["name"] // only track name
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe("name");
  });

  it("getChanges ignores undefined values", async () => {
    const realModule = await vi.importActual<typeof import("@/lib/auditLog")>("@/lib/auditLog");
    const changes = realModule.getChanges({ name: "Alice" }, { name: undefined as any });
    expect(changes).toHaveLength(0); // undefined values skipped
  });

  it("getChanges detects changed fields", async () => {
    const realModule = await vi.importActual<typeof import("@/lib/auditLog")>("@/lib/auditLog");
    const changes = realModule.getChanges({ x: 1, y: 2 }, { x: 1, y: 99 });
    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe("y");
    expect(changes[0].newValue).toBe(99);
  });
});
