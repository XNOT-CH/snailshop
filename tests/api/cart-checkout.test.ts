import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    query: { users: { findFirst: vi.fn() } },
    transaction: vi.fn(),
    insert: vi.fn().mockReturnValue({ values: vi.fn() }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
  },
  users: { id: "id", creditBalance: "creditBalance", pointBalance: "pointBalance" },
  products: { id: "id", isSold: "isSold" },
  orders: { id: "id" },
  promoCodes: { id: "id", usedCount: "usedCount" },
  promoUsages: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), inArray: vi.fn(), sql: Object.assign(vi.fn(), { join: vi.fn(() => ({})) }) }));
vi.mock("@/lib/mail", () => ({ sendEmail: vi.fn().mockResolvedValue({}) }));
vi.mock("@/components/emails/PurchaseReceiptEmail", () => ({ PurchaseReceiptEmail: vi.fn(() => null) }));
vi.mock("@/lib/promo", () => ({ validatePromoCode: vi.fn() }));
vi.mock("@/lib/rateLimit", () => ({
  checkPurchaseRateLimit: vi.fn(() => ({ blocked: false, remainingAttempts: 12 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { validatePromoCode } from "@/lib/promo";

const mkReq = (body: object) =>
  new NextRequest("http://localhost/api/cart/checkout", { method: "POST", body: JSON.stringify(body) });

const MOCK_USER = { id: "u1", creditBalance: "2000", pointBalance: "500" };

const mkProducts = (overrides: Partial<{
  id: string; name: string; price: string; discountPrice: string | null;
  currency: string | null; isSold: boolean;
}>[] = [{}]) =>
  overrides.map((o, i) => ({
    id: `p${i + 1}`, name: `Product ${i + 1}`, price: "100",
    discountPrice: null, currency: "THB", isSold: false, ...o,
  }));

const mockTransaction = (products: any[], extraError?: Error) => {
  (db.transaction as any).mockImplementation(async (callback: any) => {
    const tx = {
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(products) }) }),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) }),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }) }),
    };
    if (extraError) throw extraError;
    return callback(tx);
  });
};

describe("API: /api/cart/checkout (POST)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ── validation ──────────────────────────────────────────────────────────
  it("returns 400 when productIds is missing", async () => {
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({}));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("เลือกสินค้า");
  });

  it("returns 400 when productIds is empty array", async () => {
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when productIds is not an array", async () => {
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: "p1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when more than 50 products", async () => {
    const { POST } = await import("@/app/api/cart/checkout/route");
    const ids = Array.from({ length: 51 }, (_, i) => `p${i}`);
    const res = await POST(mkReq({ productIds: ids }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("50");
  });

  it("returns 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"] }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when user not found", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue(null);
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"] }));
    expect(res.status).toBe(404);
  });

  // ── transaction errors ──────────────────────────────────────────────────
  it("returns 400 when some products not found", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    mockTransaction(mkProducts([{}])); // only 1 product for 2 ids
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1", "p2"] }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("บางสินค้าไม่พบ");
  });

  it("returns 400 when product is already sold", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    mockTransaction(mkProducts([{ isSold: true }]));
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("ถูกขายไปแล้ว");
    expect(body.soldProductIds).toBeDefined();
  });

  it("returns 400 when insufficient credit balance", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null } });
    (db.query.users.findFirst as any).mockResolvedValue({ ...MOCK_USER, creditBalance: "10" });
    mockTransaction(mkProducts([{ price: "500" }]));
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"] }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("เครดิตไม่เพียงพอ");
  });

  it("returns 400 when insufficient point balance", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null } });
    (db.query.users.findFirst as any).mockResolvedValue({ ...MOCK_USER, pointBalance: "0" });
    mockTransaction(mkProducts([{ currency: "POINT", price: "200" }]));
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"] }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("Point ไม่เพียงพอ");
  });

  // ── success paths ───────────────────────────────────────────────────────
  it("succeeds with THB products (no email)", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null, name: "Test" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    mockTransaction(mkProducts([{ price: "100" }]));
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.purchasedCount).toBe(1);
    expect(body.totalTHB).toBe(100);
  });

  it("succeeds with THB products and sends email receipt", async () => {
    const { sendEmail } = await import("@/lib/mail");
    (auth as any).mockResolvedValue({ user: { id: "u1", email: "user@test.com", name: "Test User" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    mockTransaction(mkProducts([{ price: "100" }]));
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"] }));
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "user@test.com" }));
  });

  it("succeeds with POINT currency products", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null, name: "Test" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    mockTransaction(mkProducts([{ currency: "POINT", price: "100" }]));
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalPoints).toBe(100);
    expect(body.totalTHB).toBe(0);
  });

  it("succeeds with discountPrice applied", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null, name: "Test" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    mockTransaction(mkProducts([{ price: "200", discountPrice: "80" }]));
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalTHB).toBe(80);
  });

  it("applies promo code to cart checkout total", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null, name: "Test" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    (validatePromoCode as any).mockResolvedValue({
      valid: true,
      promo: { id: "promo1", code: "SAVE10" },
      discountAmount: 10,
    });
    mockTransaction(mkProducts([{ price: "100" }]));
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"], promoCode: "SAVE10" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalTHB).toBe(90);
    expect(body.promoCode).toBe("SAVE10");
  });

  it("succeeds with multiple products in cart", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null } });
    (db.query.users.findFirst as any).mockResolvedValue({ ...MOCK_USER, creditBalance: "5000" });
    mockTransaction(mkProducts([{ price: "100" }, { price: "150" }, { price: "200" }]));
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1", "p2", "p3"] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.purchasedCount).toBe(3);
    expect(body.totalTHB).toBe(450);
  });
});
