/**
 * Batch coverage tests for remaining low/zero-coverage routes:
 * - /api/gacha/machines           (GET)
 * - /api/gacha/drop-rates         (GET)
 * - /api/admin/gacha-products     (GET)
 * - /api/admin/nav-items          (GET + POST)
 * - /api/admin/products/[id]/featured (PATCH)
 * - /api/admin/gacha-machines/[id]/duplicate (POST)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────
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
vi.mock("@/lib/utils/date", () => ({
  mysqlNow: vi.fn(() => "2026-03-14 00:00:00"),
  toMySQLDatetime: vi.fn(() => "2026-03-14 00:00:00"),
}));
vi.mock("@/lib/validations/validate", () => ({ validateBody: vi.fn() }));
vi.mock("@/lib/validations/content", () => ({
  navItemSchema: {},
  footerLinkSchema: { partial: vi.fn().mockReturnValue({}) },
}));
vi.mock("@/lib/encryption", () => ({ decrypt: vi.fn().mockReturnValue("decrypted") }));
vi.mock("@/lib/stock", () => ({ getStockCount: vi.fn().mockReturnValue(3) }));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      gachaMachines: { findMany: vi.fn(), findFirst: vi.fn() },
      gachaRewards:  { findMany: vi.fn() },
      products:      { findMany: vi.fn(), findFirst: vi.fn() },
      navItems:      { findMany: vi.fn(), findFirst: vi.fn() },
    },
    select: vi.fn(),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }),
  },
  gachaMachines: { isActive: "isActive", isEnabled: "isEnabled", id: "id" },
  gachaRewards:  { isActive: "isActive", gachaMachineId: "gachaMachineId", id: "id" },
  products:      { isSold: "isSold", id: "id", isFeatured: "isFeatured" },
  navItems:      { sortOrder: "sortOrder", id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), isNull: vi.fn(), max: vi.fn(), count: vi.fn(),
}));

import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBody } from "@/lib/validations/validate";

const ADMIN_OK = { success: true };
const UNAUTH   = { success: false, error: "Unauthorized" };
const mkParams = (id: string) => ({ params: Promise.resolve({ id }) });

// ════════════════════════════════════════════════════════════════
// /api/gacha/machines
// ════════════════════════════════════════════════════════════════
describe("API: /api/gacha/machines (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns active machines", async () => {
    (db.query.gachaMachines.findMany as any).mockResolvedValue([
      { id: "m1", name: "Gacha 1", imageUrl: "/g1.webp", gameType: "GRID",
        costType: "CREDIT", costAmount: "100", categoryId: "c1",
        category: { id: "c1", name: "Action" } },
    ]);
    const { GET } = await import("@/app/api/gacha/machines/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Gacha 1");
  });

  it("returns empty list when no machines", async () => {
    (db.query.gachaMachines.findMany as any).mockResolvedValue([]);
    const { GET } = await import("@/app/api/gacha/machines/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/gacha/drop-rates
// ════════════════════════════════════════════════════════════════
describe("API: /api/gacha/drop-rates (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const mkReq = (machineId?: string) =>
    new Request(`http://localhost/api/gacha/drop-rates${machineId ? `?machineId=${machineId}` : ""}`);

  it("returns empty array when no rewards", async () => {
    (db.query.gachaRewards.findMany as any).mockResolvedValue([]);
    const { GET } = await import("@/app/api/gacha/drop-rates/route");
    const res = await GET(mkReq("m1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(0);
  });

  it("returns drop rates with machineId filter", async () => {
    (db.query.gachaRewards.findMany as any).mockResolvedValue([
      { tier: "legendary", probability: "0.05", rewardType: "CREDIT", rewardName: "Legendary Credit", rewardAmount: "1" },
      { tier: "epic",      probability: "0.15", rewardType: "CREDIT", rewardName: "Epic Credit", rewardAmount: "1" },
      { tier: "rare",      probability: "0.30", rewardType: "CREDIT", rewardName: "Rare Credit", rewardAmount: "1" },
      { tier: "common",    probability: "0.50", rewardType: "CREDIT", rewardName: "Common Credit", rewardAmount: "1" },
    ]);
    const { GET } = await import("@/app/api/gacha/drop-rates/route");
    const res = await GET(mkReq("m1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    const legendary = body.data.find((d: any) => d.tier === "legendary");
    expect(legendary?.label).toBe("Legendary");
    expect(legendary?.rate).toBe(5); // 0.05 / 1.0 * 100 = 5%
  });

  it("returns drop rates without machineId (uses isNull)", async () => {
    (db.query.gachaRewards.findMany as any).mockResolvedValue([
      { tier: "common", probability: "1", rewardType: "CREDIT", rewardName: "Credit", rewardAmount: "1" },
    ]);
    const { GET } = await import("@/app/api/gacha/drop-rates/route");
    const res = await GET(mkReq()); // no machineId
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("handles null tier (defaults to common)", async () => {
    (db.query.gachaRewards.findMany as any).mockResolvedValue([
      { tier: null, probability: null, rewardType: "CREDIT", rewardName: "Credit", rewardAmount: "1" }, // both null
    ]);
    const { GET } = await import("@/app/api/gacha/drop-rates/route");
    const res = await GET(mkReq("m1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    const common = body.data.find((d: any) => d.tier === "common");
    expect(common?.rate).toBe(100); // all weight in common
  });

  it("returns 500 on DB error", async () => {
    (db.query.gachaRewards.findMany as any).mockRejectedValue(new Error("DB fail"));
    const { GET } = await import("@/app/api/gacha/drop-rates/route");
    const res = await GET(mkReq("m1"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/gacha-products
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/gacha-products (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { GET } = await import("@/app/api/admin/gacha-products/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns product list with stock counts", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.products.findMany as any).mockResolvedValue([
      { id: "p1", name: "ROV Account", price: "500", imageUrl: "/rov.webp",
        category: "GAME", secretData: "enc_data", stockSeparator: "newline" },
    ]);
    const { GET } = await import("@/app/api/admin/gacha-products/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].stockCount).toBe(3); // mocked getStockCount
    expect(body.data[0].price).toBe(500);    // converted to number
  });

  it("handles getStockCount error gracefully (returns stockCount=0)", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.products.findMany as any).mockResolvedValue([
      { id: "p1", name: "Item", price: "100", imageUrl: null,
        category: "OTHER", secretData: null, stockSeparator: null },
    ]);
    const { getStockCount } = await import("@/lib/stock");
    (getStockCount as any).mockImplementationOnce(() => { throw new Error("parse fail"); });
    const { GET } = await import("@/app/api/admin/gacha-products/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0].stockCount).toBe(0); // fallback on error
  });

  it("returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.products.findMany as any).mockRejectedValue(new Error("DB fail"));
    const { GET } = await import("@/app/api/admin/gacha-products/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/nav-items
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/nav-items (GET + POST)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET seeds defaults when nav is empty", async () => {
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue([{ count: 0 }]),
    });
    (db.query.navItems.findMany as any).mockResolvedValue([
      { id: "n1", label: "หน้าแรก", href: "/", icon: "home", sortOrder: 0 },
    ]);
    const { GET } = await import("@/app/api/admin/nav-items/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(db.insert).toHaveBeenCalled(); // defaults were seeded
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it("GET returns items when nav already has content", async () => {
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue([{ count: 4 }]),
    });
    (db.query.navItems.findMany as any).mockResolvedValue([
      { id: "n1", label: "Shop", href: "/shop", icon: "shop", sortOrder: 0 },
    ]);
    const { GET } = await import("@/app/api/admin/nav-items/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it("GET returns 500 on DB error", async () => {
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockRejectedValue(new Error("DB fail")),
    });
    const { GET } = await import("@/app/api/admin/nav-items/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("POST returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { POST } = await import("@/app/api/admin/nav-items/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("POST creates nav item with explicit sortOrder", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { label: "Gacha", href: "/gacha", icon: "star", sortOrder: 5 } });
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue([{ maxSort: 3 }]),
    });
    (db.query.navItems.findFirst as any).mockResolvedValue({ id: "n_new", label: "Gacha", href: "/gacha", sortOrder: 5 });
    const { POST } = await import("@/app/api/admin/nav-items/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST" }));
    expect(res.status).toBe(201);
  });

  it("POST creates nav item using auto sortOrder when not provided", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { label: "Help", href: "/help", icon: null } }); // no sortOrder
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue([{ maxSort: null }]), // no items yet
    });
    (db.query.navItems.findFirst as any).mockResolvedValue({ id: "n_new", label: "Help", href: "/help", sortOrder: 0 });
    const { POST } = await import("@/app/api/admin/nav-items/route");
    const res = await POST(new NextRequest("http://localhost", { method: "POST" }));
    expect(res.status).toBe(201);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/products/[id]/featured
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/products/[id]/featured (PATCH)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { PATCH } = await import("@/app/api/admin/products/[id]/featured/route");
    const res = await PATCH(new NextRequest("http://localhost", { method: "PATCH", body: "{}" }), mkParams("p1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { PATCH } = await import("@/app/api/admin/products/[id]/featured/route");
    const req = new NextRequest("http://localhost", { method: "PATCH", body: "not-json" });
    const res = await PATCH(req, mkParams("p1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid schema (isFeatured not boolean)", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { PATCH } = await import("@/app/api/admin/products/[id]/featured/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ isFeatured: "yes" }), // not boolean
    });
    const res = await PATCH(req, mkParams("p1"));
    expect(res.status).toBe(400);
  });

  it("sets product as featured", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.products.findFirst as any).mockResolvedValue({ id: "p1", name: "ROV", isFeatured: true });
    const { PATCH } = await import("@/app/api/admin/products/[id]/featured/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ isFeatured: true }),
    });
    const res = await PATCH(req, mkParams("p1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isFeatured).toBe(true);
  });

  it("unsets product as featured", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.products.findFirst as any).mockResolvedValue({ id: "p1", name: "ROV", isFeatured: false });
    const { PATCH } = await import("@/app/api/admin/products/[id]/featured/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ isFeatured: false }),
    });
    const res = await PATCH(req, mkParams("p1"));
    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/gacha-machines/[id]/duplicate
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/gacha-machines/[id]/duplicate (POST)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { POST } = await import("@/app/api/admin/gacha-machines/[id]/duplicate/route");
    const res = await POST(new Request("http://localhost"), mkParams("m1"));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ success: false });
  });

  it("returns 404 when machine not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.gachaMachines.findFirst as any).mockResolvedValue(null);
    const { POST } = await import("@/app/api/admin/gacha-machines/[id]/duplicate/route");
    const res = await POST(new Request("http://localhost"), mkParams("m_none"));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      success: false,
      message: "ไม่พบข้อมูลเดิม",
    });
  });

  it("duplicates machine with rewards", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.gachaMachines.findFirst as any).mockResolvedValue({
      id: "m1", name: "Gacha 1", description: null, imageUrl: "/g1.webp",
      gameType: "GRID", categoryId: "c1", costType: "CREDIT", costAmount: "100",
      dailySpinLimit: 5, tierMode: "WEIGHT", isActive: true, isEnabled: true, sortOrder: 0,
      rewards: [
        { id: "r1", rewardType: "CREDIT", tier: "GOLD", isActive: true,
          probability: "0.1", rewardName: "100 Coins", rewardAmount: "100",
          rewardImageUrl: null, productId: null },
      ],
    });
    const { POST } = await import("@/app/api/admin/gacha-machines/[id]/duplicate/route");
    const res = await POST(new Request("http://localhost"), mkParams("m1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      success: true,
      data: { id: expect.any(String) },
    });
    expect(db.insert).toHaveBeenCalledTimes(2); // machine + rewards
  });

  it("duplicates machine with no rewards (skips reward insert)", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.gachaMachines.findFirst as any).mockResolvedValue({
      id: "m1", name: "Empty Gacha", description: null, imageUrl: null,
      gameType: "GRID", categoryId: null, costType: "CREDIT", costAmount: "50",
      dailySpinLimit: null, tierMode: "WEIGHT", isActive: false, isEnabled: true, sortOrder: null,
      rewards: [], // no rewards
    });
    const { POST } = await import("@/app/api/admin/gacha-machines/[id]/duplicate/route");
    const res = await POST(new Request("http://localhost"), mkParams("m1"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: { id: expect.any(String) },
    });
    expect(db.insert).toHaveBeenCalledTimes(1); // only machine, no rewards
  });
});
