/**
 * Comprehensive tests for /api/promo-codes/validate
 * Covers: missing code, not found, inactive, all validatePromoConditions paths,
 *         calculateDiscount for FIXED and PERCENTAGE (capped/uncapped)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    query: {
      promoCodes: { findFirst: vi.fn() },
      orders: { findFirst: vi.fn() },
    },
  },
  promoCodes: { code: "code" },
  orders: { userId: "userId", status: "status" },
  promoUsages: { promoCodeId: "promoCodeId", userId: "userId", status: "status" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));
vi.mock("@/lib/rateLimit", () => ({
  checkPromoValidationRateLimit: vi.fn(() => ({ blocked: false, remainingAttempts: 5 })),
  recordFailedPromoValidation: vi.fn(),
  clearPromoValidationAttempts: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

import { db } from "@/lib/db";

const mkReq = (body: object) =>
  new NextRequest("http://localhost/api/promo-codes/validate", {
    method: "POST", body: JSON.stringify(body),
  });

const NOW = new Date();
const PAST = new Date(NOW.getTime() - 10000);
const FUTURE = new Date(NOW.getTime() + 10000);

const mkPromo = (override: object = {}) => ({
  id: "promo1", code: "SAVE10", isActive: true,
  startsAt: PAST, expiresAt: null,
  usageLimit: null, usedCount: 0,
  discountType: "PERCENTAGE", discountValue: "10",
  maxDiscount: null, minPurchase: null,
  ...override,
});

describe("API: /api/promo-codes/validate (POST)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns valid:false when code is missing", async () => {
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(mkReq({}));
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.message).toContain("กรอกโค้ด");
  });

  it("returns valid:false when code is not a string", async () => {
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(mkReq({ code: 123 }));
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  it("returns valid:false when code not found", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue(null);
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(mkReq({ code: "WRONG" }));
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.message).toContain("ไม่ถูกต้อง");
  });

  it("returns valid:false when code is inactive", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue(mkPromo({ isActive: false }));
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(mkReq({ code: "SAVE10" }));
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.message).toContain("ปิดใช้งาน");
  });

  it("returns valid:false when code has not started yet", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue(mkPromo({ startsAt: FUTURE }));
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(mkReq({ code: "SAVE10" }));
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.message).toContain("ยังไม่ถึงวัน");
  });

  it("returns valid:false when code is expired", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue(mkPromo({ expiresAt: PAST }));
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(mkReq({ code: "SAVE10" }));
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.message).toContain("หมดอายุ");
  });

  it("returns valid:false when usage limit exceeded", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue(mkPromo({ usageLimit: 5, usedCount: 5 }));
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(mkReq({ code: "SAVE10" }));
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.message).toContain("ครบจำนวน");
  });

  it("returns valid:false when purchase below minPurchase", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue(mkPromo({ minPurchase: "500" }));
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(mkReq({ code: "SAVE10", totalPrice: 100 }));
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.message).toContain("ขั้นต่ำ");
  });

  it("valid PERCENTAGE promo with totalPrice returns discountAmount", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue(mkPromo({ discountValue: "20", discountType: "PERCENTAGE" }));
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(mkReq({ code: "SAVE10", totalPrice: 500 }));
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.discountAmount).toBe(100); // 20% of 500
    expect(body.discountType).toBe("PERCENTAGE");
  });

  it("valid PERCENTAGE promo capped at maxDiscount", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue(mkPromo({ discountValue: "50", maxDiscount: "30" }));
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(mkReq({ code: "SAVE10", totalPrice: 500 }));
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.discountAmount).toBe(30); // capped at maxDiscount
    expect(body.maxDiscount).toBe(30);
  });

  it("treats maxDiscount=0 as uncapped percentage discount", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue(
      mkPromo({ code: "NOTGOD", discountValue: "10", discountType: "PERCENTAGE", minPurchase: "500.00", maxDiscount: "0.00" })
    );
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(mkReq({ code: "NOTGOD", totalPrice: 600 }));
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.discountAmount).toBe(60);
    expect(body.finalPrice).toBe(540);
    expect(body.maxDiscount).toBeNull();
  });

  it("valid PERCENTAGE promo without totalPrice returns null discountAmount", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue(mkPromo());
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(mkReq({ code: "SAVE10" })); // no totalPrice
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.discountAmount).toBeNull();
  });

  it("valid FIXED promo returns correct discountAmount", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue(mkPromo({ discountType: "FIXED", discountValue: "50" }));
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(mkReq({ code: "SAVE10", totalPrice: 200 }));
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.discountAmount).toBe(50);
    expect(body.message).toContain("฿50");
  });

  it("valid promo response includes discountType and message", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue(mkPromo({ discountValue: "15", code: "SUMMER15" }));
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(mkReq({ code: "SUMMER15" }));
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.discount).toBe(15);
    expect(body.message).toContain("SUMMER15");
    expect(body.message).toContain("15%");
  });

  it("passes minPurchase as null when not set", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue(mkPromo({ discountType: "FIXED", discountValue: "20", minPurchase: null }));
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(mkReq({ code: "SAVE10", totalPrice: 50 }));
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.minPurchase).toBeNull();
  });
});
