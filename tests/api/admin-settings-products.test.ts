/**
 * Tests for remaining uncovered new-code files:
 * admin/settings, products/[id], gacha/grid/rewards, gacha-machines/[id]/duplicate
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ isAdmin: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn() }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
    query: {
      siteSettings: { findFirst: vi.fn() },
      products: { findFirst: vi.fn() },
      gachaRewards: { findMany: vi.fn().mockResolvedValue([]) },
      gachaMachines: { findFirst: vi.fn() },
    },
  },
  siteSettings: { id: "id" },
  products: { id: "id" },
  gachaRewards: { gachaMachineId: "gachaMachineId", isActive: "isActive" },
  gachaMachines: { id: "id" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), isNull: vi.fn(), asc: vi.fn() }));
vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn(),
  getChanges: vi.fn(() => []),
  AUDIT_ACTIONS: {
    PRODUCT_UPDATE: "PRODUCT_UPDATE",
    PRODUCT_DELETE: "PRODUCT_DELETE",
    SETTINGS_UPDATE: "SETTINGS_UPDATE",
  },
}));
vi.mock("@/lib/cache", () => ({ invalidateProductCaches: vi.fn() }));
vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((v: string) => `enc:${v}`),
  decrypt: vi.fn((v: string) => v?.replace?.("enc:", "") ?? ""),
}));
vi.mock("@/lib/validations/validate", () => ({ validateBody: vi.fn() }));
vi.mock("@/lib/validations/settings", () => ({ siteSettingsSchema: { partial: vi.fn().mockReturnValue({}) } }));
vi.mock("@/lib/validations/product", () => ({ productSchema: { partial: vi.fn().mockReturnValue({}) } }));
vi.mock("@/lib/utils/date", () => ({ mysqlNow: vi.fn(() => "2026-01-01 00:00:00") }));

import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBody } from "@/lib/validations/validate";

const mkParams = (id: string) => ({ params: Promise.resolve({ id }) });

// ═══════════════════════════════════════
// Admin Settings
// ═══════════════════════════════════════
describe("API: /api/admin/settings", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { GET } = await import("@/app/api/admin/settings/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns existing settings", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.siteSettings.findFirst as any).mockResolvedValue({ id: "s1", heroTitle: "GameStore" });
    const { GET } = await import("@/app/api/admin/settings/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("GET creates defaults when none exist", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.siteSettings.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "new", heroTitle: "GameStore" });
    const { GET } = await import("@/app/api/admin/settings/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(db.insert).toHaveBeenCalled();
  });

  it("PUT returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { PUT } = await import("@/app/api/admin/settings/route");
    const res = await PUT(new Request("http://localhost"));
    expect(res.status).toBe(401);
  });

  it("PUT updates settings", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (validateBody as any).mockResolvedValue({ data: { heroTitle: "New Title", heroDescription: "New Desc" } });
    (db.query.siteSettings.findFirst as any).mockResolvedValue({ id: "s1", heroTitle: "Updated" });
    const { PUT } = await import("@/app/api/admin/settings/route");
    const res = await PUT(new Request("http://localhost"));
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════
// Products [id] (Admin)
// ═══════════════════════════════════════
describe("API: /api/products/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { GET } = await import("@/app/api/products/[id]/route");
    const res = await GET(new NextRequest("http://localhost"), mkParams("p1"));
    expect(res.status).toBe(401);
  });

  it("GET returns 404 when not found", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.products.findFirst as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/products/[id]/route");
    const res = await GET(new NextRequest("http://localhost"), mkParams("p1"));
    expect(res.status).toBe(404);
  });

  it("GET returns decrypted product data", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.products.findFirst as any).mockResolvedValue({ id: "p1", name: "Test Product", secretData: "enc:codes" });
    const { GET } = await import("@/app/api/products/[id]/route");
    const res = await GET(new NextRequest("http://localhost"), mkParams("p1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("PUT returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { PUT } = await import("@/app/api/products/[id]/route");
    const res = await PUT(new NextRequest("http://localhost"), mkParams("p1"));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { DELETE } = await import("@/app/api/products/[id]/route");
    const res = await DELETE(new NextRequest("http://localhost"), mkParams("p1"));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 404 when not found", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.products.findFirst as any).mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/products/[id]/route");
    const res = await DELETE(new NextRequest("http://localhost"), mkParams("p1"));
    expect(res.status).toBe(404);
  });

  it("DELETE removes product", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.products.findFirst as any).mockResolvedValue({ id: "p1", name: "Test" });
    const { DELETE } = await import("@/app/api/products/[id]/route");
    const res = await DELETE(new NextRequest("http://localhost"), mkParams("p1"));
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════
// Gacha Grid Rewards (public)
// ═══════════════════════════════════════
describe("API: /api/gacha/grid/rewards (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns rewards for a machine", async () => {
    (db.query.gachaRewards.findMany as any).mockResolvedValue([
      {
        id: "r1", tier: "GOLD", rewardType: "CREDIT", rewardName: "เครดิต",
        rewardAmount: "500", rewardImageUrl: null, isActive: true,
        product: null, gachaMachineId: "m1", createdAt: "2026-03-13",
      }
    ]);
    const { GET } = await import("@/app/api/gacha/grid/rewards/route");
    const req = new Request("http://localhost/api/gacha/grid/rewards?machineId=m1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].rewardName).toBe("เครดิต");
  });

  it("returns rewards without machineId filter", async () => {
    (db.query.gachaRewards.findMany as any).mockResolvedValue([
      { id: "r2", tier: "SILVER", rewardType: "PRODUCT", rewardName: null, rewardAmount: null, rewardImageUrl: null, isActive: true, product: { name: "Game ID", imageUrl: "img.jpg" }, gachaMachineId: null, createdAt: "2026-03-13" }
    ]);
    const { GET } = await import("@/app/api/gacha/grid/rewards/route");
    const req = new Request("http://localhost/api/gacha/grid/rewards");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0].rewardName).toBe("Game ID");
  });
});

// ═══════════════════════════════════════
// Admin Gacha Machines [id] Duplicate
// ═══════════════════════════════════════
describe("API: /api/admin/gacha-machines/[id]/duplicate (POST)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { POST } = await import("@/app/api/admin/gacha-machines/[id]/duplicate/route");
    const res = await POST(new Request("http://localhost"), mkParams("m1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when machine not found", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.gachaMachines.findFirst as any).mockResolvedValue(null);
    const { POST } = await import("@/app/api/admin/gacha-machines/[id]/duplicate/route");
    const res = await POST(new Request("http://localhost"), mkParams("m1"));
    expect(res.status).toBe(404);
  });

  it("duplicates machine successfully", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.gachaMachines.findFirst as any)
      .mockResolvedValueOnce({ id: "m1", name: "Lucky Box", gameType: "STANDARD", costType: "CREDIT", costAmount: "100", dailySpinLimit: 5, tierMode: "PRICE", sortOrder: 0, imageUrl: null, description: null, categoryId: null, rewards: [] })
      .mockResolvedValueOnce({ id: "new-id", name: "Lucky Box (Copy)" });
    const { POST } = await import("@/app/api/admin/gacha-machines/[id]/duplicate/route");
    const res = await POST(new Request("http://localhost"), mkParams("m1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
