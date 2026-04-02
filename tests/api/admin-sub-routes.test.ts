/**
 * Batch tests for admin sub-routes: promo-codes, nav-items, footer-links, audit-logs,
 * currency-settings, export, slips, gacha-settings
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ isAdmin: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn() }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 5 }]),
      }),
    }),
    query: {
      promoCodes: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
      navItems: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
      footerLinks: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
      footerWidgetSettings: { findFirst: vi.fn() },
      auditLogs: { findMany: vi.fn().mockResolvedValue([]) },
    },
  },
  promoCodes: { code: "code", id: "id" },
  navItems: { id: "id", sortOrder: "sortOrder" },
  footerLinks: { id: "id", sortOrder: "sortOrder" },
  footerWidgetSettings: {},
  auditLogs: { userId: "userId", action: "action", resource: "resource", createdAt: "createdAt" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), gte: vi.fn(), lte: vi.fn(), count: vi.fn(), max: vi.fn(),
}));

vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn(),
  getAuditLogs: vi.fn().mockResolvedValue([]),
  AUDIT_ACTIONS: {
    LOGIN: "LOGIN", PRODUCT_CREATE: "PRODUCT_CREATE",
  },
}));

vi.mock("@/lib/validations/validate", () => ({ validateBody: vi.fn() }));
vi.mock("@/lib/validations/promoCode", () => ({ promoCodeSchema: {} }));
vi.mock("@/lib/validations/content", () => ({
  navItemSchema: {}, footerLinkSchema: {},
}));
vi.mock("@/lib/utils/date", () => ({ mysqlNow: vi.fn(() => "2026-01-01 00:00:00") }));

import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBody } from "@/lib/validations/validate";

// ═══════════════════════════════════════
// Admin Promo Codes
// ═══════════════════════════════════════
describe("API: /api/admin/promo-codes", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("GET", () => {
    it("returns 401 when not admin", async () => {
      (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
      const { GET } = await import("@/app/api/admin/promo-codes/route");
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("returns promo codes list", async () => {
      (isAdmin as any).mockResolvedValue({ success: true });
      (db.query.promoCodes.findMany as any).mockResolvedValue([
        { id: "1", code: "SAVE10", discountValue: "10", minPurchase: "100", maxDiscount: "50" },
      ]);
      const { GET } = await import("@/app/api/admin/promo-codes/route");
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe("POST", () => {
    it("returns 401 when not admin", async () => {
      (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
      const { POST } = await import("@/app/api/admin/promo-codes/route");
      const req = new NextRequest("http://localhost", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 if code already exists", async () => {
      (isAdmin as any).mockResolvedValue({ success: true });
      (validateBody as any).mockResolvedValue({ data: { code: "SAVE10", discountType: "PERCENTAGE", discountValue: 10, minOrderAmount: 0, maxUses: 0, isActive: true } });
      (db.query.promoCodes.findFirst as any).mockResolvedValue({ id: "existing" });
      const { POST } = await import("@/app/api/admin/promo-codes/route");
      const req = new NextRequest("http://localhost", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("creates promo code successfully", async () => {
      (isAdmin as any).mockResolvedValue({ success: true });
      (validateBody as any).mockResolvedValue({ data: { code: "NEW20", discountType: "FIXED", discountValue: 20, minOrderAmount: 0, maxUses: 100, isActive: true } });
      (db.query.promoCodes.findFirst as any).mockResolvedValue(null);
      const { POST } = await import("@/app/api/admin/promo-codes/route");
      const req = new NextRequest("http://localhost", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});

// ═══════════════════════════════════════
// Admin Nav Items
// ═══════════════════════════════════════
describe("API: /api/admin/nav-items", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("GET", () => {
    it("returns nav items", async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockResolvedValue([{ count: 5 }]),
      });
      const { GET } = await import("@/app/api/admin/nav-items/route");
      const res = await GET();
      expect(res.status).toBe(200);
    });
  });

  describe("POST", () => {
    it("returns 401 when not admin", async () => {
      (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
      const { POST } = await import("@/app/api/admin/nav-items/route");
      const req = new NextRequest("http://localhost", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("creates nav item", async () => {
      (isAdmin as any).mockResolvedValue({ success: true });
      (validateBody as any).mockResolvedValue({ data: { label: "Shop", href: "/shop", icon: "shop" } });
      (db.select as any).mockReturnValue({ from: vi.fn().mockResolvedValue([{ maxSort: 3 }]) });
      (db.query.navItems.findFirst as any).mockResolvedValue({ id: "new-id", label: "Shop" });
      const { POST } = await import("@/app/api/admin/nav-items/route");
      const req = new NextRequest("http://localhost", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });
  });
});

// ═══════════════════════════════════════
// Admin Footer Links
// ═══════════════════════════════════════
describe("API: /api/admin/footer-links", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("GET", () => {
    it("returns footer links with settings", async () => {
      (db.query.footerWidgetSettings.findFirst as any).mockResolvedValue({ id: "s1", isActive: true, title: "Links" });
      const { GET } = await import("@/app/api/admin/footer-links/route");
      const res = await GET();
      expect(res.status).toBe(200);
    });

    it("creates default settings when none exist", async () => {
      (db.query.footerWidgetSettings.findFirst as any)
        .mockResolvedValueOnce(null) // singleton lookup
        .mockResolvedValueOnce(null) // legacy fallback lookup
        .mockResolvedValueOnce({ id: "new", isActive: true, title: "เมนูลัด" }); // re-fetch
      const { GET } = await import("@/app/api/admin/footer-links/route");
      const res = await GET();
      expect(res.status).toBe(200);
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("returns 401 when not admin", async () => {
      (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
      const { POST } = await import("@/app/api/admin/footer-links/route");
      const req = new NextRequest("http://localhost", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("creates footer link", async () => {
      (isAdmin as any).mockResolvedValue({ success: true });
      (validateBody as any).mockResolvedValue({ data: { label: "FAQ", href: "/faq", openInNewTab: false } });
      (db.select as any).mockReturnValue({ from: vi.fn().mockResolvedValue([{ maxSort: 2 }]) });
      (db.query.footerLinks.findFirst as any).mockResolvedValue({ id: "new-id", label: "FAQ" });
      const { POST } = await import("@/app/api/admin/footer-links/route");
      const req = new NextRequest("http://localhost", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });
  });
});

// ═══════════════════════════════════════
// Admin Audit Logs
// ═══════════════════════════════════════
describe("API: /api/admin/audit-logs (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { GET } = await import("@/app/api/admin/audit-logs/route");
    const req = new Request("http://localhost/api/admin/audit-logs");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns audit logs", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 10 }]),
      }),
    });
    const { GET } = await import("@/app/api/admin/audit-logs/route");
    const req = new Request("http://localhost/api/admin/audit-logs");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.logs).toBeDefined();
    expect(body.total).toBeDefined();
  });
});
