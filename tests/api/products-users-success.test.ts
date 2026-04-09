/**
 * Additional targeted tests for products/[id] PUT success path
 * and admin/users/[id] PATCH comprehensive field coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ isAdmin: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      products: { findFirst: vi.fn() },
      users: { findFirst: vi.fn() },
    },
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
  },
  products: { id: "id" },
  users: { id: "id" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));
vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((v: string) => `enc:${v}`),
  decrypt: vi.fn((v: string) => v?.replace?.("enc:", "") ?? ""),
}));
vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn(),
  AUDIT_ACTIONS: { PRODUCT_UPDATE: "PRODUCT_UPDATE", PRODUCT_DELETE: "PRODUCT_DELETE", USER_UPDATE: "USER_UPDATE" },
}));
vi.mock("@/lib/cache", () => ({ invalidateProductCaches: vi.fn() }));

import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

const mkParams = (id: string) => ({ params: Promise.resolve({ id }) });

const EXISTING_PRODUCT = {
  id: "p1", name: "Old Name", price: "200", discountPrice: null,
  imageUrl: null, category: "Games", secretData: "enc:data",
  currency: "THB", description: null, stockSeparator: "newline",
  isSold: false, orderId: null,
};

const EXISTING_USER = {
  id: "u1", username: "testuser", role: "USER",
  creditBalance: "100", totalTopup: "0", pointBalance: 0, lifetimePoints: 0,
};

// ═══════════════════════════════════════
// Products [id] - PUT success paths
// ═══════════════════════════════════════
describe("API: /api/products/[id] PUT (additional paths)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 404 when product not found for PUT", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.products.findFirst as any).mockResolvedValue(null);
    const { PUT } = await import("@/app/api/products/[id]/route");
    const req = new NextRequest("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ title: "New Name", price: "100" }),
    });
    const res = await PUT(req, mkParams("p1"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when discountPrice >= price", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.products.findFirst as any).mockResolvedValue(EXISTING_PRODUCT);
    const { PUT } = await import("@/app/api/products/[id]/route");
    const req = new NextRequest("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ title: "New", price: "100", discountPrice: "150" }),
    });
    const res = await PUT(req, mkParams("p1"));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("less than");
  });

  it("returns 400 when discountPrice is negative", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.products.findFirst as any).mockResolvedValue(EXISTING_PRODUCT);
    const { PUT } = await import("@/app/api/products/[id]/route");
    const req = new NextRequest("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ title: "New", price: "100", discountPrice: "-10" }),
    });
    const res = await PUT(req, mkParams("p1"));
    expect(res.status).toBe(400);
  });

  it("PUT succeeds and updates product", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.products.findFirst as any).mockResolvedValue(EXISTING_PRODUCT);
    const { PUT } = await import("@/app/api/products/[id]/route");
    const req = new NextRequest("http://localhost", {
      method: "PUT",
      body: JSON.stringify({
        title: "New Name", price: "200", discountPrice: "150",
        category: "Games", description: "desc", secretData: "item1\nitem2",
        currency: "THB", stockSeparator: "newline",
      }),
    });
    const res = await PUT(req, mkParams("p1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain("updated");
  });

  it("PUT succeeds with null discountPrice", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.products.findFirst as any).mockResolvedValue(EXISTING_PRODUCT);
    const { PUT } = await import("@/app/api/products/[id]/route");
    const req = new NextRequest("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ title: "Updated", price: "100", discountPrice: null }),
    });
    const res = await PUT(req, mkParams("p1"));
    expect(res.status).toBe(200);
  });

  it("DELETE succeeds and nullifies orderId if product has one", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.products.findFirst as any).mockResolvedValue({ ...EXISTING_PRODUCT, orderId: "order-1" });
    const { DELETE } = await import("@/app/api/products/[id]/route");
    const req = new NextRequest("http://localhost");
    const res = await DELETE(req, mkParams("p1"));
    expect(res.status).toBe(200);
    expect(db.update).toHaveBeenCalled(); // orderId set to null
  });
});

// ═══════════════════════════════════════
// Admin Users [id] - PATCH comprehensive
// ═══════════════════════════════════════
describe("API: /api/admin/users/[id] PATCH (comprehensive)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const req = new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ creditBalance: 500 }) });
    const res = await PATCH(req, mkParams("u1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is empty (no fields)", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const req = new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({}) });
    const res = await PATCH(req, mkParams("u1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for negative creditBalance", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const req = new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ creditBalance: -100 }) });
    const res = await PATCH(req, mkParams("u1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-numeric creditBalance", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const req = new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ creditBalance: "abc" }) });
    const res = await PATCH(req, mkParams("u1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when creditBalance exceeds decimal precision", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const req = new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ creditBalance: 100000000 }) });
    const res = await PATCH(req, mkParams("u1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when pointBalance exceeds int max", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const req = new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ pointBalance: 2147483648 }) });
    const res = await PATCH(req, mkParams("u1"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when user not found", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.users.findFirst as any).mockResolvedValue(null);
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const req = new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ creditBalance: 500 }) });
    const res = await PATCH(req, mkParams("u1"));
    expect(res.status).toBe(404);
  });

  it("PATCH updates creditBalance successfully", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.users.findFirst as any).mockResolvedValue(EXISTING_USER);
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH", body: JSON.stringify({ creditBalance: 500 }),
    });
    const res = await PATCH(req, mkParams("u1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user.creditBalance).toBe("500");
  });

  it("PATCH updates totalTopup successfully", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.users.findFirst as any).mockResolvedValue(EXISTING_USER);
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH", body: JSON.stringify({ totalTopup: 1000 }),
    });
    const res = await PATCH(req, mkParams("u1"));
    expect(res.status).toBe(200);
    expect((await res.json()).user.totalTopup).toBe("1000");
  });

  it("PATCH updates pointBalance and lifetimePoints", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.users.findFirst as any).mockResolvedValue(EXISTING_USER);
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH", body: JSON.stringify({ pointBalance: 250, lifetimePoints: 500 }),
    });
    const res = await PATCH(req, mkParams("u1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.pointBalance).toBe(250);
    expect(body.user.lifetimePoints).toBe(500);
  });

  it("PATCH updates role to uppercase", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.users.findFirst as any).mockResolvedValue(EXISTING_USER);
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH", body: JSON.stringify({ role: "admin" }),
    });
    const res = await PATCH(req, mkParams("u1"));
    expect(res.status).toBe(200);
    expect((await res.json()).user.role).toBe("ADMIN");
  });

  it("PATCH updates all fields at once", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    (db.query.users.findFirst as any).mockResolvedValue(EXISTING_USER);
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const req = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ creditBalance: 1000, totalTopup: 2000, pointBalance: 300, lifetimePoints: 600, role: "admin" }),
    });
    const res = await PATCH(req, mkParams("u1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.creditBalance).toBe("1000");
    expect(body.user.role).toBe("ADMIN");
  });
});
