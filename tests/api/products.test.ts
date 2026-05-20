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
    query: {
      products: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  },
  products: {},
}));

vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((data: string) => `encrypted_${data}`),
  decrypt: vi.fn((data: string) => data?.replace?.("encrypted_", "") ?? ""),
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
    (db.query.products.findMany as any).mockResolvedValue([]);
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

  it("returns 409 when initial stock contains duplicate users", async () => {
    (requirePermissionWithCsrf as any).mockResolvedValue({ success: true, user: { id: "admin" } });

    const { POST } = await import("@/app/api/products/route");
    const res = await POST(createRequest({
      title: "My Game",
      price: 100,
      category: "Games",
      secretData: "user1 / pass1\nuser2 / pass2\nuser1 / pass3",
      stockSeparator: "newline",
    }));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain('User "user1"');
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("returns 409 when initial stock user already exists in another product", async () => {
    (requirePermissionWithCsrf as any).mockResolvedValue({ success: true, user: { id: "admin" } });
    (db.query.products.findMany as any).mockResolvedValue([
      {
        id: "p1",
        name: "Existing Game",
        secretData: "encrypted_user1 / old-pass",
        stockSeparator: "newline",
      },
    ]);

    const { POST } = await import("@/app/api/products/route");
    const res = await POST(createRequest({
      title: "My Game",
      price: 100,
      category: "Games",
      secretData: "user1 / pass1",
      stockSeparator: "newline",
    }));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain('สินค้า "Existing Game"');
    expect(db.insert).not.toHaveBeenCalled();
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
