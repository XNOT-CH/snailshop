/**
 * Tests for new-code routes with 0% coverage (not excluded from SonarQube):
 * - /api/admin/footer-links/[id]  (PUT + DELETE)
 * - /api/admin/gacha-rewards/[id] (PUT + DELETE)
 * - /api/admin/settings           (GET + PUT)
 * - /api/footer-widget            (GET)
 * - /api/gacha/grid/rewards       (GET)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ isAdmin: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      footerLinks: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
      footerWidgetSettings: { findFirst: vi.fn() },
      gachaRewards: { findMany: vi.fn(), findFirst: vi.fn() },
      siteSettings: { findFirst: vi.fn() },
    },
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) }),
  },
  footerLinks: { id: "id", isActive: "isActive", sortOrder: "sortOrder" },
  gachaRewards: { id: "id", isActive: "isActive", gachaMachineId: "gachaMachineId" },
  siteSettings: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), isNull: vi.fn(), asc: vi.fn(),
}));
vi.mock("@/lib/utils/date", () => ({ mysqlNow: vi.fn(() => "2026-03-14 00:00:00") }));
vi.mock("@/lib/validations/validate", () => ({ validateBody: vi.fn() }));
vi.mock("@/lib/validations/content", () => ({
  footerLinkSchema: { partial: vi.fn().mockReturnValue({}) },
}));
vi.mock("@/lib/validations/gacha", () => ({
  gachaRewardSchema: { partial: vi.fn().mockReturnValue({}) },
  gachaSettingsSchema: {},
  gachaMachineSchema: { partial: vi.fn().mockReturnValue({}) },
}));
vi.mock("@/lib/validations/settings", () => ({
  siteSettingsSchema: { partial: vi.fn().mockReturnValue({}) },
}));
vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn(),
  getChanges: vi.fn(() => []),
  AUDIT_ACTIONS: { SETTINGS_UPDATE: "SETTINGS_UPDATE" },
}));

import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBody } from "@/lib/validations/validate";

const mkParams = (id: string) => ({ params: Promise.resolve({ id }) });
const ADMIN_OK = { success: true };
const UNAUTH = { success: false, error: "Unauthorized" };

// ════════════════════════════════════════════════════════════════
// /api/admin/footer-links/[id]
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/footer-links/[id] (PUT + DELETE)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("PUT returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { PUT } = await import("@/app/api/admin/footer-links/[id]/route");
    const req = new NextRequest("http://localhost", { method: "PUT", body: JSON.stringify({}) });
    const res = await PUT(req, mkParams("l1"));
    expect(res.status).toBe(401);
  });

  it("PUT updates footer link", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { label: "Discord", href: "https://discord.gg/x", openInNewTab: true } });
    (db.query.footerLinks.findFirst as any).mockResolvedValue({ id: "l1", label: "Discord", href: "https://discord.gg/x" });
    const { PUT } = await import("@/app/api/admin/footer-links/[id]/route");
    const req = new NextRequest("http://localhost", { method: "PUT", body: JSON.stringify({}) });
    const res = await PUT(req, mkParams("l1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.label).toBe("Discord");
  });

  it("PUT updates with partial fields", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { label: "Twitter" } }); // only label
    (db.query.footerLinks.findFirst as any).mockResolvedValue({ id: "l1", label: "Twitter", href: "/twitter" });
    const { PUT } = await import("@/app/api/admin/footer-links/[id]/route");
    const req = new NextRequest("http://localhost", { method: "PUT", body: JSON.stringify({ label: "Twitter" }) });
    const res = await PUT(req, mkParams("l1"));
    expect(res.status).toBe(200);
  });

  it("DELETE returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { DELETE } = await import("@/app/api/admin/footer-links/[id]/route");
    const req = new NextRequest("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, mkParams("l1"));
    expect(res.status).toBe(401);
  });

  it("DELETE removes footer link", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { DELETE } = await import("@/app/api/admin/footer-links/[id]/route");
    const req = new NextRequest("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, mkParams("l1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/gacha-rewards/[id]
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/gacha-rewards/[id] (PUT + DELETE)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("PUT returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { PUT } = await import("@/app/api/admin/gacha-rewards/[id]/route");
    const res = await PUT(new Request("http://localhost"), mkParams("r1"));
    expect(res.status).toBe(401);
  });

  it("PUT updates gacha reward fields", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({
      data: { tier: "GOLD", isActive: true, rewardName: "Gold Medal", rewardAmount: 500, rewardImageUrl: "/img.webp", probability: 0.05 },
    });
    (db.query.gachaRewards.findFirst as any).mockResolvedValue({
      id: "r1", tier: "GOLD", isActive: true, rewardName: "Gold Medal",
    });
    const { PUT } = await import("@/app/api/admin/gacha-rewards/[id]/route");
    const res = await PUT(new Request("http://localhost"), mkParams("r1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("PUT updates with partial fields only", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { isActive: false } }); // only isActive
    (db.query.gachaRewards.findFirst as any).mockResolvedValue({ id: "r1", tier: "SILVER", isActive: false });
    const { PUT } = await import("@/app/api/admin/gacha-rewards/[id]/route");
    const res = await PUT(new Request("http://localhost"), mkParams("r1"));
    expect(res.status).toBe(200);
  });

  it("DELETE returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { DELETE } = await import("@/app/api/admin/gacha-rewards/[id]/route");
    const res = await DELETE(new Request("http://localhost"), mkParams("r1"));
    expect(res.status).toBe(401);
  });

  it("DELETE removes reward", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { DELETE } = await import("@/app/api/admin/gacha-rewards/[id]/route");
    const res = await DELETE(new Request("http://localhost"), mkParams("r1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/settings
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/settings (GET + PUT)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { GET } = await import("@/app/api/admin/settings/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns existing settings", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.siteSettings.findFirst as any).mockResolvedValue({
      id: "s1", heroTitle: "GameStore", heroDescription: "Marketplace",
    });
    const { GET } = await import("@/app/api/admin/settings/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.heroTitle).toBe("GameStore");
  });

  it("GET creates default settings when none exist", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.siteSettings.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "new_s", heroTitle: "GameStore" });
    const { GET } = await import("@/app/api/admin/settings/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(db.insert).toHaveBeenCalled();
  });

  it("PUT returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { PUT } = await import("@/app/api/admin/settings/route");
    const res = await PUT(new Request("http://localhost", { method: "PUT" }));
    expect(res.status).toBe(401);
  });

  it("PUT updates existing settings", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { heroTitle: "Updated Title" } });
    (db.query.siteSettings.findFirst as any)
      .mockResolvedValueOnce({ id: "s1", heroTitle: "Old Title" })
      .mockResolvedValueOnce({ id: "s1", heroTitle: "Updated Title" });
    const { PUT } = await import("@/app/api/admin/settings/route");
    const res = await PUT(new Request("http://localhost", { method: "PUT", body: JSON.stringify({ heroTitle: "Updated Title" }) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain("สำเร็จ");
  });

  it("PUT inserts new settings when none exist", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { heroTitle: "Brand New" } });
    (db.query.siteSettings.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "new_s", heroTitle: "Brand New" });
    const { PUT } = await import("@/app/api/admin/settings/route");
    const res = await PUT(new Request("http://localhost", { method: "PUT", body: JSON.stringify({}) }));
    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/footer-widget
// ════════════════════════════════════════════════════════════════
describe("API: /api/footer-widget (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns inactive response when settings not found", async () => {
    (db.query.footerWidgetSettings.findFirst as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/footer-widget/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.settings.isActive).toBe(false);
    expect(body.links).toHaveLength(0);
  });

  it("returns inactive response when isActive is false", async () => {
    (db.query.footerWidgetSettings.findFirst as any).mockResolvedValue({ isActive: false, title: "Quick Links" });
    const { GET } = await import("@/app/api/footer-widget/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.settings.isActive).toBe(false);
  });

  it("returns active settings with links", async () => {
    (db.query.footerWidgetSettings.findFirst as any).mockResolvedValue({ isActive: true, title: "Quick Menu" });
    (db.query.footerLinks.findMany as any).mockResolvedValue([
      { id: "l1", label: "Shop", href: "/shop", openInNewTab: false },
      { id: "l2", label: "Discord", href: "https://discord.gg/x", openInNewTab: true },
    ]);
    const { GET } = await import("@/app/api/footer-widget/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.settings.isActive).toBe(true);
    expect(body.settings.title).toBe("Quick Menu");
    expect(body.links).toHaveLength(2);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/gacha/grid/rewards
// ════════════════════════════════════════════════════════════════
describe("API: /api/gacha/grid/rewards (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const mkReq = (machineId?: string) =>
    new Request(`http://localhost/api/gacha/grid/rewards${machineId ? `?machineId=${machineId}` : ""}`);

  it("returns empty rewards when none found", async () => {
    (db.query.gachaRewards.findMany as any).mockResolvedValue([]);
    const { GET } = await import("@/app/api/gacha/grid/rewards/route");
    const res = await GET(mkReq("m1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(0);
  });

  it("returns rewards with machineId param", async () => {
    (db.query.gachaRewards.findMany as any).mockResolvedValue([
      { id: "r1", tier: "GOLD", rewardType: "CUSTOM", rewardName: "Gold Badge", rewardAmount: "100", rewardImageUrl: "/gold.webp", product: null },
      { id: "r2", tier: "SILVER", rewardType: "CREDIT", rewardName: null, rewardAmount: "50", rewardImageUrl: null, product: null },
      { id: "r3", tier: "BRONZE", rewardType: "POINT", rewardName: null, rewardAmount: "10", rewardImageUrl: null, product: null },
    ]);
    const { GET } = await import("@/app/api/gacha/grid/rewards/route");
    const res = await GET(mkReq("m1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(3);
    // CUSTOM type uses rewardName
    expect(body.data[0].rewardName).toBe("Gold Badge");
    // CREDIT type uses "เครดิต"
    expect(body.data[1].rewardName).toBe("เครดิต");
    // POINT type uses "พอยต์"
    expect(body.data[2].rewardName).toBe("พอยต์");
  });

  it("returns PRODUCT reward with product name", async () => {
    (db.query.gachaRewards.findMany as any).mockResolvedValue([
      { id: "r1", tier: "GOLD", rewardType: "PRODUCT", rewardName: null, rewardAmount: null, rewardImageUrl: null,
        product: { id: "p1", name: "ROV Account", price: "500", imageUrl: "/rov.webp" } },
    ]);
    const { GET } = await import("@/app/api/gacha/grid/rewards/route");
    const res = await GET(mkReq("m1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0].rewardName).toBe("ROV Account");
    expect(body.data[0].imageUrl).toBe("/rov.webp");
  });

  it("returns rewards without machineId (null machine)", async () => {
    (db.query.gachaRewards.findMany as any).mockResolvedValue([]);
    const { GET } = await import("@/app/api/gacha/grid/rewards/route");
    const res = await GET(mkReq()); // no machineId
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns reward with null product gracefully", async () => {
    (db.query.gachaRewards.findMany as any).mockResolvedValue([
      { id: "r1", tier: "GOLD", rewardType: "PRODUCT", rewardName: null, rewardAmount: "100", rewardImageUrl: "/fallback.webp",
        product: null }, // product is null
    ]);
    const { GET } = await import("@/app/api/gacha/grid/rewards/route");
    const res = await GET(mkReq("m1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0].rewardName).toBe("รางวัล"); // fallback name
  });
});
