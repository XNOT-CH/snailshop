/**
 * Batch coverage tests for remaining low-coverage routes:
 * - /api/admin/news            (GET + POST)
 * - /api/admin/popups/[id]     (GET + PUT + DELETE)
 * - /api/session               (POST + DELETE)
 * - /api/featured-products     (GET)
 * - /api/register              (POST)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────
vi.mock("@/lib/auth",  () => ({ isAdmin: vi.fn() }));
vi.mock("@/lib/utils/date", () => ({ mysqlNow: vi.fn(() => "2026-03-14 00:00:00") }));
vi.mock("@/lib/validations/validate", () => ({ validateBody: vi.fn() }));
vi.mock("@/lib/validations/content", () => ({
  newsItemSchema: {}, popupSchema: { partial: vi.fn().mockReturnValue({}) },
}));
vi.mock("@/lib/validations", () => ({ registerSchema: {} }));
vi.mock("@/lib/cache", () => ({
  invalidateNewsCaches:  vi.fn().mockResolvedValue(undefined),
  invalidatePopupCaches: vi.fn().mockResolvedValue(undefined),
  cacheOrFetch: vi.fn((_key: string, fetcher: () => Promise<unknown>) => fetcher()),
  CACHE_KEYS: { FEATURED_PRODUCTS: "featured_products" },
  CACHE_TTL: { MEDIUM: 300 },
}));
vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: {
    NEWS_CREATE: "NEWS_CREATE", POPUP_UPDATE: "POPUP_UPDATE",
    POPUP_DELETE: "POPUP_DELETE", REGISTER: "REGISTER",
  },
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRegisterRateLimit: vi.fn().mockReturnValue({ blocked: false }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));
vi.mock("@/lib/api", () => ({ parseBody: vi.fn() }));
vi.mock("@/lib/security/turnstile", () => ({
  verifyTurnstileToken: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("hashed_pw") } }));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      newsArticles:       { findMany: vi.fn(), findFirst: vi.fn() },
      announcementPopups: { findFirst: vi.fn() },
      users:              { findFirst: vi.fn() },
      products:           { findMany: vi.fn() },
    },
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }),
    select: vi.fn(),
  },
  newsArticles:       { id: "id", isActive: "isActive" },
  announcementPopups: { id: "id" },
  users:              { username: "username", id: "id" },
  products:           { id: "id", isFeatured: "isFeatured", isSold: "isSold", sortOrder: "sortOrder", name: "name", price: "price", imageUrl: "imageUrl", category: "category", createdAt: "createdAt" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), or: vi.fn(), asc: vi.fn(), desc: vi.fn(),
}));

import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBody } from "@/lib/validations/validate";
import { parseBody } from "@/lib/api";

const ADMIN_OK = { success: true };
const UNAUTH   = { success: false, error: "Unauthorized" };
const mkParams = (id: string) => ({ params: Promise.resolve({ id }) });

// ════════════════════════════════════════════════════════════════
// /api/admin/news
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/news (GET + POST)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const mkNewsReq = (params = "") =>
    new Request(`http://localhost/api/admin/news${params}`);

  it("GET returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { GET } = await import("@/app/api/admin/news/route");
    const res = await GET(mkNewsReq());
    expect(res.status).toBe(401);
  });

  it("GET returns all articles", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.newsArticles.findMany as any).mockResolvedValue([
      { id: "a1", title: "News 1", isActive: true },
    ]);
    const { GET } = await import("@/app/api/admin/news/route");
    const res = await GET(mkNewsReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it("GET filters by active=true param", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.newsArticles.findMany as any).mockResolvedValue([]);
    const { GET } = await import("@/app/api/admin/news/route");
    const res = await GET(mkNewsReq("?active=true"));
    expect(res.status).toBe(200);
  });

  it("GET returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.newsArticles.findMany as any).mockRejectedValue(new Error("DB fail"));
    const { GET } = await import("@/app/api/admin/news/route");
    const res = await GET(mkNewsReq());
    expect(res.status).toBe(500);
  });

  it("POST returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { POST } = await import("@/app/api/admin/news/route");
    const res = await POST(mkNewsReq());
    expect(res.status).toBe(401);
  });

  it("POST creates a news article", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({
      data: { title: "New Article", description: "Body", imageUrl: "/img.webp", link: "/link", sortOrder: 0, isActive: true },
    });
    (db.query.newsArticles.findFirst as any).mockResolvedValue({
      id: "a_new", title: "New Article", isActive: true,
    });
    const { POST } = await import("@/app/api/admin/news/route");
    const res = await POST(mkNewsReq());
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("New Article");
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/popups/[id]
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/popups/[id] (GET + PUT + DELETE)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const existingPopup = {
    id: "pp1", title: "Welcome", imageUrl: "/popup.webp", linkUrl: null,
    sortOrder: 0, isActive: true, dismissOption: "once",
  };

  it("GET returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { GET } = await import("@/app/api/admin/popups/[id]/route");
    const res = await GET(new Request("http://localhost"), mkParams("pp1"));
    expect(res.status).toBe(401);
  });

  it("GET returns popup", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.announcementPopups.findFirst as any).mockResolvedValue(existingPopup);
    const { GET } = await import("@/app/api/admin/popups/[id]/route");
    const res = await GET(new Request("http://localhost"), mkParams("pp1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Welcome");
  });

  it("GET returns 404 when not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.announcementPopups.findFirst as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/admin/popups/[id]/route");
    const res = await GET(new Request("http://localhost"), mkParams("pp_none"));
    expect(res.status).toBe(404);
  });

  it("PUT returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { PUT } = await import("@/app/api/admin/popups/[id]/route");
    const res = await PUT(new Request("http://localhost"), mkParams("pp1"));
    expect(res.status).toBe(401);
  });

  it("PUT returns 404 when not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { title: "Updated" } });
    (db.query.announcementPopups.findFirst as any).mockResolvedValue(null);
    const { PUT } = await import("@/app/api/admin/popups/[id]/route");
    const res = await PUT(new Request("http://localhost"), mkParams("pp_none"));
    expect(res.status).toBe(404);
  });

  it("PUT updates popup and tracks changes", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({
      data: { title: "New Title", imageUrl: "/new.webp", linkUrl: "/promo",
               sortOrder: 1, isActive: false, dismissOption: "always" },
    });
    (db.query.announcementPopups.findFirst as any)
      .mockResolvedValueOnce(existingPopup)
      .mockResolvedValueOnce({ ...existingPopup, title: "New Title", isActive: false });
    const { PUT } = await import("@/app/api/admin/popups/[id]/route");
    const res = await PUT(new Request("http://localhost"), mkParams("pp1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("New Title");
  });

  it("DELETE returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { DELETE } = await import("@/app/api/admin/popups/[id]/route");
    const res = await DELETE(new Request("http://localhost"), mkParams("pp1"));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 404 when not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.announcementPopups.findFirst as any).mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/admin/popups/[id]/route");
    const res = await DELETE(new Request("http://localhost"), mkParams("pp_none"));
    expect(res.status).toBe(404);
  });

  it("DELETE removes popup", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.announcementPopups.findFirst as any).mockResolvedValue(existingPopup);
    const { DELETE } = await import("@/app/api/admin/popups/[id]/route");
    const res = await DELETE(new Request("http://localhost"), mkParams("pp1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/session
// ════════════════════════════════════════════════════════════════
describe("API: /api/session (POST + DELETE)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("POST returns 410 because the legacy endpoint is disabled", async () => {
    const { POST } = await import("@/app/api/session/route");
    const res = await POST();
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.message).toContain("disabled");
  });

  it("DELETE returns 410 because the legacy endpoint is disabled", async () => {
    const { DELETE } = await import("@/app/api/session/route");
    const res = await DELETE();
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.message).toContain("disabled");
  });
});

// ════════════════════════════════════════════════════════════════
// /api/featured-products
// ════════════════════════════════════════════════════════════════
describe("API: /api/featured-products (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns featured products via cache", async () => {
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "p1", name: "ROV", price: "500", imageUrl: "/rov.webp", category: "GAME", isSold: false },
            ]),
          }),
        }),
      }),
    });
    const { GET } = await import("@/app/api/featured-products/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("ROV");
  });

  it("returns 500 on error", async () => {
    const { cacheOrFetch } = await import("@/lib/cache");
    (cacheOrFetch as any).mockRejectedValueOnce(new Error("Cache fail"));
    const { GET } = await import("@/app/api/featured-products/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/register
// ════════════════════════════════════════════════════════════════
describe("API: /api/register (POST)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("registers new user successfully", async () => {
    (parseBody as any).mockResolvedValue({ data: { username: "newuser", email: "new@example.com", password: "pass123" } });
    (db.query.users.findFirst as any).mockResolvedValue(null); // no existing user
    const { POST } = await import("@/app/api/register/route");
    const req = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ username: "newuser", email: "new@example.com", password: "pass123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain("สำเร็จ");
  });

  it("returns 400 when username already exists", async () => {
    (parseBody as any).mockResolvedValue({ data: { username: "existinguser", email: "existing@example.com", password: "pass123" } });
    (db.query.users.findFirst as any).mockResolvedValue({ id: "u1", username: "existinguser" });
    const { POST } = await import("@/app/api/register/route");
    const req = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ username: "existinguser", email: "existing@example.com", password: "pass123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("ถูกใช้งานแล้ว");
  });

  it("returns validation error from parseBody", async () => {
    const fakeError = { error: new Response(JSON.stringify({ message: "Invalid" }), { status: 400 }) };
    (parseBody as any).mockResolvedValue(fakeError);
    const { POST } = await import("@/app/api/register/route");
    const req = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 on unexpected error", async () => {
    (parseBody as any).mockRejectedValue(new Error("Unexpected error"));
    const { POST } = await import("@/app/api/register/route");
    const req = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ username: "user", email: "user@example.com", password: "pass" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
