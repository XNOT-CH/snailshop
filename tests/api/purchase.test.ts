import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
      promoCodes: { findFirst: vi.fn() },
    },
    $client: { getConnection: vi.fn() },
  },
  users: { id: "id" },
  promoCodes: { code: "code" },
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((d: string) => `enc_${d}`),
  decrypt: vi.fn((d: string) => d?.replace?.("enc_", "") ?? ""),
}));

vi.mock("@/lib/stock", () => ({
  splitStock: vi.fn(),
  getDelimiter: vi.fn(() => "\n"),
}));

vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn(),
  AUDIT_ACTIONS: { PURCHASE: "PURCHASE" },
}));

vi.mock("@/lib/mail", () => ({ sendEmail: vi.fn().mockResolvedValue({}) }));

vi.mock("@/components/emails/PurchaseReceiptEmail", () => ({
  PurchaseReceiptEmail: vi.fn(() => null),
}));

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { splitStock } from "@/lib/stock";

// ─── helpers ─────────────────────────────────────────────────────────────────
const req = (body: object) =>
  new NextRequest("http://localhost/api/purchase", {
    method: "POST",
    body: JSON.stringify(body),
  });

/** Build a mock MySQL2 pool connection */
function mkConn(productRow?: object, promoRow?: object | null) {
  const conn = {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn().mockResolvedValue(undefined),
  };
  if (productRow) {
    // First call: SELECT product FOR UPDATE
    conn.execute.mockResolvedValueOnce([[productRow]]);
    if (promoRow !== undefined) {
      // Second call: SELECT promo FOR UPDATE
      conn.execute.mockResolvedValueOnce([promoRow ? [promoRow] : []]);
    }
    // Subsequent calls: INSERT, UPDATE User, UPDATE Product, promo usage updates
    conn.execute.mockResolvedValue([{ affectedRows: 1 }]);
  }
  return conn;
}

/** Default authenticated user */
const MOCK_USER = {
  id: "u1", name: "Test User", email: "test@mail.com",
  creditBalance: "1000", role: "USER",
};

/** Default product row returned from raw SQL */
const MOCK_PRODUCT = {
  id: "p1", name: "Test Product", price: "100",
  discountPrice: null, isSold: 0,
  secretData: "enc_item1", stockSeparator: "newline", orderId: null,
};

// ─── tests ───────────────────────────────────────────────────────────────────
describe("API: /api/purchase (POST)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ── validation ──────────────────────────────────────────────────────────────
  it("returns 400 when productId is missing", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("Product ID");
  });

  it("returns 400 for invalid quantity (negative)", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "p1", quantity: -1 }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("Quantity");
  });

  it("returns 400 for non-integer quantity", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "p1", quantity: 1.5 }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "p1" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when user not found", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue(null);
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "p1" }));
    expect(res.status).toBe(404);
  });

  // ── promo code validation ───────────────────────────────────────────────────
  it("proceeds without promo when promoCode not provided", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    (splitStock as any).mockReturnValue(["item1"]);
    const conn = mkConn(MOCK_PRODUCT);
    (db.$client.getConnection as any).mockResolvedValue(conn);

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "p1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain("ซื้อสำเร็จ");
  });

  it("applies PERCENTAGE promo code discount", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    (db.query.promoCodes.findFirst as any).mockResolvedValue({
      id: "promo1", isActive: true,
      startsAt: new Date(Date.now() - 1000),
      expiresAt: null,
      usageLimit: null, usedCount: 0,
      discountType: "PERCENTAGE",
      discountValue: "10",
      maxDiscount: null,
    });
    (splitStock as any).mockReturnValue(["item1"]);
    const conn = mkConn(MOCK_PRODUCT, {
      id: "promo1", code: "SAVE10", isActive: true,
      startsAt: new Date(Date.now() - 1000),
      expiresAt: null,
      usageLimit: null, usedCount: 0,
      usagePerUser: null,
      applicableCategories: null,
      excludedCategories: null,
      isNewUserOnly: false,
      discountType: "PERCENTAGE",
      discountValue: "10",
      maxDiscount: null,
      minPurchase: null,
    });
    (db.$client.getConnection as any).mockResolvedValue(conn);

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "p1", promoCode: "SAVE10" }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it("applies FIXED promo code discount", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    (db.query.promoCodes.findFirst as any).mockResolvedValue({
      id: "promo2", isActive: true,
      startsAt: new Date(Date.now() - 1000),
      expiresAt: null, usageLimit: null, usedCount: 0,
      discountType: "FIXED", discountValue: "20", maxDiscount: null,
    });
    (splitStock as any).mockReturnValue(["item1"]);
    const conn = mkConn(MOCK_PRODUCT, {
      id: "promo2", code: "FLAT20", isActive: true,
      startsAt: new Date(Date.now() - 1000),
      expiresAt: null, usageLimit: null, usedCount: 0,
      usagePerUser: null,
      applicableCategories: null,
      excludedCategories: null,
      isNewUserOnly: false,
      discountType: "FIXED", discountValue: "20", maxDiscount: null, minPurchase: null,
    });
    (db.$client.getConnection as any).mockResolvedValue(conn);

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "p1", promoCode: "FLAT20" }));
    expect(res.status).toBe(200);
  });

  it("applies PERCENTAGE promo capped at maxDiscount", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    (db.query.promoCodes.findFirst as any).mockResolvedValue({
      id: "promo3", isActive: true,
      startsAt: new Date(Date.now() - 1000),
      expiresAt: null, usageLimit: null, usedCount: 0,
      discountType: "PERCENTAGE", discountValue: "50", maxDiscount: "30",
    });
    (splitStock as any).mockReturnValue(["item1"]);
    const conn = mkConn(MOCK_PRODUCT, {
      id: "promo3", code: "BIG50", isActive: true,
      startsAt: new Date(Date.now() - 1000),
      expiresAt: null, usageLimit: null, usedCount: 0,
      usagePerUser: null,
      applicableCategories: null,
      excludedCategories: null,
      isNewUserOnly: false,
      discountType: "PERCENTAGE", discountValue: "50", maxDiscount: "30", minPurchase: null,
    });
    (db.$client.getConnection as any).mockResolvedValue(conn);

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "p1", promoCode: "BIG50" }));
    expect(res.status).toBe(200);
  });

  it("rejects expired promo code", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    (db.query.promoCodes.findFirst as any).mockResolvedValue({
      id: "promo4", isActive: true,
      startsAt: new Date(Date.now() - 2000),
      expiresAt: new Date(Date.now() - 1000), // expired
      usageLimit: null, usedCount: 0,
      discountType: "FIXED", discountValue: "10", maxDiscount: null,
    });
    (splitStock as any).mockReturnValue(["item1"]);
    const conn = mkConn(MOCK_PRODUCT, {
      id: "promo4", code: "EXPIRED", isActive: true,
      startsAt: new Date(Date.now() - 2000),
      expiresAt: new Date(Date.now() - 1000),
      usageLimit: null, usedCount: 0,
      usagePerUser: null,
      applicableCategories: null,
      excludedCategories: null,
      isNewUserOnly: false,
      discountType: "FIXED", discountValue: "10", maxDiscount: null, minPurchase: null,
    });
    (db.$client.getConnection as any).mockResolvedValue(conn);

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "p1", promoCode: "EXPIRED" }));
    expect(res.status).toBe(400);
  });

  it("rejects usage-limit-exceeded promo code", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    (db.query.promoCodes.findFirst as any).mockResolvedValue({
      id: "promo5", isActive: true,
      startsAt: new Date(Date.now() - 1000),
      expiresAt: null, usageLimit: 10, usedCount: 10, // maxed out
      discountType: "FIXED", discountValue: "10", maxDiscount: null,
    });
    (splitStock as any).mockReturnValue(["item1"]);
    const conn = mkConn(MOCK_PRODUCT, {
      id: "promo5", code: "MAXED", isActive: true,
      startsAt: new Date(Date.now() - 1000),
      expiresAt: null, usageLimit: 10, usedCount: 10,
      usagePerUser: null,
      applicableCategories: null,
      excludedCategories: null,
      isNewUserOnly: false,
      discountType: "FIXED", discountValue: "10", maxDiscount: null, minPurchase: null,
    });
    (db.$client.getConnection as any).mockResolvedValue(conn);

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "p1", promoCode: "MAXED" }));
    expect(res.status).toBe(400);
  });

  // ── transaction error paths ─────────────────────────────────────────────────
  it("returns 400 when product not found in DB", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    const conn = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue([[/* empty — no product */]]),
      commit: vi.fn(), rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
    (db.$client.getConnection as any).mockResolvedValue(conn);
    (splitStock as any).mockReturnValue([]);

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "nonexistent" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("ไม่พบสินค้า");
    expect(conn.rollback).toHaveBeenCalled();
  });

  it("returns 400 when product is already sold", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    const soldProduct = { ...MOCK_PRODUCT, isSold: 1 };
    const conn = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue([[soldProduct]]),
      commit: vi.fn(), rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
    (db.$client.getConnection as any).mockResolvedValue(conn);

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "p1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("ถูกขายไปแล้ว");
    expect(conn.rollback).toHaveBeenCalled();
  });

  it("returns 400 when user has insufficient balance", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue({ ...MOCK_USER, creditBalance: "10" });
    const expensiveProduct = { ...MOCK_PRODUCT, price: "500" };
    const conn = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue([[expensiveProduct]]),
      commit: vi.fn(), rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
    (db.$client.getConnection as any).mockResolvedValue(conn);
    (splitStock as any).mockReturnValue([]);

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "p1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("เครดิตไม่เพียงพอ");
    expect(conn.rollback).toHaveBeenCalled();
  });

  it("returns 400 when stock is empty", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    const conn = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue([[MOCK_PRODUCT]]),
      commit: vi.fn(), rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
    (db.$client.getConnection as any).mockResolvedValue(conn);
    (splitStock as any).mockReturnValue([]); // empty stock

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "p1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("หมดสต็อก");
    expect(conn.rollback).toHaveBeenCalled();
  });

  it("returns 400 when stock is insufficient for quantity", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    const conn = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue([[MOCK_PRODUCT]]),
      commit: vi.fn(), rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
    (db.$client.getConnection as any).mockResolvedValue(conn);
    (splitStock as any).mockReturnValue(["item1"]); // only 1 item but qty=2

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "p1", quantity: 2 }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("สต็อกไม่เพียงพอ");
    expect(conn.rollback).toHaveBeenCalled();
  });

  // ── success paths ───────────────────────────────────────────────────────────
  it("succeeds with quantity=1, no promo, returns orderId", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    (splitStock as any).mockReturnValue(["item1", "item2"]);
    const conn = mkConn(MOCK_PRODUCT);
    (db.$client.getConnection as any).mockResolvedValue(conn);

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "p1", quantity: 1 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.orderId).toBeDefined();
    expect(body.productName).toBe("Test Product");
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });

  it("succeeds purchasing last item in stock (isLastStock=true)", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    (splitStock as any).mockReturnValue(["last-item"]); // only 1 left
    const conn = mkConn(MOCK_PRODUCT);
    (db.$client.getConnection as any).mockResolvedValue(conn);

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "p1", quantity: 1 }));
    expect(res.status).toBe(200);
    expect(conn.commit).toHaveBeenCalled();
  });

  it("succeeds with discountPrice (uses discountPrice instead of price)", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    const discountedProduct = { ...MOCK_PRODUCT, price: "200", discountPrice: "80" };
    (splitStock as any).mockReturnValue(["item1"]);
    const conn = mkConn(discountedProduct);
    (db.$client.getConnection as any).mockResolvedValue(conn);

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "p1" }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it("succeeds purchasing multiple quantities", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue({ ...MOCK_USER, creditBalance: "5000" });
    (splitStock as any).mockReturnValue(["item1", "item2", "item3"]);
    const conn = mkConn(MOCK_PRODUCT);
    (db.$client.getConnection as any).mockResolvedValue(conn);

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "p1", quantity: 2 }));
    expect(res.status).toBe(200);
  });

  it("defaults quantity to 1 when not provided", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    (splitStock as any).mockReturnValue(["item1"]);
    const conn = mkConn(MOCK_PRODUCT);
    (db.$client.getConnection as any).mockResolvedValue(conn);

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(req({ productId: "p1" })); // no quantity
    expect(res.status).toBe(200);
  });
});
