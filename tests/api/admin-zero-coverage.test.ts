/**
 * Batch tests for high-impact 0%-covered routes:
 * gacha-categories, gacha-machines, gacha-rewards, currency-settings, slips,
 * footer-links/[id], footer-links/settings, promo-codes/[id], help/[id],
 * popups/[id], nav-items/[id]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ isAdmin: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn() }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
    transaction: vi.fn(async (cb: any) => cb({
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
    })),
    query: {
      gachaCategories: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
      gachaMachines: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
      gachaRewards: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
      currencySettings: { findFirst: vi.fn() },
      topups: { findFirst: vi.fn() },
      promoCodes: { findFirst: vi.fn() },
      helpArticles: { findFirst: vi.fn() },
      announcementPopups: { findFirst: vi.fn() },
      navItems: { findFirst: vi.fn() },
      footerLinks: { findFirst: vi.fn() },
      footerWidgetSettings: { findFirst: vi.fn() },
    },
  },
  gachaCategories: { id: "id", sortOrder: "sortOrder" },
  gachaMachines: { id: "id" },
  gachaRewards: { id: "id" },
  currencySettings: { id: "id" },
  topups: { id: "id", userId: "userId", status: "status" },
  users: { id: "id", creditBalance: "creditBalance" },
  promoCodes: { id: "id", code: "code" },
  helpArticles: { id: "id" },
  announcementPopups: { id: "id" },
  navItems: { id: "id" },
  footerLinks: { id: "id" },
  footerWidgetSettings: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), sql: vi.fn(), asc: vi.fn(), desc: vi.fn(), and: vi.fn(),
}));

vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn(), auditUpdate: vi.fn(),
  AUDIT_ACTIONS: {
    GACHA_CATEGORY_CREATE: "GACHA_CATEGORY_CREATE",
    GACHA_MACHINE_CREATE: "GACHA_MACHINE_CREATE",
    TOPUP_APPROVE: "TOPUP_APPROVE",
    TOPUP_REJECT: "TOPUP_REJECT",
    HELP_UPDATE: "HELP_UPDATE", HELP_DELETE: "HELP_DELETE",
    POPUP_UPDATE: "POPUP_UPDATE", POPUP_DELETE: "POPUP_DELETE",
  },
}));

vi.mock("@/lib/cache", () => ({
  invalidatePopupCaches: vi.fn(),
  invalidateProductCaches: vi.fn(),
  invalidateNewsCaches: vi.fn(),
}));

vi.mock("@/lib/validations/validate", () => ({ validateBody: vi.fn() }));
vi.mock("@/lib/validations/content", () => ({
  currencySettingsSchema: {},
  helpItemSchema: { partial: vi.fn().mockReturnValue({}) },
  popupSchema: { partial: vi.fn().mockReturnValue({}) },
  navItemSchema: { partial: vi.fn().mockReturnValue({}) },
  footerLinkSchema: { partial: vi.fn().mockReturnValue({}) },
}));
vi.mock("@/lib/validations/promoCode", () => ({ promoCodeSchema: { partial: vi.fn().mockReturnValue({}) } }));
vi.mock("@/lib/utils/date", () => ({ mysqlNow: vi.fn(() => "2026-01-01 00:00:00") }));

import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBody } from "@/lib/validations/validate";

const mkParams = (id: string) => ({ params: Promise.resolve({ id }) });

// ═══════════════════════════════════════
// Gacha Categories
// ═══════════════════════════════════════
describe("API: /api/admin/gacha-categories", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { GET } = await import("@/app/api/admin/gacha-categories/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns categories", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.gachaCategories.findMany as any).mockResolvedValue([
      { id: "c1", name: "Action", sortOrder: 0, machines: [{ id: "m1" }] }
    ]);
    const { GET } = await import("@/app/api/admin/gacha-categories/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data[0]._count.machines).toBe(1);
  });

  it("POST returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { POST } = await import("@/app/api/admin/gacha-categories/route");
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "RPG" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("POST creates category", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.gachaCategories.findFirst as any).mockResolvedValue({ id: "new-id", name: "RPG" });
    const { POST } = await import("@/app/api/admin/gacha-categories/route");
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "RPG", sortOrder: 1 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ═══════════════════════════════════════
// Currency Settings
// ═══════════════════════════════════════
describe("API: /api/admin/currency-settings", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { GET } = await import("@/app/api/admin/currency-settings/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns existing settings", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.currencySettings.findFirst as any).mockResolvedValue({ id: "default", name: "พอยท์", symbol: "💎" });
    const { GET } = await import("@/app/api/admin/currency-settings/route");
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("GET creates default when none exist", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.currencySettings.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "default", name: "พอยท์" });
    const { GET } = await import("@/app/api/admin/currency-settings/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(db.insert).toHaveBeenCalled();
  });

  it("PUT returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { PUT } = await import("@/app/api/admin/currency-settings/route");
    const req = new NextRequest("http://localhost", { method: "PUT" });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it("PUT updates settings", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (validateBody as any).mockResolvedValue({ data: { name: "Coins", symbol: "🪙", isActive: true } });
    (db.query.currencySettings.findFirst as any)
      .mockResolvedValueOnce({ id: "default" })
      .mockResolvedValueOnce({ id: "default", name: "Coins" });
    const { PUT } = await import("@/app/api/admin/currency-settings/route");
    const req = new NextRequest("http://localhost", { method: "PUT" });
    const res = await PUT(req);
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════
// Admin Slips (Topup Approval)
// ═══════════════════════════════════════
describe("API: /api/admin/slips (PATCH)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { PATCH } = await import("@/app/api/admin/slips/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ id: "t1", action: "APPROVE" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when missing id or action", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    const { PATCH } = await import("@/app/api/admin/slips/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({}),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid action", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    const { PATCH } = await import("@/app/api/admin/slips/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ id: "t1", action: "INVALID" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when topup not found", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.topups.findFirst as any).mockResolvedValue(null);
    const { PATCH } = await import("@/app/api/admin/slips/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ id: "t1", action: "APPROVE" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(404);
  });

  it("returns 400 when already processed", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.topups.findFirst as any).mockResolvedValue({ id: "t1", status: "APPROVED", amount: "500", userId: "u1", user: { username: "user1" } });
    const { PATCH } = await import("@/app/api/admin/slips/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ id: "t1", action: "APPROVE" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("approves pending topup", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.topups.findFirst as any).mockResolvedValue({
      id: "t1", status: "PENDING", amount: "500", userId: "u1",
      user: { username: "user1" },
    });
    const { PATCH } = await import("@/app/api/admin/slips/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ id: "t1", action: "APPROVE" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("rejects pending topup", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.topups.findFirst as any).mockResolvedValue({
      id: "t1", status: "PENDING", amount: "500", userId: "u1",
      user: { username: "user1" },
    });
    const { PATCH } = await import("@/app/api/admin/slips/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ id: "t1", action: "REJECT" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════
// Admin Help [id]
// ═══════════════════════════════════════
describe("API: /api/admin/help/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("PUT returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { PUT } = await import("@/app/api/admin/help/[id]/route");
    const res = await PUT(new NextRequest("http://localhost"), mkParams("h1"));
    expect(res.status).toBe(401);
  });

  it("PUT returns 404 when not found", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (validateBody as any).mockResolvedValue({ data: { title: "Updated", content: "Answer" } });
    (db.query.helpArticles.findFirst as any).mockResolvedValue(null);
    const { PUT } = await import("@/app/api/admin/help/[id]/route");
    const res = await PUT(new NextRequest("http://localhost"), mkParams("h1"));
    expect(res.status).toBe(404);
  });

  it("PUT updates help article", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (validateBody as any).mockResolvedValue({ data: { title: "Updated", content: "Answer", sortOrder: 0, isActive: true } });
    (db.query.helpArticles.findFirst as any)
      .mockResolvedValueOnce({ id: "h1", question: "Old Q", answer: "Old A" })
      .mockResolvedValueOnce({ id: "h1", question: "Updated" });
    const { PUT } = await import("@/app/api/admin/help/[id]/route");
    const res = await PUT(new NextRequest("http://localhost"), mkParams("h1"));
    expect(res.status).toBe(200);
  });

  it("DELETE removes help article", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.helpArticles.findFirst as any).mockResolvedValue({ id: "h1", question: "FAQ" });
    const { DELETE } = await import("@/app/api/admin/help/[id]/route");
    const res = await DELETE(new NextRequest("http://localhost"), mkParams("h1"));
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════
// Admin Popups [id]
// ═══════════════════════════════════════
describe("API: /api/admin/popups/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("PUT returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { PUT } = await import("@/app/api/admin/popups/[id]/route");
    const res = await PUT(new Request("http://localhost"), mkParams("p1"));
    expect(res.status).toBe(401);
  });

  it("PUT returns 404 when not found", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (validateBody as any).mockResolvedValue({ data: { title: "Popup", imageUrl: "img.jpg", sortOrder: 0, isActive: true, dismissOption: "once" } });
    (db.query.announcementPopups.findFirst as any).mockResolvedValue(null);
    const { PUT } = await import("@/app/api/admin/popups/[id]/route");
    const res = await PUT(new Request("http://localhost"), mkParams("p1"));
    expect(res.status).toBe(404);
  });

  it("PUT updates popup", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (validateBody as any).mockResolvedValue({ data: { title: "New", imageUrl: "img.jpg", sortOrder: 0, isActive: true, dismissOption: "once" } });
    (db.query.announcementPopups.findFirst as any)
      .mockResolvedValueOnce({ id: "p1", title: "Old" })
      .mockResolvedValueOnce({ id: "p1", title: "New" });
    const { PUT } = await import("@/app/api/admin/popups/[id]/route");
    const res = await PUT(new Request("http://localhost"), mkParams("p1"));
    expect(res.status).toBe(200);
  });

  it("DELETE removes popup", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.announcementPopups.findFirst as any).mockResolvedValue({ id: "p1", title: "Popup" });
    const { DELETE } = await import("@/app/api/admin/popups/[id]/route");
    const res = await DELETE(new Request("http://localhost"), mkParams("p1"));
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════
// Admin Promo-Codes [id]
// ═══════════════════════════════════════
describe("API: /api/admin/promo-codes/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("PUT returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { PUT } = await import("@/app/api/admin/promo-codes/[id]/route");
    const req = new NextRequest("http://localhost", { method: "PUT" });
    const res = await PUT(req, mkParams("pc1"));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { DELETE } = await import("@/app/api/admin/promo-codes/[id]/route");
    const req = new NextRequest("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, mkParams("pc1"));
    expect(res.status).toBe(401);
  });

  it("DELETE removes promo code", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.promoCodes.findFirst as any).mockResolvedValue({ id: "pc1", code: "SAVE10" });
    const { DELETE } = await import("@/app/api/admin/promo-codes/[id]/route");
    const req = new NextRequest("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, mkParams("pc1"));
    expect(res.status).toBe(200);
  });
});
