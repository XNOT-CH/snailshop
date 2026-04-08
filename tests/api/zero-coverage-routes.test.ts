/**
 * Tests targeting 0%-coverage new-code files:
 * - lib/getSiteSettings.ts
 * - /api/admin/gacha-rewards      (GET + POST)
 * - /api/admin/promo-codes/[id]   (GET + PUT + DELETE)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("@/lib/auth", () => ({ isAdmin: vi.fn() }));
vi.mock("@/lib/utils/date", () => ({ mysqlNow: vi.fn(() => "2026-03-14 00:00:00") }));
vi.mock("@/lib/validations/validate", () => ({ validateBody: vi.fn() }));
vi.mock("@/lib/validations/gacha", () => ({ gachaRewardSchema: {} }));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      siteSettings:  { findFirst: vi.fn() },
      gachaRewards:  { findMany: vi.fn(), findFirst: vi.fn() },
      promoCodes:    { findFirst: vi.fn() },
    },
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }),
  },
  gachaRewards: { gachaMachineId: "gachaMachineId", id: "id" },
  promoCodes:   { id: "id", code: "code" },
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBody } from "@/lib/validations/validate";

const ADMIN_OK = { success: true };
const UNAUTH   = { success: false, error: "Unauthorized" };
const mkParams = (id: string) => ({ params: Promise.resolve({ id }) });

// ════════════════════════════════════════════════════════════════
// lib/getSiteSettings
// ════════════════════════════════════════════════════════════════
describe("lib/getSiteSettings", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns settings when found", async () => {
    (db.query.siteSettings.findFirst as any).mockResolvedValue({
      id: "s1", heroTitle: "GameStore", heroDescription: "Marketplace",
    });
    const { getSiteSettings } = await import("@/lib/getSiteSettings");
    const result = await getSiteSettings();
    expect(result).not.toBeNull();
    expect(result?.heroTitle).toBe("GameStore");
  });

  it("returns null when no settings found", async () => {
    (db.query.siteSettings.findFirst as any).mockResolvedValue(undefined);
    const { getSiteSettings } = await import("@/lib/getSiteSettings");
    const result = await getSiteSettings();
    expect(result).toBeNull();
  });

  it("returns null on DB error", async () => {
    (db.query.siteSettings.findFirst as any).mockRejectedValue(new Error("DB fail"));
    const { getSiteSettings } = await import("@/lib/getSiteSettings");
    const result = await getSiteSettings();
    expect(result).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/gacha-rewards  (GET + POST)
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/gacha-rewards (GET + POST)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const mkReq = (method: string, body?: object, params = "") =>
    new Request(`http://localhost/api/admin/gacha-rewards${params}`, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    });

  // ── GET ──────────────────────────────────────────────────────
  it("GET returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { GET } = await import("@/app/api/admin/gacha-rewards/route");
    const res = await GET(mkReq("GET"));
    expect(res.status).toBe(401);
  });

  it("GET returns all rewards without filter", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.gachaRewards.findMany as any).mockResolvedValue([
      { id: "r1", tier: "GOLD", isActive: true, rewardType: "CREDIT",
        rewardName: "50 Credit", rewardAmount: "50", rewardImageUrl: null,
        probability: "0.1", productId: null, product: null,
        createdAt: "2026-03-14", updatedAt: "2026-03-14" },
    ]);
    const { GET } = await import("@/app/api/admin/gacha-rewards/route");
    const res = await GET(mkReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].rewardAmount).toBe(50); // converted to number
  });

  it("GET returns rewards filtered by machineId", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.gachaRewards.findMany as any).mockResolvedValue([]);
    const { GET } = await import("@/app/api/admin/gacha-rewards/route");
    const res = await GET(mkReq("GET", undefined, "?machineId=m1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });

  it("GET maps reward with product correctly", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.gachaRewards.findMany as any).mockResolvedValue([
      { id: "r1", tier: "SILVER", isActive: true, rewardType: "PRODUCT",
        rewardName: null, rewardAmount: null, rewardImageUrl: null,
        probability: null, productId: "p1",
        product: { id: "p1", name: "ROV Account", price: "500", imageUrl: "/rov.webp", category: "GAME", isSold: false },
        createdAt: "2026-03-14", updatedAt: "2026-03-14" },
    ]);
    const { GET } = await import("@/app/api/admin/gacha-rewards/route");
    const res = await GET(mkReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0].product.price).toBe(500); // converted to number
    expect(body.data[0].probability).toBe(1); // null → default 1
    expect(body.data[0].rewardAmount).toBeNull();
  });

  // ── POST ─────────────────────────────────────────────────────
  it("POST returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { POST } = await import("@/app/api/admin/gacha-rewards/route");
    const res = await POST(mkReq("POST", {}));
    expect(res.status).toBe(401);
  });

  it("POST creates PRODUCT reward", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({
      data: { rewardType: "PRODUCT", productId: "p1", tier: "GOLD", isActive: true,
               gachaMachineId: "m1", probability: 0.05 },
    });
    (db.query.gachaRewards.findFirst as any).mockResolvedValue({ id: "r_new", rewardType: "PRODUCT" });
    const { POST } = await import("@/app/api/admin/gacha-rewards/route");
    const res = await POST(mkReq("POST", {}));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("POST returns 400 for PRODUCT type with no productId", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({
      data: { rewardType: "PRODUCT", productId: null, tier: "SILVER", isActive: true, probability: 0.1 },
    });
    const { POST } = await import("@/app/api/admin/gacha-rewards/route");
    const res = await POST(mkReq("POST", {}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("กรุณาเลือกสินค้า");
  });

  it("POST creates CREDIT/POINT reward", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({
      data: { rewardType: "CREDIT", rewardAmount: 100, rewardName: "100 Coins",
               tier: "BRONZE", isActive: true, probability: 0.3, rewardImageUrl: "/coin.webp" },
    });
    (db.query.gachaRewards.findFirst as any).mockResolvedValue({ id: "r_new", rewardType: "CREDIT" });
    const { POST } = await import("@/app/api/admin/gacha-rewards/route");
    const res = await POST(mkReq("POST", {}));
    expect(res.status).toBe(200);
  });

  it("POST returns 400 for non-PRODUCT type with no rewardAmount", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({
      data: { rewardType: "CREDIT", rewardAmount: 0, rewardName: "Credits", tier: "BRONZE", isActive: true, probability: 0.2 },
    });
    const { POST } = await import("@/app/api/admin/gacha-rewards/route");
    const res = await POST(mkReq("POST", {}));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("จำนวนรางวัล");
  });

  it("POST returns 400 for non-PRODUCT type with no rewardName", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({
      data: { rewardType: "POINT", rewardAmount: 200, rewardName: "", tier: "BRONZE", isActive: true, probability: 0.1 },
    });
    const { POST } = await import("@/app/api/admin/gacha-rewards/route");
    const res = await POST(mkReq("POST", {}));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("ชื่อรางวัล");
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/promo-codes/[id]  (GET + PUT + DELETE)
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/promo-codes/[id] (GET + PUT + DELETE)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (validateBody as any).mockImplementation(async (req: Request, schema: { safeParse: (raw: unknown) => { success: boolean; data?: unknown; error?: { issues?: Array<{ message: string; path: Array<string | number> }> } } }) => {
      const raw = await req.json();
      const result = schema.safeParse(raw);
      if (!result.success) {
        const firstMessage = result.error?.issues?.[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
        return {
          error: NextResponse.json({ success: false, message: firstMessage }, { status: 400 }),
        };
      }
      return { data: result.data };
    });
  });

  const existingPromo = {
    id: "pc1", code: "SAVE10", discountType: "PERCENTAGE",
    discountValue: "10", minPurchase: "100", maxDiscount: "50",
    usageLimit: "20", isActive: true,
    startsAt: "2026-01-01 00:00:00", expiresAt: null,
  };

  // ── GET ──────────────────────────────────────────────────────
  it("GET returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { GET } = await import("@/app/api/admin/promo-codes/[id]/route");
    const res = await GET(new NextRequest("http://localhost"), mkParams("pc1"));
    expect(res.status).toBe(401);
  });

  it("GET returns promo code", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.promoCodes.findFirst as any).mockResolvedValue(existingPromo);
    const { GET } = await import("@/app/api/admin/promo-codes/[id]/route");
    const res = await GET(new NextRequest("http://localhost"), mkParams("pc1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.discountValue).toBe(10); // converted to number
    expect(body.data.minPurchase).toBe(100);  // converted to number
  });

  it("GET returns 404 when not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.promoCodes.findFirst as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/admin/promo-codes/[id]/route");
    const res = await GET(new NextRequest("http://localhost"), mkParams("pc_none"));
    expect(res.status).toBe(404);
  });

  // ── PUT ──────────────────────────────────────────────────────
  it("PUT returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { PUT } = await import("@/app/api/admin/promo-codes/[id]/route");
    const res = await PUT(new NextRequest("http://localhost", { method: "PUT", body: JSON.stringify({}) }), mkParams("pc1"));
    expect(res.status).toBe(401);
  });

  it("PUT returns 404 when code not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.promoCodes.findFirst as any).mockResolvedValue(null);
    const { PUT } = await import("@/app/api/admin/promo-codes/[id]/route");
    const req = new NextRequest("http://localhost", { method: "PUT", body: JSON.stringify({ code: "NEW10" }) });
    const res = await PUT(req, mkParams("pc_none"));
    expect(res.status).toBe(404);
  });

  it("PUT returns 400 when new code already exists", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.promoCodes.findFirst as any)
      .mockResolvedValueOnce(existingPromo)   // find current
      .mockResolvedValueOnce({ id: "pc2", code: "CONFLICT" }); // conflict check
    const { PUT } = await import("@/app/api/admin/promo-codes/[id]/route");
    const req = new NextRequest("http://localhost", { method: "PUT", body: JSON.stringify({ code: "CONFLICT" }) });
    const res = await PUT(req, mkParams("pc1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("already exists");
  });

  it("PUT updates promo code with all fields", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.promoCodes.findFirst as any)
      .mockResolvedValueOnce(existingPromo)  // existing
      .mockResolvedValueOnce(null)            // no conflict
      .mockResolvedValueOnce({ ...existingPromo, code: "SAVE20" }); // updated
    const { PUT } = await import("@/app/api/admin/promo-codes/[id]/route");
    const req = new NextRequest("http://localhost", {
      method: "PUT",
      body: JSON.stringify({
        code: "SAVE20", discountType: "PERCENTAGE", discountValue: "20",
        minPurchase: "200", maxDiscount: "100", usageLimit: "10",
        startsAt: "2026-01-01T00:00:00.000Z", expiresAt: "2026-12-31T00:00:00.000Z", isActive: true,
      }),
    });
    const res = await PUT(req, mkParams("pc1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain("updated");
  });

  it("PUT updates code when new code matches existing code (no conflict needed)", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    // Same code as existing → no conflict check needed
    (db.query.promoCodes.findFirst as any)
      .mockResolvedValueOnce(existingPromo)  // existing
      .mockResolvedValueOnce({ ...existingPromo }); // updated
    const { PUT } = await import("@/app/api/admin/promo-codes/[id]/route");
    const req = new NextRequest("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ code: "SAVE10", discountValue: "15", expiresAt: null }),
    });
    const res = await PUT(req, mkParams("pc1"));
    expect(res.status).toBe(200);
  });

  it("PUT returns 400 when percentage discount exceeds 100", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { PUT } = await import("@/app/api/admin/promo-codes/[id]/route");
    const req = new NextRequest("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ discountType: "PERCENTAGE", discountValue: 150 }),
    });
    const res = await PUT(req, mkParams("pc1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("เปอร์เซ็นต์ต้องไม่เกิน 100%");
  });

  // ── DELETE ───────────────────────────────────────────────────
  it("DELETE returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { DELETE } = await import("@/app/api/admin/promo-codes/[id]/route");
    const res = await DELETE(new NextRequest("http://localhost"), mkParams("pc1"));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 404 when not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.promoCodes.findFirst as any).mockResolvedValueOnce(null);
    const { DELETE } = await import("@/app/api/admin/promo-codes/[id]/route");
    const res = await DELETE(new NextRequest("http://localhost"), mkParams("pc_none"));
    expect(res.status).toBe(404);
  });

  it("DELETE removes promo code", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.promoCodes.findFirst as any).mockResolvedValue(existingPromo);
    const { DELETE } = await import("@/app/api/admin/promo-codes/[id]/route");
    const res = await DELETE(new NextRequest("http://localhost"), mkParams("pc1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain("deleted");
  });
});
