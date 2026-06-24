/**
 * Targeted success-path tests for dashboard/purchases route
 * This file properly mocks @/lib/encryption and @/lib/db.query.orders
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/encryption", () => ({
  decrypt: vi.fn((v: string) => v?.replace?.("enc:", "") ?? "decrypted-data"),
  encrypt: vi.fn((v: string) => `enc:${v}`),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      orders: { findMany: vi.fn().mockResolvedValue([]) },
    },
  },
  orders: { userId: "userId", purchasedAt: "purchasedAt", status: "status" },
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), gte: vi.fn(), lte: vi.fn(), isNull: vi.fn() }));

import { auth } from "@/auth";
import { db } from "@/lib/db";

const mkReq = (url = "http://localhost/api/dashboard/purchases") => new NextRequest(url);

const MOCK_ORDER = {
  id: "o1", totalPrice: "100", purchasedAt: "2026-03-14 10:00:00",
  givenData: "enc:GAME123", status: "COMPLETED",
  product: { name: "Test Game", imageUrl: "/img.jpg" },
};

describe("API: /api/dashboard/purchases (GET) - success paths", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/dashboard/purchases/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(401);
  });

  it("returns 200 with order list when authenticated", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.orders.findMany as any).mockResolvedValue([MOCK_ORDER]);
    const { GET } = await import("@/app/api/dashboard/purchases/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].secretData).toBe("GAME123"); // decrypt removes "enc:" prefix
  });

  it("returns empty array when no orders", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.orders.findMany as any).mockResolvedValue([]);
    const { GET } = await import("@/app/api/dashboard/purchases/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it("filters out orders without product", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.orders.findMany as any).mockResolvedValue([
      { ...MOCK_ORDER, product: null }, // filtered out
      MOCK_ORDER,
    ]);
    const { GET } = await import("@/app/api/dashboard/purchases/route");
    const res = await GET(mkReq());
    const body = await res.json();
    expect(body.data).toHaveLength(1); // only the one with product
  });

  it("returns 'ไม่พบข้อมูล' when givenData is null", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.orders.findMany as any).mockResolvedValue([
      { ...MOCK_ORDER, givenData: null },
    ]);
    const { GET } = await import("@/app/api/dashboard/purchases/route");
    const res = await GET(mkReq());
    const body = await res.json();
    expect(body.data[0].secretData).toBe("ไม่พบข้อมูล");
  });

  it("accepts date query parameter", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.orders.findMany as any).mockResolvedValue([]);
    const { GET } = await import("@/app/api/dashboard/purchases/route");
    const res = await GET(mkReq("http://localhost/api/dashboard/purchases?date=2026-03-13"));
    expect(res.status).toBe(200);
  });

  it("returns total price as number", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.orders.findMany as any).mockResolvedValue([MOCK_ORDER]);
    const { GET } = await import("@/app/api/dashboard/purchases/route");
    const res = await GET(mkReq());
    const body = await res.json();
    expect(typeof body.data[0].price).toBe("number");
    expect(body.data[0].price).toBe(100);
  });
});
