import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { isAdminMock } = vi.hoisted(() => ({
  isAdminMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  isAdmin: isAdminMock,
  requirePermissionWithCsrf: isAdminMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn() }),
  },
  products: {},
}));

vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((data: string) => `encrypted_${data}`),
}));

vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn(),
  AUDIT_ACTIONS: { PRODUCT_CREATE: "PRODUCT_CREATE" },
}));

vi.mock("@/lib/utils/date", () => ({
  mysqlNow: vi.fn(() => "2026-01-01 00:00:00"),
}));

import { requirePermissionWithCsrf } from "@/lib/auth";
import { db } from "@/lib/db";

describe("API: /api/products (POST)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: object) =>
    new NextRequest("http://localhost/api/products", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });

  it("returns 401 when not admin", async () => {
    (requirePermissionWithCsrf as any).mockResolvedValue({ success: false, error: "Unauthorized" });

    const { POST } = await import("@/app/api/products/route");
    const res = await POST(createRequest({ title: "Test", price: 100, category: "Games" }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when missing required fields", async () => {
    (requirePermissionWithCsrf as any).mockResolvedValue({ success: true, user: { id: "admin" } });

    const { POST } = await import("@/app/api/products/route");
    const res = await POST(createRequest({ title: "Test" })); // missing price, category

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("Missing required fields");
  });

  it("returns 400 for invalid price", async () => {
    (requirePermissionWithCsrf as any).mockResolvedValue({ success: true, user: { id: "admin" } });

    const { POST } = await import("@/app/api/products/route");
    const res = await POST(createRequest({ title: "Test", price: -5, category: "Games" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("Price must be a positive number");
  });

  it("returns 400 when discount price >= original price", async () => {
    (requirePermissionWithCsrf as any).mockResolvedValue({ success: true, user: { id: "admin" } });

    const { POST } = await import("@/app/api/products/route");
    const res = await POST(createRequest({
      title: "Test", price: 100, category: "Games", discountPrice: 150,
    }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("less than original price");
  });

  it("creates product successfully", async () => {
    (requirePermissionWithCsrf as any).mockResolvedValue({ success: true, user: { id: "admin" } });

    const { POST } = await import("@/app/api/products/route");
    const res = await POST(createRequest({
      title: "My Game", price: 100, category: "Games", secretData: "key123",
    }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.product.name).toBe("My Game");
    expect(db.insert).toHaveBeenCalled();
  });
});
