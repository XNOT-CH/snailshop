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

describe("API: /api/promo-codes/validate (POST)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const createRequest = (body: object) =>
    new NextRequest("http://localhost/api/promo-codes/validate", {
      method: "POST",
      body: JSON.stringify(body),
    });

  it("returns invalid when no code provided", async () => {
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(createRequest({}));
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  it("returns invalid for unknown code", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue(null);
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(createRequest({ code: "BADCODE" }));
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  it("returns invalid for inactive code", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue({ isActive: false });
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(createRequest({ code: "INACTIVE" }));
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  it("returns invalid for expired code", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    (db.query.promoCodes.findFirst as any).mockResolvedValue({
      isActive: true,
      startsAt: new Date("2020-01-01"),
      expiresAt: pastDate,
      usageLimit: null,
      usedCount: 0,
    });
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(createRequest({ code: "EXPIRED" }));
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  it("returns invalid when usage limit reached", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue({
      isActive: true,
      startsAt: new Date("2020-01-01"),
      expiresAt: null,
      usageLimit: 5,
      usedCount: 5,
    });
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(createRequest({ code: "USED_UP" }));
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  it("returns valid for percentage discount", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue({
      code: "SAVE10",
      isActive: true,
      startsAt: new Date("2020-01-01"),
      expiresAt: null,
      usageLimit: null,
      usedCount: 0,
      discountType: "PERCENTAGE",
      discountValue: "10",
      maxDiscount: "100",
      minPurchase: null,
    });
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(createRequest({ code: "SAVE10", totalPrice: 500 }));
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.discountAmount).toBe(50);
  });

  it("returns valid for fixed discount", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue({
      code: "FLAT50",
      isActive: true,
      startsAt: new Date("2020-01-01"),
      expiresAt: null,
      usageLimit: null,
      usedCount: 0,
      discountType: "FIXED",
      discountValue: "50",
      maxDiscount: null,
      minPurchase: null,
    });
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(createRequest({ code: "FLAT50", totalPrice: 500 }));
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.discountAmount).toBe(50);
  });

  it("respects min purchase requirement", async () => {
    (db.query.promoCodes.findFirst as any).mockResolvedValue({
      isActive: true,
      startsAt: new Date("2020-01-01"),
      expiresAt: null,
      usageLimit: null,
      usedCount: 0,
      discountType: "PERCENTAGE",
      discountValue: "10",
      maxDiscount: null,
      minPurchase: "500",
    });
    const { POST } = await import("@/app/api/promo-codes/validate/route");
    const res = await POST(createRequest({ code: "MIN500", totalPrice: 100 }));
    const body = await res.json();
    expect(body.valid).toBe(false);
  });
});
