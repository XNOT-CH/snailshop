import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock dependencies ──
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      products: { findFirst: vi.fn() },
    },
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
    delete: vi.fn(() => ({ where: vi.fn() })),
  },
  products: {},
}));

vi.mock("@/lib/auth", () => ({
  isAdmin: vi.fn(),
}));

vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn(),
  AUDIT_ACTIONS: {
    PRODUCT_UPDATE: "PRODUCT_UPDATE",
    PRODUCT_DELETE: "PRODUCT_DELETE",
  },
}));

vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((v: string) => `enc:${v}`),
  decrypt: vi.fn((v: string) => v.replace("enc:", "")),
}));

vi.mock("@/lib/utils/date", () => ({
  mysqlNow: vi.fn(() => "2026-01-01 00:00:00"),
}));

import { GET, PUT, DELETE } from "@/app/api/products/[id]/route";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { NextRequest } from "next/server";

function makeRequest(body?: Record<string, unknown>, method = "GET"): NextRequest {
  const opts: ConstructorParameters<typeof NextRequest>[1] = { method };
  if (body) {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }
  return new NextRequest("http://localhost/api/products/test-id", opts);
}

const mockParams = { params: Promise.resolve({ id: "test-id" }) };

describe("API: /api/products/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 401 when not admin", async () => {
      vi.mocked(isAdmin).mockResolvedValue({ success: false, error: "ไม่มีสิทธิ์" });
      const res = await GET(makeRequest(), mockParams);
      expect(res.status).toBe(401);
    });

    it("returns 404 when product not found", async () => {
      vi.mocked(isAdmin).mockResolvedValue({ success: true, userId: "a1" });
      vi.mocked(db.query.products.findFirst).mockResolvedValue(undefined);
      const res = await GET(makeRequest(), mockParams);
      expect(res.status).toBe(404);
    });

    it("returns product with decrypted secretData", async () => {
      vi.mocked(isAdmin).mockResolvedValue({ success: true, userId: "a1" });
      vi.mocked(db.query.products.findFirst).mockResolvedValue({
        id: "test-id", name: "Game", secretData: "enc:SECRET",
      } as any);
      const res = await GET(makeRequest(), mockParams);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.secretData).toBe("SECRET");
    });
  });

  describe("PUT", () => {
    it("returns 401 when not admin", async () => {
      vi.mocked(isAdmin).mockResolvedValue({ success: false, error: "ไม่มีสิทธิ์" });
      const res = await PUT(makeRequest({ title: "x", price: "100", category: "y" }, "PUT"), mockParams);
      expect(res.status).toBe(401);
    });

    it("returns 404 when product not found", async () => {
      vi.mocked(isAdmin).mockResolvedValue({ success: true, userId: "a1" });
      vi.mocked(db.query.products.findFirst).mockResolvedValue(undefined);
      const res = await PUT(makeRequest({ title: "x", price: "100", category: "y" }, "PUT"), mockParams);
      expect(res.status).toBe(404);
    });

    it("updates product successfully", async () => {
      vi.mocked(isAdmin).mockResolvedValue({ success: true, userId: "a1" });
      vi.mocked(db.query.products.findFirst).mockResolvedValue({
        id: "test-id", name: "Old", price: "50", category: "Old",
      } as any);
      const res = await PUT(makeRequest({
        title: "Updated", price: "200", category: "Games", secretData: "new-secret",
      }, "PUT"), mockParams);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("returns 400 for invalid discount price", async () => {
      vi.mocked(isAdmin).mockResolvedValue({ success: true, userId: "a1" });
      vi.mocked(db.query.products.findFirst).mockResolvedValue({
        id: "test-id", name: "Old", price: "100", category: "Games",
      } as any);
      const res = await PUT(makeRequest({
        title: "X", price: "100", discountPrice: "200", category: "Games", secretData: "",
      }, "PUT"), mockParams);
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE", () => {
    it("returns 401 when not admin", async () => {
      vi.mocked(isAdmin).mockResolvedValue({ success: false, error: "ไม่มีสิทธิ์" });
      const res = await DELETE(makeRequest(undefined, "DELETE"), mockParams);
      expect(res.status).toBe(401);
    });

    it("returns 404 when product not found", async () => {
      vi.mocked(isAdmin).mockResolvedValue({ success: true, userId: "a1" });
      vi.mocked(db.query.products.findFirst).mockResolvedValue(undefined);
      const res = await DELETE(makeRequest(undefined, "DELETE"), mockParams);
      expect(res.status).toBe(404);
    });

    it("deletes product successfully", async () => {
      vi.mocked(isAdmin).mockResolvedValue({ success: true, userId: "a1" });
      vi.mocked(db.query.products.findFirst).mockResolvedValue({
        id: "test-id", name: "Game", orderId: null,
      } as any);
      const res = await DELETE(makeRequest(undefined, "DELETE"), mockParams);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("clears orderId before deleting sold product", async () => {
      vi.mocked(isAdmin).mockResolvedValue({ success: true, userId: "a1" });
      vi.mocked(db.query.products.findFirst).mockResolvedValue({
        id: "test-id", name: "Game", orderId: "order-1",
      } as any);
      const res = await DELETE(makeRequest(undefined, "DELETE"), mockParams);
      const body = await res.json();
      expect(body.success).toBe(true);
      // Should have called update to clear orderId
      expect(db.update).toHaveBeenCalled();
    });
  });
});
