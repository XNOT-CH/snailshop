/**
 * Batch tests for remaining 0%-covered gacha and content admin routes:
 * gacha-machines, gacha-rewards/[id], footer-links/[id],
 * footer-links/settings, nav-items/[id]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { isAdminMock } = vi.hoisted(() => ({
  isAdminMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  isAdmin: isAdminMock,
  isAdminWithCsrf: isAdminMock,
  requirePermission: isAdminMock,
  requirePermissionWithCsrf: isAdminMock,
  requireAnyPermission: isAdminMock,
  requireAnyPermissionWithCsrf: isAdminMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn() }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
    query: {
      gachaMachines: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
      gachaSettings: { findFirst: vi.fn() },
      gachaCategories: { findFirst: vi.fn() },
      gachaRewards: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
      footerLinks: { findFirst: vi.fn() },
      footerWidgetSettings: { findFirst: vi.fn() },
      navItems: { findFirst: vi.fn() },
    },
  },
  gachaMachines: { id: "id", sortOrder: "sortOrder" },
  gachaSettings: { id: "id" },
  gachaCategories: { id: "id" },
  gachaRewards: { id: "id", isActive: "isActive", gachaMachineId: "gachaMachineId", createdAt: "createdAt" },
  footerLinks: { id: "id" },
  footerWidgetSettings: { id: "id" },
  navItems: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), isNull: vi.fn(), asc: vi.fn() }));

vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn(), auditUpdate: vi.fn(),
  AUDIT_ACTIONS: { GACHA_REWARD_DELETE: "GACHA_REWARD_DELETE" },
}));

vi.mock("@/lib/validations/validate", () => ({ validateBody: vi.fn() }));
vi.mock("@/lib/validations/gacha", () => ({
  gachaMachineSchema: {},
  gachaSettingsSchema: {},
  gachaRewardSchema: { partial: vi.fn().mockReturnValue({}) },
  gachaRewardPatchSchema: {},
}));
vi.mock("@/lib/validations/content", () => ({
  footerLinkSchema: { partial: vi.fn().mockReturnValue({}) },
  footerLinkUpdateSchema: {},
  navItemSchema: { partial: vi.fn().mockReturnValue({}) },
  footerWidgetSettingsSchema: { partial: vi.fn().mockReturnValue({}) },
}));
vi.mock("@/lib/utils/date", () => ({
  mysqlNow: vi.fn(() => "2026-01-01 00:00:00"),
  toMySQLDatetime: vi.fn(() => "2026-01-01 00:00:00"),
}));

import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBody } from "@/lib/validations/validate";

const mkParams = (id: string) => ({ params: Promise.resolve({ id }) });

// ═══════════════════════════════════════
// Gacha Machines
// ═══════════════════════════════════════
describe("API: /api/admin/gacha-machines", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { GET } = await import("@/app/api/admin/gacha-machines/route");
    const res = await GET();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ success: false });
  });

  it("GET returns machines", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.gachaMachines.findMany as any).mockResolvedValue([
      { id: "m1", name: "Lucky Box", rewards: [{ id: "r1" }, { id: "r2" }], category: { name: "Action" } }
    ]);
    const { GET } = await import("@/app/api/admin/gacha-machines/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      success: true,
      data: [
        {
          id: "m1",
          name: "Lucky Box",
          category: { name: "Action" },
          _count: { rewards: 2 },
          probabilityTotal: 0,
          isProbabilityComplete: false,
        },
      ],
    });
  });

  it("POST returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { POST } = await import("@/app/api/admin/gacha-machines/route");
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ success: false });
  });

  it("POST creates machine", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (validateBody as any).mockResolvedValue({ data: {
      name: "Lucky Box", gameType: "STANDARD", costType: "CREDIT",
      costAmount: 100, dailySpinLimit: 10, tierMode: "PRICE", sortOrder: 0,
    }});
    (db.query.gachaMachines.findFirst as any).mockResolvedValue({ id: "new-id", name: "Lucky Box" });
    const { POST } = await import("@/app/api/admin/gacha-machines/route");
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      success: true,
      data: { id: "new-id", name: "Lucky Box" },
    });
  });
});


// ═══════════════════════════════════════
// Gacha Rewards [id]
// ═══════════════════════════════════════
describe("API: /api/admin/gacha-rewards/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("PUT returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { PUT } = await import("@/app/api/admin/gacha-rewards/[id]/route");
    const res = await PUT(new Request("http://localhost"), mkParams("r1"));
    expect(res.status).toBe(401);
  });

  it("PUT updates without existence check", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (validateBody as any).mockResolvedValue({ data: { probability: 5, tier: "BRONZE" } });
    (db.query.gachaRewards.findFirst as any).mockResolvedValue({ id: "r1", name: "Bronze Medal" });
    const { PUT } = await import("@/app/api/admin/gacha-rewards/[id]/route");
    const res = await PUT(new Request("http://localhost"), mkParams("r1"));
    expect(res.status).toBe(200);
  });

  it("PUT updates reward", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (validateBody as any).mockResolvedValue({ data: { name: "Gold Medal", probability: 10, tier: "GOLD" } });
    (db.query.gachaRewards.findFirst as any)
      .mockResolvedValueOnce({ id: "r1", name: "Old", probability: "5", tier: "SILVER" })
      .mockResolvedValueOnce({ id: "r1", name: "Gold Medal" });
    const { PUT } = await import("@/app/api/admin/gacha-rewards/[id]/route");
    const res = await PUT(new Request("http://localhost"), mkParams("r1"));
    expect(res.status).toBe(200);
  });

  it("DELETE removes reward", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.gachaRewards.findFirst as any).mockResolvedValue({ id: "r1", name: "Gold Medal" });
    const { DELETE } = await import("@/app/api/admin/gacha-rewards/[id]/route");
    const res = await DELETE(new Request("http://localhost"), mkParams("r1"));
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════
// Footer Links [id]
// ═══════════════════════════════════════
describe("API: /api/admin/footer-links/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("PUT returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { PUT } = await import("@/app/api/admin/footer-links/[id]/route");
    const req = new NextRequest("http://localhost", { method: "PUT" });
    const res = await PUT(req, mkParams("fl1"));
    expect(res.status).toBe(401);
  });

  it("PUT updates footer link", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (validateBody as any).mockResolvedValue({ data: { label: "Privacy", href: "/privacy" } });
    (db.query.footerLinks.findFirst as any).mockResolvedValue({ id: "fl1", label: "Privacy" });
    const { PUT } = await import("@/app/api/admin/footer-links/[id]/route");
    const req = new NextRequest("http://localhost", { method: "PUT" });
    const res = await PUT(req, mkParams("fl1"));
    expect(res.status).toBe(200);
  });

  it("DELETE returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { DELETE } = await import("@/app/api/admin/footer-links/[id]/route");
    const req = new NextRequest("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, mkParams("fl1"));
    expect(res.status).toBe(401);
  });

  it("DELETE removes footer link", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    const { DELETE } = await import("@/app/api/admin/footer-links/[id]/route");
    const req = new NextRequest("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, mkParams("fl1"));
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════
// Nav Items [id]
// ═══════════════════════════════════════
describe("API: /api/admin/nav-items/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("PUT returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { PUT } = await import("@/app/api/admin/nav-items/[id]/route");
    const req = new NextRequest("http://localhost", { method: "PUT" });
    const res = await PUT(req, mkParams("n1"));
    expect(res.status).toBe(401);
  });

  it("PUT updates nav item", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (validateBody as any).mockResolvedValue({ data: { label: "Store", href: "/store", isActive: true } });
    (db.query.navItems.findFirst as any).mockResolvedValue({ id: "n1", label: "Store" });
    const { PUT } = await import("@/app/api/admin/nav-items/[id]/route");
    const req = new NextRequest("http://localhost", { method: "PUT" });
    const res = await PUT(req, mkParams("n1"));
    expect(res.status).toBe(200);
  });

  it("DELETE returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { DELETE } = await import("@/app/api/admin/nav-items/[id]/route");
    const req = new NextRequest("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, mkParams("n1"));
    expect(res.status).toBe(401);
  });

  it("DELETE removes nav item", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    const { DELETE } = await import("@/app/api/admin/nav-items/[id]/route");
    const req = new NextRequest("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, mkParams("n1"));
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════
// Footer Links Settings (no isAdmin — public settings route)
// ═══════════════════════════════════════
describe("API: /api/admin/footer-links/settings", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns settings", async () => {
    (db.query.footerWidgetSettings.findFirst as any).mockResolvedValue({ id: "s1", isActive: true, title: "Links" });
    const { GET } = await import("@/app/api/admin/footer-links/settings/route");
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("GET creates default when none exist", async () => {
    (db.query.footerWidgetSettings.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "new", isActive: true, title: "เมนูลัด" });
    const { GET } = await import("@/app/api/admin/footer-links/settings/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(db.insert).toHaveBeenCalled();
  });

  it("PUT updates existing settings", async () => {
    (db.query.footerWidgetSettings.findFirst as any)
      .mockResolvedValueOnce({ id: "s1", isActive: true, title: "Links" })
      .mockResolvedValueOnce({ id: "s1", isActive: false, title: "Quick Links" });
    const { PUT } = await import("@/app/api/admin/footer-links/settings/route");
    const req = new NextRequest("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ isActive: false, title: "Quick Links" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
  });

  it("PUT creates when none exist", async () => {
    (db.query.footerWidgetSettings.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "new", isActive: true, title: "Quick Links" });
    const { PUT } = await import("@/app/api/admin/footer-links/settings/route");
    const req = new NextRequest("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ isActive: true, title: "Quick Links" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(db.insert).toHaveBeenCalled();
  });
});
