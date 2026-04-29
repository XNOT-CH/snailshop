/**
 * Comprehensive success-path tests for:
 * - /api/admin/promo-codes GET + POST
 * - /api/admin/roles/[id] GET + PUT + DELETE
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ isAdmin: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      promoCodes: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
      roles: { findFirst: vi.fn() },
    },
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }),
  },
  promoCodes: { code: "code" },
  roles: { id: "id", code: "code" },
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), desc: vi.fn() }));
vi.mock("@/lib/utils/date", () => ({ mysqlNow: vi.fn(() => "2026-03-14 00:00:00") }));
vi.mock("@/lib/validations/promoCode", () => ({ promoCodeSchema: {} }));
vi.mock("@/lib/validations/validate", () => ({ validateBody: vi.fn() }));
vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn(),
  AUDIT_ACTIONS: { ROLE_UPDATE: "ROLE_UPDATE", ROLE_DELETE: "ROLE_DELETE" },
}));

import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBody } from "@/lib/validations/validate";

type NextRequestInit = ConstructorParameters<typeof NextRequest>[1];

const mkReq = (url: string, opts?: NextRequestInit) => new NextRequest(url, opts);
const mkParams = (id: string) => ({ params: Promise.resolve({ id }) });
const ADMIN_OK = { success: true };
const UNAUTH = { success: false, error: "Unauthorized" };

// ═══════════════════════════════════════════════
// /api/admin/promo-codes
// ═══════════════════════════════════════════════
describe("API: /api/admin/promo-codes", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { GET } = await import("@/app/api/admin/promo-codes/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns list with numeric discountValue", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.promoCodes.findMany as any).mockResolvedValue([
      { id: "p1", code: "SAVE10", discountValue: "10", minPurchase: "200", maxDiscount: "50" },
      { id: "p2", code: "FLAT5", discountValue: "5", minPurchase: null, maxDiscount: null },
    ]);
    const { GET } = await import("@/app/api/admin/promo-codes/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].discountValue).toBe(10);
    expect(body.data[0].minPurchase).toBe(200);
    expect(body.data[0].maxDiscount).toBe(50);
    expect(body.data[1].minPurchase).toBeNull();
  });

  it("POST returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { POST } = await import("@/app/api/admin/promo-codes/route");
    const res = await POST(mkReq("http://localhost", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 when promo code already exists", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { code: "SAVE10", discountType: "PERCENTAGE", discountValue: 10, minOrderAmount: 0, maxUses: 0, isActive: true } });
    (db.query.promoCodes.findFirst as any).mockResolvedValue({ id: "existing", code: "SAVE10" });
    const { POST } = await import("@/app/api/admin/promo-codes/route");
    const res = await POST(mkReq("http://localhost", { method: "POST", body: JSON.stringify({}) }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("already exists");
  });

  it("POST creates promo code successfully", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({
      data: { code: "NEW30", discountType: "FIXED", discountValue: 30, minOrderAmount: 500, maxUses: 100, isActive: true, expiresAt: null },
    });
    (db.query.promoCodes.findFirst as any).mockResolvedValue(null); // no existing
    const { POST } = await import("@/app/api/admin/promo-codes/route");
    const res = await POST(mkReq("http://localhost", { method: "POST", body: JSON.stringify({}) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.code).toBe("NEW30"); // uppercase
  });

  it("POST handles expiresAt date correctly", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({
      data: { code: "TEMP", discountType: "PERCENTAGE", discountValue: 5, minOrderAmount: 0, maxUses: 0, isActive: true, expiresAt: "2026-12-31" },
    });
    (db.query.promoCodes.findFirst as any).mockResolvedValue(null);
    const { POST } = await import("@/app/api/admin/promo-codes/route");
    const res = await POST(mkReq("http://localhost", { method: "POST", body: JSON.stringify({}) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.expiresAt).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════
// /api/admin/roles/[id]
// ═══════════════════════════════════════════════
const mkRole = (override = {}) => ({
  id: "r1", name: "Seller", code: "SELLER", iconUrl: null,
  description: "Can sell products", permissions: null,
  sortOrder: 0, isSystem: false, ...override,
});

describe("API: /api/admin/roles/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 404 when role not found", async () => {
    (db.query.roles.findFirst as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/admin/roles/[id]/route");
    const res = await GET(new Request("http://localhost"), mkParams("r1"));
    expect(res.status).toBe(404);
  });

  it("GET returns role when found", async () => {
    (db.query.roles.findFirst as any).mockResolvedValue(mkRole());
    const { GET } = await import("@/app/api/admin/roles/[id]/route");
    const res = await GET(new Request("http://localhost"), mkParams("r1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Seller");
  });

  it("PUT returns 400 when name or code missing", async () => {
    (db.query.roles.findFirst as any).mockResolvedValue(mkRole());
    const { PUT } = await import("@/app/api/admin/roles/[id]/route");
    const res = await PUT(new Request("http://localhost", {
      method: "PUT", body: JSON.stringify({ name: "Seller" }) // missing code
    }), mkParams("r1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("required");
  });

  it("PUT returns 404 when role not found", async () => {
    (db.query.roles.findFirst as any).mockResolvedValue(null);
    const { PUT } = await import("@/app/api/admin/roles/[id]/route");
    const res = await PUT(new Request("http://localhost", {
      method: "PUT", body: JSON.stringify({ name: "Seller", code: "SELLER" }),
    }), mkParams("r1"));
    expect(res.status).toBe(404);
  });

  it("PUT returns 400 when code conflicts with another role", async () => {
    (db.query.roles.findFirst as any)
      .mockResolvedValueOnce(mkRole({ code: "SELLER" })) // existing role
      .mockResolvedValueOnce({ id: "r99", code: "ADMIN" }); // conflict
    const { PUT } = await import("@/app/api/admin/roles/[id]/route");
    const res = await PUT(new Request("http://localhost", {
      method: "PUT", body: JSON.stringify({ name: "Admin", code: "admin" }), // ADMIN ≠ SELLER → check conflict
    }), mkParams("r1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("already exists");
  });

  it("PUT updates role successfully", async () => {
    (db.query.roles.findFirst as any)
      .mockResolvedValueOnce(mkRole()) // existing role
      .mockResolvedValueOnce({ ...mkRole(), name: "Updated Seller" }); // after update (no conflict check - code unchanged)
    const { PUT } = await import("@/app/api/admin/roles/[id]/route");
    const res = await PUT(new Request("http://localhost", {
      method: "PUT", body: JSON.stringify({ name: "Updated Seller", code: "SELLER", description: "New desc" }),
    }), mkParams("r1"));
    expect(res.status).toBe(200);
  });

  it("DELETE returns 404 when role not found", async () => {
    (db.query.roles.findFirst as any).mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/admin/roles/[id]/route");
    const res = await DELETE(new Request("http://localhost"), mkParams("r1"));
    expect(res.status).toBe(404);
  });

  it("DELETE returns 400 when trying to delete system role", async () => {
    (db.query.roles.findFirst as any).mockResolvedValue(mkRole({ isSystem: true }));
    const { DELETE } = await import("@/app/api/admin/roles/[id]/route");
    const res = await DELETE(new Request("http://localhost"), mkParams("r1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("system role");
  });

  it("DELETE removes non-system role successfully", async () => {
    (db.query.roles.findFirst as any).mockResolvedValue(mkRole({ isSystem: false }));
    const { DELETE } = await import("@/app/api/admin/roles/[id]/route");
    const res = await DELETE(new Request("http://localhost"), mkParams("r1"));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });
});
