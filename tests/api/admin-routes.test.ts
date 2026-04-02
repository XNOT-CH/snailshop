/**
 * Batch tests for admin API routes.
 * Common pattern: isAdmin() check → DB operation → response
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  isAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn() }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
    query: {
      newsArticles: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
      helpArticles: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
      roles: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
      siteSettings: { findFirst: vi.fn() },
      announcementPopups: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
    },
  },
  newsArticles: { id: "id", isActive: "isActive" },
  helpArticles: { id: "id" },
  roles: { id: "id", code: "code" },
  siteSettings: { id: "id" },
  announcementPopups: { id: "id", isActive: "isActive" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
  and: vi.fn(),
}));

vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn(),
  getChanges: vi.fn(() => []),
  AUDIT_ACTIONS: {
    NEWS_CREATE: "NEWS_CREATE", HELP_CREATE: "HELP_CREATE",
    ROLE_CREATE: "ROLE_CREATE", POPUP_CREATE: "POPUP_CREATE",
    SETTINGS_UPDATE: "SETTINGS_UPDATE",
  },
}));

vi.mock("@/lib/cache", () => ({
  invalidateNewsCaches: vi.fn(),
  invalidatePopupCaches: vi.fn(),
  invalidateSettingsCaches: vi.fn(),
}));

vi.mock("@/lib/validations/validate", () => ({
  validateBody: vi.fn(),
}));

vi.mock("@/lib/validations/content", () => ({
  newsItemSchema: {},
  helpItemSchema: {},
  roleSchema: {},
  popupSchema: {},
}));

vi.mock("@/lib/validations/settings", () => ({
  siteSettingsSchema: { partial: vi.fn().mockReturnValue({}) },
}));

vi.mock("@/lib/utils/date", () => ({
  mysqlNow: vi.fn(() => "2026-01-01 00:00:00"),
}));

import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBody } from "@/lib/validations/validate";

// ═══════════════════════════════════════════════════════════
// Admin News Routes
// ═══════════════════════════════════════════════════════════
describe("API: /api/admin/news", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("GET", () => {
    it("returns 401 when not admin", async () => {
      (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
      const { GET } = await import("@/app/api/admin/news/route");
      const req = new Request("http://localhost/api/admin/news");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("returns news articles", async () => {
      (isAdmin as any).mockResolvedValue({ success: true });
      (db.query.newsArticles.findMany as any).mockResolvedValue([{ id: "1", title: "News" }]);
      const { GET } = await import("@/app/api/admin/news/route");
      const req = new Request("http://localhost/api/admin/news");
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });

  describe("POST", () => {
    it("returns 401 when not admin", async () => {
      (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
      const { POST } = await import("@/app/api/admin/news/route");
      const req = new Request("http://localhost/api/admin/news", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("creates news article successfully", async () => {
      (isAdmin as any).mockResolvedValue({ success: true });
      (validateBody as any).mockResolvedValue({ data: { title: "News", description: "Desc", sortOrder: 0, isActive: true } });
      (db.query.newsArticles.findFirst as any).mockResolvedValue({ id: "new-id", title: "News" });
      const { POST } = await import("@/app/api/admin/news/route");
      const req = new Request("http://localhost/api/admin/news", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// Admin Help Routes
// ═══════════════════════════════════════════════════════════
describe("API: /api/admin/help", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("GET (public)", () => {
    it("returns help articles", async () => {
      (db.query.helpArticles.findMany as any).mockResolvedValue([{ id: "1", question: "FAQ" }]);
      const { GET } = await import("@/app/api/admin/help/route");
      const res = await GET();
      expect(res.status).toBe(200);
    });
  });

  describe("POST", () => {
    it("returns 401 when not admin", async () => {
      (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
      const { POST } = await import("@/app/api/admin/help/route");
      const req = new NextRequest("http://localhost/api/admin/help", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("creates help article", async () => {
      (isAdmin as any).mockResolvedValue({ success: true });
      (validateBody as any).mockResolvedValue({ data: { title: "FAQ", content: "Answer", sortOrder: 0, isActive: true } });
      (db.query.helpArticles.findFirst as any).mockResolvedValue({ id: "new-id" });
      const { POST } = await import("@/app/api/admin/help/route");
      const req = new NextRequest("http://localhost/api/admin/help", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// Admin Roles Routes
// ═══════════════════════════════════════════════════════════
describe("API: /api/admin/roles", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("GET", () => {
    it("returns 401 when not admin", async () => {
      (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
      const { GET } = await import("@/app/api/admin/roles/route");
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("returns roles list", async () => {
      (isAdmin as any).mockResolvedValue({ success: true });
      (db.query.roles.findMany as any).mockResolvedValue([{ id: "1", name: "Admin", code: "ADMIN" }]);
      const { GET } = await import("@/app/api/admin/roles/route");
      const res = await GET();
      expect(res.status).toBe(200);
    });
  });

  describe("POST", () => {
    it("returns 401 when not admin", async () => {
      (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
      const { POST } = await import("@/app/api/admin/roles/route");
      const req = new Request("http://localhost/api/admin/roles", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 if role code already exists", async () => {
      (isAdmin as any).mockResolvedValue({ success: true });
      (validateBody as any).mockResolvedValue({ data: { name: "Admin", description: "", permissions: [] } });
      (db.query.roles.findFirst as any).mockResolvedValue({ id: "existing" });
      const { POST } = await import("@/app/api/admin/roles/route");
      const req = new Request("http://localhost/api/admin/roles", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("creates role successfully", async () => {
      (isAdmin as any).mockResolvedValue({ success: true });
      (validateBody as any).mockResolvedValue({ data: { name: "Moderator", description: "Mod", permissions: ["product:view"] } });
      (db.query.roles.findFirst as any)
        .mockResolvedValueOnce(null) // code check
        .mockResolvedValueOnce({ id: "new-id", name: "Moderator", code: "MODERATOR" }); // find created
      const { POST } = await import("@/app/api/admin/roles/route");
      const req = new Request("http://localhost/api/admin/roles", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// Admin Popups Routes
// ═══════════════════════════════════════════════════════════
describe("API: /api/admin/popups", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("GET", () => {
    it("returns 401 when not admin", async () => {
      (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
      const { GET } = await import("@/app/api/admin/popups/route");
      const req = new Request("http://localhost/api/admin/popups");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("returns popups", async () => {
      (isAdmin as any).mockResolvedValue({ success: true });
      (db.query.announcementPopups.findMany as any).mockResolvedValue([]);
      const { GET } = await import("@/app/api/admin/popups/route");
      const req = new Request("http://localhost/api/admin/popups");
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });

  describe("POST", () => {
    it("returns 401 when not admin", async () => {
      (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
      const { POST } = await import("@/app/api/admin/popups/route");
      const req = new Request("http://localhost/api/admin/popups", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("creates popup successfully", async () => {
      (isAdmin as any).mockResolvedValue({ success: true });
      (validateBody as any).mockResolvedValue({ data: { title: "New!", imageUrl: "img.jpg", sortOrder: 0, isActive: true, dismissOption: "once" } });
      (db.query.announcementPopups.findFirst as any).mockResolvedValue({ id: "new-id" });
      const { POST } = await import("@/app/api/admin/popups/route");
      const req = new Request("http://localhost/api/admin/popups", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// Admin Settings Routes
// ═══════════════════════════════════════════════════════════
describe("API: /api/admin/settings", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("GET", () => {
    it("returns 401 when not admin", async () => {
      (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
      const { GET } = await import("@/app/api/admin/settings/route");
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("returns existing settings", async () => {
      (isAdmin as any).mockResolvedValue({ success: true });
      (db.query.siteSettings.findFirst as any).mockResolvedValue({ id: "s1", heroTitle: "Store" });
      const { GET } = await import("@/app/api/admin/settings/route");
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe("PUT", () => {
    it("returns 401 when not admin", async () => {
      (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
      const { PUT } = await import("@/app/api/admin/settings/route");
      const req = new Request("http://localhost/api/admin/settings", { method: "PUT" });
      const res = await PUT(req);
      expect(res.status).toBe(401);
    });

    it("updates existing settings", async () => {
      (isAdmin as any).mockResolvedValue({ success: true });
      (validateBody as any).mockResolvedValue({ data: { heroTitle: "Updated" } });
      (db.query.siteSettings.findFirst as any)
        .mockResolvedValueOnce({ id: "s1" }) // existing
        .mockResolvedValueOnce({ id: "s1", heroTitle: "Updated" }); // after update
      const { PUT } = await import("@/app/api/admin/settings/route");
      const req = new Request("http://localhost/api/admin/settings", { method: "PUT" });
      const res = await PUT(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});
