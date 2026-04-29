/**
 * Batch tests for admin [id] CRUD routes:
 * news/[id], roles/[id], products/[id]/featured, products/[id]/duplicate,
 * help/[id], popups/[id], promo-codes/[id], nav-items/[id], footer-links/[id], users/[id]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  isAdmin: vi.fn(),
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn() }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
    query: {
      newsArticles: { findFirst: vi.fn() },
      roles: { findFirst: vi.fn() },
      products: { findFirst: vi.fn() },
      helpArticles: { findFirst: vi.fn() },
      announcementPopups: { findFirst: vi.fn() },
      promoCodes: { findFirst: vi.fn() },
      navItems: { findFirst: vi.fn() },
      footerLinks: { findFirst: vi.fn() },
      users: { findFirst: vi.fn() },
    },
  },
  newsArticles: { id: "id" },
  roles: { id: "id", code: "code" },
  products: { id: "id" },
  helpArticles: { id: "id" },
  announcementPopups: { id: "id" },
  promoCodes: { id: "id", code: "code" },
  navItems: { id: "id" },
  footerLinks: { id: "id" },
  users: { id: "id", username: "username" },
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn(),
  auditUpdate: vi.fn(),
  AUDIT_ACTIONS: {
    NEWS_UPDATE: "NEWS_UPDATE", NEWS_DELETE: "NEWS_DELETE",
    ROLE_UPDATE: "ROLE_UPDATE", ROLE_DELETE: "ROLE_DELETE",
    PRODUCT_FEATURED_TOGGLE: "PRODUCT_FEATURED_TOGGLE",
    PRODUCT_DUPLICATE: "PRODUCT_DUPLICATE",
    HELP_UPDATE: "HELP_UPDATE", HELP_DELETE: "HELP_DELETE",
    POPUP_UPDATE: "POPUP_UPDATE", POPUP_DELETE: "POPUP_DELETE",
    USER_UPDATE: "USER_UPDATE",
  },
}));

vi.mock("@/lib/cache", () => ({
  invalidateNewsCaches: vi.fn(),
  invalidatePopupCaches: vi.fn(),
  invalidateProductCaches: vi.fn(),
}));

vi.mock("@/lib/validations/validate", () => ({ validateBody: vi.fn() }));
vi.mock("@/lib/validations/content", () => ({
  newsItemSchema: { partial: vi.fn().mockReturnValue({}) },
  helpItemSchema: { partial: vi.fn().mockReturnValue({}) },
}));
vi.mock("@/lib/utils/date", () => ({ mysqlNow: vi.fn(() => "2026-01-01 00:00:00") }));

import { isAdmin, requirePermission, requireAnyPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBody } from "@/lib/validations/validate";

const mkParams = (id: string) => ({ params: Promise.resolve({ id }) });

// ═══════════════════════════════════════
// Admin News [id]
// ═══════════════════════════════════════
describe("API: /api/admin/news/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ success: true, permissions: [] });
  });

  it("GET returns 401 when not admin", async () => {
    (requirePermission as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { GET } = await import("@/app/api/admin/news/[id]/route");
    const res = await GET(new Request("http://localhost"), mkParams("n1"));
    expect(res.status).toBe(401);
  });

  it("GET returns 404 when not found", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.newsArticles.findFirst as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/admin/news/[id]/route");
    const res = await GET(new Request("http://localhost"), mkParams("n1"));
    expect(res.status).toBe(404);
  });

  it("GET returns news article", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.newsArticles.findFirst as any).mockResolvedValue({ id: "n1", title: "News" });
    const { GET } = await import("@/app/api/admin/news/[id]/route");
    const res = await GET(new Request("http://localhost"), mkParams("n1"));
    expect(res.status).toBe(200);
  });

  it("PUT updates news article", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (validateBody as any).mockResolvedValue({ data: { title: "Updated" } });
    (db.query.newsArticles.findFirst as any)
      .mockResolvedValueOnce({ id: "n1", title: "Old" })
      .mockResolvedValueOnce({ id: "n1", title: "Updated" });
    const { PUT } = await import("@/app/api/admin/news/[id]/route");
    const req = new Request("http://localhost", { method: "PUT" });
    const res = await PUT(req, mkParams("n1"));
    expect(res.status).toBe(200);
  });

  it("DELETE removes news article", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.newsArticles.findFirst as any).mockResolvedValue({ id: "n1", title: "News" });
    const { DELETE } = await import("@/app/api/admin/news/[id]/route");
    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, mkParams("n1"));
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════
// Admin Roles [id]
// ═══════════════════════════════════════
describe("API: /api/admin/roles/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ success: true, permissions: [] });
  });

  it("GET returns 404 when not found", async () => {
    (db.query.roles.findFirst as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/admin/roles/[id]/route");
    const res = await GET(new Request("http://localhost"), mkParams("r1"));
    expect(res.status).toBe(404);
  });

  it("GET returns role", async () => {
    (db.query.roles.findFirst as any).mockResolvedValue({ id: "r1", name: "Admin" });
    const { GET } = await import("@/app/api/admin/roles/[id]/route");
    const res = await GET(new Request("http://localhost"), mkParams("r1"));
    expect(res.status).toBe(200);
  });

  it("PUT returns 400 when missing name/code", async () => {
    const { PUT } = await import("@/app/api/admin/roles/[id]/route");
    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req, mkParams("r1"));
    expect(res.status).toBe(400);
  });

  it("PUT updates role", async () => {
    (db.query.roles.findFirst as any)
      .mockResolvedValueOnce({ id: "r1", name: "Old", code: "OLD", description: null, sortOrder: 0 }) // fetch existing
      .mockResolvedValueOnce(null)  // code conflict check — no conflict
      .mockResolvedValueOnce({ id: "r1", name: "Updated", code: "UPDATED" }); // re-fetch after update
    const { PUT } = await import("@/app/api/admin/roles/[id]/route");
    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated", code: "UPDATED" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req, mkParams("r1"));
    expect(res.status).toBe(200);
  });

  it("DELETE prevents system role deletion", async () => {
    (db.query.roles.findFirst as any).mockResolvedValue({ id: "r1", isSystem: true });
    const { DELETE } = await import("@/app/api/admin/roles/[id]/route");
    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, mkParams("r1"));
    expect(res.status).toBe(400);
  });

  it("DELETE removes non-system role", async () => {
    (db.query.roles.findFirst as any).mockResolvedValue({ id: "r1", isSystem: false, name: "Custom", code: "CUSTOM" });
    const { DELETE } = await import("@/app/api/admin/roles/[id]/route");
    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, mkParams("r1"));
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════
// Products Featured Toggle
// ═══════════════════════════════════════
describe("API: /api/admin/products/[id]/featured", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ success: true, permissions: [] });
  });

  it("returns 401 when not admin", async () => {
    (requirePermission as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { PATCH } = await import("@/app/api/admin/products/[id]/featured/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ isFeatured: true }),
    });
    const res = await PATCH(req, mkParams("p1"));
    expect(res.status).toBe(401);
  });

  it("toggles featured status", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.products.findFirst as any).mockResolvedValue({ id: "p1", name: "Game", isFeatured: true });
    const { PATCH } = await import("@/app/api/admin/products/[id]/featured/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ isFeatured: true }),
    });
    const res = await PATCH(req, mkParams("p1"));
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════
// Products Duplicate
// ═══════════════════════════════════════
describe("API: /api/admin/products/[id]/duplicate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ success: true, permissions: [] });
  });

  it("returns 403 when not admin", async () => {
    (requirePermission as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { POST } = await import("@/app/api/admin/products/[id]/duplicate/route");
    const req = new NextRequest("http://localhost", { method: "POST" });
    const res = await POST(req, mkParams("p1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when product not found", async () => {
    (db.query.products.findFirst as any).mockResolvedValue(null);
    const { POST } = await import("@/app/api/admin/products/[id]/duplicate/route");
    const req = new NextRequest("http://localhost", { method: "POST" });
    const res = await POST(req, mkParams("p1"));
    expect(res.status).toBe(404);
  });

  it("duplicates product successfully", async () => {
    (db.query.products.findFirst as any)
      .mockResolvedValueOnce({ id: "p1", name: "Game", price: "100", category: "Games" })
      .mockResolvedValueOnce({ id: "p2", name: "Game (สำเนา)" });
    const { POST } = await import("@/app/api/admin/products/[id]/duplicate/route");
    const req = new NextRequest("http://localhost", { method: "POST" });
    const res = await POST(req, mkParams("p1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("preserves product configuration when duplicating", async () => {
    const valuesMock = vi.fn().mockResolvedValue({});
    (db.insert as any).mockReturnValueOnce({ values: valuesMock });
    (db.query.products.findFirst as any)
      .mockResolvedValueOnce({
        id: "p1",
        name: "Point Product",
        price: "100",
        discountPrice: "80",
        imageUrl: "/cover.png",
        imageUrls: ["/cover.png", "/gallery.png"],
        category: "Games",
        currency: "POINT",
        stockSeparator: "comma",
        autoDeleteAfterSale: 60,
      })
      .mockResolvedValueOnce({ id: "p2", name: "Point Product (สำเนา)" });
    const { POST } = await import("@/app/api/admin/products/[id]/duplicate/route");
    const req = new NextRequest("http://localhost", { method: "POST" });
    const res = await POST(req, mkParams("p1"));
    expect(res.status).toBe(200);
    expect(valuesMock).toHaveBeenCalledWith(expect.objectContaining({
      discountPrice: "80",
      imageUrls: ["/cover.png", "/gallery.png"],
      currency: "POINT",
      stockSeparator: "comma",
      autoDeleteAfterSale: 60,
    }));
  });
});

// ═══════════════════════════════════════
// Admin Users [id]
// ═══════════════════════════════════════
describe("API: /api/admin/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAnyPermission as any).mockResolvedValue({ success: true, permissions: [] });
  });

  it("returns 401 when not admin", async () => {
    (requireAnyPermission as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ creditBalance: 500 }),
    });
    const res = await PATCH(req, mkParams("u1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when user not found", async () => {
    (db.query.users.findFirst as any).mockResolvedValue(null);
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ creditBalance: 500 }),
    });
    const res = await PATCH(req, mkParams("u1"));
    expect(res.status).toBe(404);
  });

  it("updates user successfully", async () => {
    (db.query.users.findFirst as any).mockResolvedValue({
      id: "u1", username: "user1", creditBalance: "100", totalTopup: "50",
      pointBalance: 10, lifetimePoints: 10, role: "USER",
    });
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ creditBalance: 500 }),
    });
    const res = await PATCH(req, mkParams("u1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
