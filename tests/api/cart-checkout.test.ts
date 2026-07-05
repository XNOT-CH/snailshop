import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  isAuthenticatedWithCsrf: vi.fn(async () => {
    const { auth } = await import("@/auth");
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }
    return { success: true, userId: session.user.id, user: session.user };
  }),
}));

vi.mock("@/lib/db", () => {
  const getConnection = vi.fn();

  return {
    db: {
      $client: { getConnection },
      query: { users: { findFirst: vi.fn() } },
      insert: vi.fn().mockReturnValue({ values: vi.fn() }),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
    },
    rawDbPool: { getConnection },
    users: { id: "id", creditBalance: "creditBalance", pointBalance: "pointBalance" },
    products: { id: "id", isSold: "isSold" },
    orders: { id: "id" },
    promoCodes: { id: "id", usedCount: "usedCount" },
    promoUsages: { id: "id" },
  };
});

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), inArray: vi.fn(), sql: Object.assign(vi.fn(), { join: vi.fn(() => ({})) }) }));
vi.mock("@/lib/mail", () => ({ sendEmail: vi.fn().mockResolvedValue({}) }));
vi.mock("@/components/emails/PurchaseReceiptEmail", () => ({ PurchaseReceiptEmail: vi.fn(() => null) }));
vi.mock("@/lib/encryption", () => ({
  decrypt: vi.fn((value: string) => value),
  encrypt: vi.fn((value: string) => value),
}));
vi.mock("@/lib/stock", () => ({
  splitStock: vi.fn((value: string) => (value ? value.split("\n").filter(Boolean) : [])),
  getDelimiter: vi.fn(() => "\n"),
}));
vi.mock("@/lib/rateLimit", () => ({
  checkPurchaseRateLimit: vi.fn(() => ({ blocked: false, remainingAttempts: 12 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));
vi.mock("@/lib/security/pin", () => ({
  assertPinForProtectedAction: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/getCurrencySettings", () => ({ getCurrencySettings: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/getSiteSettings", () => ({ getSiteSettings: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/seo", () => ({ resolveSiteName: vi.fn(() => "Game Store") }));

import { auth } from "@/auth";
import { db } from "@/lib/db";

const mkReq = (body: object) =>
  new NextRequest("http://localhost/api/cart/checkout", { method: "POST", body: JSON.stringify(body) });

const MOCK_USER = { id: "u1", creditBalance: "2000", pointBalance: "500" };

const mkProducts = (overrides: Partial<{
  id: string; name: string; price: string; discountPrice: string | null; category: string | null;
  currency: string | null; isSold: boolean; secretData: string | null; stockSeparator: string | null;
}>[] = [{}]) =>
  overrides.map((o, i) => ({
    id: `p${i + 1}`, name: `Product ${i + 1}`, price: "100",
    discountPrice: null, currency: "THB", isSold: false, secretData: "code1\ncode2\ncode3", stockSeparator: "newline", ...o,
  }));

const mockCheckoutConnection = (products: any[], promoRow?: any, lockedUser: any = MOCK_USER) => {
  const connection = {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
    execute: vi.fn(async (query: string) => {
      if (query.includes("FROM Product WHERE id IN")) {
        return [products];
      }

      if (query.includes("FROM User WHERE id = ? FOR UPDATE")) {
        return [[lockedUser]];
      }

      if (query.includes("FROM PromoCode WHERE code = ? FOR UPDATE")) {
        return [promoRow ? [promoRow] : []];
      }

      return [{}];
    }),
  };

  (db.$client.getConnection as any).mockResolvedValue(connection);
  return connection;
};

describe("API: /api/cart/checkout (POST)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null } });
  });

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

  it("returns 400 when an item quantity is invalid", async () => {
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ items: [{ productId: "p1", quantity: 0 }] }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("จำนวน");
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
    mockCheckoutConnection(mkProducts([{}])); // only 1 product for 2 ids
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1", "p2"] }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("บางสินค้าไม่พบ");
  });

  it("returns 400 when product is already sold", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    mockCheckoutConnection(mkProducts([{ isSold: true }]));
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
    mockCheckoutConnection(mkProducts([{ price: "500" }]), undefined, { ...MOCK_USER, creditBalance: "10" });
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"] }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("เครดิตไม่เพียงพอ");
  });

  it("returns 400 when insufficient point balance", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null } });
    (db.query.users.findFirst as any).mockResolvedValue({ ...MOCK_USER, pointBalance: "0" });
    mockCheckoutConnection(mkProducts([{ currency: "POINT", price: "200" }]), undefined, { ...MOCK_USER, pointBalance: "0" });
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"] }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("ไม่เพียงพอ");
  });

  // ── success paths ───────────────────────────────────────────────────────
  it("succeeds with THB products (no email)", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null, name: "Test" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    const conn = mockCheckoutConnection(mkProducts([{ price: "100" }]));
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.purchasedCount).toBe(1);
    expect(body.totalTHB).toBe(100);
    expect(conn.execute).toHaveBeenCalledWith(
      "SELECT id, creditBalance, pointBalance FROM User WHERE id = ? FOR UPDATE",
      ["u1"],
    );
  });

  it("succeeds with THB products and sends email receipt", async () => {
    const { sendEmail } = await import("@/lib/mail");
    (auth as any).mockResolvedValue({ user: { id: "u1", email: "user@test.com", name: "Test User" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    mockCheckoutConnection(mkProducts([{ price: "100" }]));
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"] }));
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "user@test.com" }));
  });

  it("succeeds with POINT currency products", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null, name: "Test" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    mockCheckoutConnection(mkProducts([{ currency: "POINT", price: "100" }]));
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
    mockCheckoutConnection(mkProducts([{ price: "200", discountPrice: "80" }]));
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalTHB).toBe(80);
  });

  it("applies promo code to cart checkout total", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null, name: "Test" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    mockCheckoutConnection(mkProducts([{ price: "100" }]), {
      id: "promo1",
      code: "SAVE10",
      codeType: "DISCOUNT",
      discountType: "FIXED",
      discountValue: "10",
      minPurchase: null,
      maxDiscount: null,
      usageLimit: null,
      usagePerUser: null,
      usedCount: 0,
      startsAt: new Date(Date.now() - 1000),
      expiresAt: null,
      applicableCategories: null,
      excludedCategories: null,
      isNewUserOnly: false,
      isActive: true,
    });
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"], promoCode: "SAVE10" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalTHB).toBe(90);
    expect(body.promoCode).toBe("SAVE10");
  });

  it("allows cart checkout when balance covers the promo-discounted total", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null, name: "Test" } });
    (db.query.users.findFirst as any).mockResolvedValue({ ...MOCK_USER, creditBalance: "90" });
    mockCheckoutConnection(mkProducts([{ price: "100" }]), {
      id: "promo1",
      code: "SAVE10",
      codeType: "DISCOUNT",
      discountType: "FIXED",
      discountValue: "10",
      minPurchase: null,
      maxDiscount: null,
      usageLimit: null,
      usagePerUser: null,
      usedCount: 0,
      startsAt: new Date(Date.now() - 1000),
      expiresAt: null,
      applicableCategories: null,
      excludedCategories: null,
      isNewUserOnly: false,
      isActive: true,
    }, { ...MOCK_USER, creditBalance: "90" });

    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"], promoCode: "SAVE10" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.totalTHB).toBe(90);
  });

  const mkPromo = (overrides: object = {}) => ({
    id: "promo1",
    code: "SAVE50",
    codeType: "DISCOUNT",
    discountType: "PERCENTAGE",
    discountValue: "50",
    minPurchase: null,
    maxDiscount: null,
    usageLimit: null,
    usagePerUser: null,
    usedCount: 0,
    startsAt: new Date(Date.now() - 1000),
    expiresAt: null,
    applicableCategories: null,
    excludedCategories: null,
    isNewUserOnly: false,
    isActive: true,
    ...overrides,
  });

  it("rejects promo when every cart item is in an excluded category", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null, name: "Test" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    mockCheckoutConnection(
      mkProducts([{ price: "100", category: "games" }]),
      mkPromo({ excludedCategories: ["games"] }),
    );
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"], promoCode: "SAVE50" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe("โค้ดนี้ไม่สามารถใช้กับหมวดสินค้านี้ได้");
  });

  it("does not let mixing categories unlock an excluded-category promo for the excluded item", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null, name: "Test" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    mockCheckoutConnection(
      mkProducts([
        { price: "100", category: "games" },
        { id: "p2", price: "100", category: "software" },
      ]),
      mkPromo({ excludedCategories: ["games"] }),
    );
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1", "p2"], promoCode: "SAVE50" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    // 50% only off the eligible software item: 100 + (100 - 50) = 150
    expect(body.totalTHB).toBe(150);
  });

  it("applies an applicable-categories promo to the matching items of a mixed cart", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null, name: "Test" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    mockCheckoutConnection(
      mkProducts([
        { price: "100", category: "games" },
        { id: "p2", price: "100", category: "software" },
      ]),
      mkPromo({ applicableCategories: ["games"] }),
    );
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1", "p2"], promoCode: "SAVE50" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    // 50% only off the applicable games item: (100 - 50) + 100 = 150
    expect(body.totalTHB).toBe(150);
  });

  it("measures minPurchase against eligible items only", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null, name: "Test" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    mockCheckoutConnection(
      mkProducts([
        { price: "100", category: "games" },
        { id: "p2", price: "100", category: "software" },
      ]),
      mkPromo({ applicableCategories: ["games"], minPurchase: "150" }),
    );
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1", "p2"], promoCode: "SAVE50" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("ยอดซื้อไม่ถึงขั้นต่ำ");
  });

  it("rejects new-user-only promo when the user already has a completed order", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null, name: "Test" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    const conn = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      execute: vi.fn(async (query: string) => {
        if (query.includes("FROM Product WHERE id IN")) {
          return [mkProducts([{ price: "100" }])];
        }
        if (query.includes("FROM User WHERE id = ? FOR UPDATE")) {
          return [[MOCK_USER]];
        }
        if (query.includes("FROM PromoCode WHERE code = ? FOR UPDATE")) {
          return [[{
            id: "promo-new",
            code: "NEWONLY",
            codeType: "DISCOUNT",
            discountType: "FIXED",
            discountValue: "10",
            minPurchase: null,
            maxDiscount: null,
            usageLimit: null,
            usagePerUser: null,
            usedCount: 0,
            startsAt: new Date(Date.now() - 1000),
            expiresAt: null,
            applicableCategories: null,
            excludedCategories: null,
            isNewUserOnly: true,
            isActive: true,
          }]];
        }
        if (query.includes("FROM `Order` FORCE INDEX (idx_order_user_status) WHERE userId = ? AND status = 'COMPLETED'")) {
          return [[{ id: "o1" }]];
        }
        return [{}];
      }),
    };
    (db.$client.getConnection as any).mockResolvedValue(conn);

    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"], promoCode: "NEWONLY" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("ลูกค้าใหม่");
  });

  it("rejects promo when usagePerUser has been exhausted", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null, name: "Test" } });
    (db.query.users.findFirst as any).mockResolvedValue(MOCK_USER);
    const conn = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      execute: vi.fn(async (query: string) => {
        if (query.includes("FROM Product WHERE id IN")) {
          return [mkProducts([{ price: "100" }])];
        }
        if (query.includes("FROM User WHERE id = ? FOR UPDATE")) {
          return [[MOCK_USER]];
        }
        if (query.includes("FROM PromoCode WHERE code = ? FOR UPDATE")) {
          return [[{
            id: "promo-limit",
            code: "LIMIT1",
            codeType: "DISCOUNT",
            discountType: "FIXED",
            discountValue: "10",
            minPurchase: null,
            maxDiscount: null,
            usageLimit: null,
            usagePerUser: 1,
            usedCount: 0,
            startsAt: new Date(Date.now() - 1000),
            expiresAt: null,
            applicableCategories: null,
            excludedCategories: null,
            isNewUserOnly: false,
            isActive: true,
          }]];
        }
        if (query.includes("SELECT COUNT(*) AS count FROM PromoUsage")) {
          return [[{ count: 1 }]];
        }
        return [{}];
      }),
    };
    (db.$client.getConnection as any).mockResolvedValue(conn);

    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"], promoCode: "LIMIT1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("ครบสิทธิ์");
  });

  it("succeeds with multiple products in cart", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null } });
    (db.query.users.findFirst as any).mockResolvedValue({ ...MOCK_USER, creditBalance: "5000" });
    mockCheckoutConnection(mkProducts([{ price: "100" }, { price: "150" }, { price: "200" }]));
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1", "p2", "p3"] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.purchasedCount).toBe(3);
    expect(body.totalTHB).toBe(450);
  });

  it("honors quantity for the same product in cart checkout", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null } });
    (db.query.users.findFirst as any).mockResolvedValue({ ...MOCK_USER, creditBalance: "5000" });
    mockCheckoutConnection(mkProducts([{ price: "100", secretData: "code1\ncode2\ncode3\ncode4" }]));
    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ items: [{ productId: "p1", quantity: 3 }] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.purchasedCount).toBe(3);
    expect(body.totalTHB).toBe(300);
    expect(body.orders).toHaveLength(1);
    expect(body.orders[0].quantity).toBe(3);
  });

  it("clears product secretData after cart checkout takes the last stock item", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", email: null } });
    (db.query.users.findFirst as any).mockResolvedValue({ ...MOCK_USER, creditBalance: "5000" });
    const conn = mockCheckoutConnection(mkProducts([{ price: "100", secretData: "only-code" }]));

    const { POST } = await import("@/app/api/cart/checkout/route");
    const res = await POST(mkReq({ productIds: ["p1"] }));

    expect(res.status).toBe(200);
    expect(conn.execute).toHaveBeenCalledWith(
      "UPDATE Product SET secretData = ?, stockCount = ?, isSold = ?, orderId = ?, scheduledDeleteAt = ? WHERE id = ?",
      ["", 0, 1, expect.any(String), null, "p1"],
    );
  });
});
