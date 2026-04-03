/**
 * Tests for admin routes that had 0% coverage:
 * - /api/admin/audit-logs
 * - /api/admin/export
 * - /api/admin/currency-settings
 * - /api/admin/slips
 * - /api/admin/gacha-settings
 * - /api/admin/footer-links
 * - /api/admin/footer-links/settings
 * - /api/admin/gacha-categories
 * - /api/admin/gacha-categories/[id]
 * - /api/dashboard/topup-trend
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Global mocks ─────────────────────────────────────────────────
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => ({ isAdmin: vi.fn(), isAuthenticated: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      auditLogs: { findMany: vi.fn() },
      currencySettings: { findFirst: vi.fn() },
      gachaSettings: { findFirst: vi.fn() },
      footerWidgetSettings: { findFirst: vi.fn() },
      footerLinks: { findMany: vi.fn(), findFirst: vi.fn() },
      gachaCategories: { findMany: vi.fn(), findFirst: vi.fn() },
      topups: { findFirst: vi.fn() },
      orders: { findMany: vi.fn() },
      users: { findMany: vi.fn() },
      products: { findMany: vi.fn() },
    },
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          then: (fn: any) => Promise.resolve([{ count: 0 }]).then(fn),
        }),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    transaction: vi.fn(async (cb: any) => cb({
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }) }),
    })),
  },
  auditLogs: { userId: "userId", action: "action", resource: "resource", createdAt: "createdAt" },
  currencySettings: { id: "id" },
  gachaSettings: { id: "id" },
  footerWidgetSettings: { id: "id" },
  footerLinks: { sortOrder: "sortOrder", id: "id" },
  gachaCategories: { id: "id" },
  topups: { id: "id", status: "status", createdAt: "createdAt", amount: "amount" },
  orders: { purchasedAt: "purchasedAt", id: "id" },
  users: { createdAt: "createdAt", id: "id" },
  gachaRollLogs: { createdAt: "createdAt", id: "id" },
  products: { createdAt: "createdAt", id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), gte: vi.fn(), lte: vi.fn(),
  count: vi.fn(), max: vi.fn(), desc: vi.fn(), asc: vi.fn(), sql: vi.fn(),
}));

vi.mock("@/lib/auditLog", () => ({
  getAuditLogs: vi.fn().mockResolvedValue([]),
  auditFromRequest: vi.fn(),
  AUDIT_ACTIONS: {
    ROLE_UPDATE: "ROLE_UPDATE",
    ROLE_DELETE: "ROLE_DELETE",
    PRODUCT_CREATE: "PRODUCT_CREATE",
    TOPUP_APPROVE: "TOPUP_APPROVE",
    TOPUP_REJECT: "TOPUP_REJECT",
  },
}));
vi.mock("@/lib/utils/date", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils/date")>();
  return {
    ...actual,
    mysqlNow: vi.fn(() => "2026-03-14 00:00:00"),
  };
});
vi.mock("@/lib/validations/validate", () => ({ validateBody: vi.fn() }));
vi.mock("@/lib/validations/content", () => ({
  currencySettingsSchema: {},
  footerLinkSchema: {},
}));
vi.mock("@/lib/validations/gacha", () => ({
  gachaSettingsSchema: {},
  gachaMachineSchema: { partial: vi.fn().mockReturnValue({}) },
}));

import { auth } from "@/auth";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAuditLogs } from "@/lib/auditLog";
import { validateBody } from "@/lib/validations/validate";

const mkReq = (url: string, opts?: ConstructorParameters<typeof NextRequest>[1]) => new NextRequest(url, opts);
const mkParams = (id: string) => ({ params: Promise.resolve({ id }) });
const ADMIN_OK = { success: true };
const UNAUTH = { success: false, error: "Unauthorized" };

// ════════════════════════════════════════════════════════════════
// /api/admin/audit-logs
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/audit-logs (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { GET } = await import("@/app/api/admin/audit-logs/route");
    const res = await GET(new Request("http://localhost/api/admin/audit-logs"));
    expect(res.status).toBe(401);
  });

  it("returns audit logs with no filters", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (getAuditLogs as any).mockResolvedValue([{ id: "l1", action: "ROLE_UPDATE", resource: "roles", userId: "u1", createdAt: "2026-03-14" }]);
    // Mock the count query
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      }),
    });
    const { GET } = await import("@/app/api/admin/audit-logs/route");
    const res = await GET(new Request("http://localhost/api/admin/audit-logs"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.logs).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("returns audit logs with filters", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (getAuditLogs as any).mockResolvedValue([]);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
    });
    const { GET } = await import("@/app/api/admin/audit-logs/route");
    const url = "http://localhost/api/admin/audit-logs?userId=u1&startDate=2026-01-01&endDate=2026-12-31&limit=10&offset=0";
    const res = await GET(new Request(url));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(0);
  });

  it("returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (getAuditLogs as any).mockRejectedValue(new Error("DB fail"));
    const { GET } = await import("@/app/api/admin/audit-logs/route");
    const res = await GET(new Request("http://localhost/api/admin/audit-logs"));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/export
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/export (GET)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  const mkExportReq = (params: Record<string, string>) => {
    const url = new URL("http://localhost/api/admin/export");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return mkReq(url.toString());
  };

  it("returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { GET } = await import("@/app/api/admin/export/route");
    const res = await GET(mkExportReq({ table: "orders" }));
    expect(res.status).toBe(401);
  });

  it("exports orders as CSV", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "o1", userId: "u1", totalPrice: "500", status: "COMPLETED", purchasedAt: "2026-03-14" },
            ]),
          }),
        }),
      }),
    });
    const { GET } = await import("@/app/api/admin/export/route");
    const res = await GET(mkExportReq({ table: "orders" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
  });

  it("exports orders with date range", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });
    const { GET } = await import("@/app/api/admin/export/route");
    const res = await GET(mkExportReq({ table: "orders", from: "2026-01-01", to: "2026-03-14" }));
    expect(res.status).toBe(200);
  });

  it("returns 400 when date range is reversed", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { GET } = await import("@/app/api/admin/export/route");
    const res = await GET(mkExportReq({ table: "orders", from: "2026-03-15", to: "2026-03-14" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("before or equal");
  });

  it("uses Bangkok date for exported filenames", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T20:00:00.000Z"));
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    const { GET } = await import("@/app/api/admin/export/route");
    const res = await GET(mkExportReq({ table: "products" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain('products_2026-04-03.csv');
  });

  it("exports users as CSV", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { id: "u1", username: "testuser", email: null, name: "Test", role: "USER", phone: null, creditBalance: "0", pointBalance: "0", totalTopup: "0", lifetimePoints: "0", createdAt: "2026-03-14" },
          ]),
        }),
      }),
    });
    const { GET } = await import("@/app/api/admin/export/route");
    const res = await GET(mkExportReq({ table: "users" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("users_");
  });

  it("exports topups as CSV", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });
    const { GET } = await import("@/app/api/admin/export/route");
    const res = await GET(mkExportReq({ table: "topups" }));
    expect(res.status).toBe(200);
  });

  it("exports gacha as CSV", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });
    const { GET } = await import("@/app/api/admin/export/route");
    const res = await GET(mkExportReq({ table: "gacha" }));
    expect(res.status).toBe(200);
  });

  it("exports products as CSV", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    const { GET } = await import("@/app/api/admin/export/route");
    const res = await GET(mkExportReq({ table: "products" }));
    expect(res.status).toBe(200);
  });

  it("returns 400 for unknown table", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { GET } = await import("@/app/api/admin/export/route");
    const res = await GET(mkExportReq({ table: "unknown_table" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("Unknown table");
  });

  it("returns 500 on DB error", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error("DB error")),
          }),
        }),
      }),
    });
    const { GET } = await import("@/app/api/admin/export/route");
    const res = await GET(mkExportReq({ table: "orders" }));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/currency-settings
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/currency-settings (GET + PUT)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { GET } = await import("@/app/api/admin/currency-settings/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns existing settings", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.currencySettings.findFirst as any).mockResolvedValue({
      id: "default", name: "พอยท์", symbol: "💎", code: "POINT", isActive: true,
    });
    const { GET } = await import("@/app/api/admin/currency-settings/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("พอยท์");
  });

  it("GET creates default settings when none exist", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.currencySettings.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "default", name: "พอยท์", symbol: "💎", code: "POINT", isActive: true });
    const { GET } = await import("@/app/api/admin/currency-settings/route");
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("PUT returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { PUT } = await import("@/app/api/admin/currency-settings/route");
    const res = await PUT(mkReq("http://localhost", { method: "PUT" }));
    expect(res.status).toBe(401);
  });

  it("PUT updates existing settings", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { name: "Coins", symbol: "🪙", isActive: true } });
    (db.query.currencySettings.findFirst as any).mockResolvedValue({ id: "default" });
    (db.query.currencySettings.findFirst as any).mockResolvedValue({
      id: "default", name: "Coins", symbol: "🪙", code: "POINT", isActive: true,
    });
    const { PUT } = await import("@/app/api/admin/currency-settings/route");
    const res = await PUT(mkReq("http://localhost", { method: "PUT", body: JSON.stringify({ name: "Coins", symbol: "🪙", isActive: true }) }));
    expect(res.status).toBe(200);
  });

  it("PUT creates settings when none exist", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { name: "Diamonds", symbol: "💠", isActive: false, description: "Premium currency" } });
    (db.query.currencySettings.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "default", name: "Diamonds" });
    const { PUT } = await import("@/app/api/admin/currency-settings/route");
    const res = await PUT(mkReq("http://localhost", { method: "PUT", body: JSON.stringify({}) }));
    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/slips
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/slips (PATCH)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { PATCH } = await import("@/app/api/admin/slips/route");
    const res = await PATCH(mkReq("http://localhost", { method: "PATCH", body: JSON.stringify({ id: "t1", action: "APPROVE" }) }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id or action is missing", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { PATCH } = await import("@/app/api/admin/slips/route");
    const res = await PATCH(mkReq("http://localhost", { method: "PATCH", body: JSON.stringify({ id: "t1" }) }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("Missing");
  });

  it("returns 400 when action is invalid", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { PATCH } = await import("@/app/api/admin/slips/route");
    const res = await PATCH(mkReq("http://localhost", { method: "PATCH", body: JSON.stringify({ id: "t1", action: "INVALID" }) }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("Invalid action");
  });

  it("returns 404 when topup not found", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.topups.findFirst as any).mockResolvedValue(null);
    const { PATCH } = await import("@/app/api/admin/slips/route");
    const res = await PATCH(mkReq("http://localhost", { method: "PATCH", body: JSON.stringify({ id: "t999", action: "APPROVE" }) }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when topup is already processed", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.topups.findFirst as any).mockResolvedValue({ id: "t1", status: "APPROVED", amount: "500", userId: "u1", user: { username: "user1" } });
    const { PATCH } = await import("@/app/api/admin/slips/route");
    const res = await PATCH(mkReq("http://localhost", { method: "PATCH", body: JSON.stringify({ id: "t1", action: "APPROVE" }) }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("already processed");
  });

  it("approves a pending topup", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.topups.findFirst as any).mockResolvedValue({ id: "t1", status: "PENDING", amount: "1000", userId: "u1", user: { username: "user1" } });
    const { PATCH } = await import("@/app/api/admin/slips/route");
    const res = await PATCH(mkReq("http://localhost", { method: "PATCH", body: JSON.stringify({ id: "t1", action: "APPROVE" }) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain("1,000");
  });

  it("rejects a pending topup", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.topups.findFirst as any).mockResolvedValue({ id: "t1", status: "PENDING", amount: "500", userId: "u1", user: { username: "user1" } });
    const { PATCH } = await import("@/app/api/admin/slips/route");
    const res = await PATCH(mkReq("http://localhost", { method: "PATCH", body: JSON.stringify({ id: "t1", action: "REJECT" }) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain("rejected");
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/gacha-settings
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/gacha-settings (GET + PUT)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { GET } = await import("@/app/api/admin/gacha-settings/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns existing settings", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.gachaSettings.findFirst as any).mockResolvedValue({
      id: "default", isEnabled: true, costType: "CREDIT", costAmount: "100", dailySpinLimit: 10,
    });
    const { GET } = await import("@/app/api/admin/gacha-settings/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.isEnabled).toBe(true);
  });

  it("GET creates default settings when none exist", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.gachaSettings.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "default", isEnabled: true });
    const { GET } = await import("@/app/api/admin/gacha-settings/route");
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("PUT returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { PUT } = await import("@/app/api/admin/gacha-settings/route");
    const res = await PUT(new Request("http://localhost", { method: "PUT" }));
    expect(res.status).toBe(401);
  });

  it("PUT updates existing settings", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({
      data: { isEnabled: false, costType: "POINT", costAmount: 200, dailySpinLimit: 5, tierMode: "WEIGHT" },
    });
    (db.query.gachaSettings.findFirst as any)
      .mockResolvedValueOnce({ id: "default" })
      .mockResolvedValueOnce({ id: "default", isEnabled: false });
    const { PUT } = await import("@/app/api/admin/gacha-settings/route");
    const res = await PUT(new Request("http://localhost", { method: "PUT", body: JSON.stringify({}) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("PUT inserts new settings when none exist", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({
      data: { isEnabled: true, costType: "CREDIT", costAmount: 50, dailySpinLimit: 100, tierMode: "PRICE" },
    });
    (db.query.gachaSettings.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "default", isEnabled: true });
    const { PUT } = await import("@/app/api/admin/gacha-settings/route");
    const res = await PUT(new Request("http://localhost", { method: "PUT", body: JSON.stringify({}) }));
    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/footer-links (GET + POST)
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/footer-links (GET + POST)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns footer links and settings", async () => {
    (db.query.footerWidgetSettings.findFirst as any).mockResolvedValue({
      id: "w1", isActive: true, title: "เมนูลัด",
    });
    (db.query.footerLinks.findMany as any).mockResolvedValue([
      { id: "l1", label: "Shop", href: "/shop" },
    ]);
    const { GET } = await import("@/app/api/admin/footer-links/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.links).toHaveLength(1);
    expect(body.settings.title).toBe("เมนูลัด");
  });

  it("GET creates settings when none exist", async () => {
    (db.query.footerWidgetSettings.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "w_new", isActive: true, title: "เมนูลัด" });
    (db.query.footerLinks.findMany as any).mockResolvedValue([]);
    const { GET } = await import("@/app/api/admin/footer-links/route");
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("POST returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { POST } = await import("@/app/api/admin/footer-links/route");
    const res = await POST(mkReq("http://localhost", { method: "POST", body: JSON.stringify({}) }));
    expect(res.status).toBe(401);
  });

  it("POST creates a new footer link", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({ data: { label: "Discord", href: "https://discord.gg/x", openInNewTab: true } });
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue([{ maxSort: 2 }]),
    });
    (db.query.footerLinks.findFirst as any).mockResolvedValue({
      id: "new_link", label: "Discord", href: "https://discord.gg/x", openInNewTab: true,
    });
    const { POST } = await import("@/app/api/admin/footer-links/route");
    const res = await POST(mkReq("http://localhost", { method: "POST", body: JSON.stringify({}) }));
    expect(res.status).toBe(201);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/footer-links/settings (GET + PUT)
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/footer-links/settings (GET + PUT)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns settings", async () => {
    (db.query.footerWidgetSettings.findFirst as any).mockResolvedValue({
      id: "w1", isActive: true, title: "Quick Menu",
    });
    const { GET } = await import("@/app/api/admin/footer-links/settings/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isActive).toBe(true);
  });

  it("GET creates settings when none exist", async () => {
    (db.query.footerWidgetSettings.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "new_w", isActive: true, title: "เมนูลัด" });
    const { GET } = await import("@/app/api/admin/footer-links/settings/route");
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("PUT updates existing settings with isActive and title", async () => {
    (db.query.footerWidgetSettings.findFirst as any)
      .mockResolvedValueOnce({ id: "w1", isActive: false, title: "Old" })
      .mockResolvedValueOnce({ id: "w1", isActive: true, title: "New Title" });
    const { PUT } = await import("@/app/api/admin/footer-links/settings/route");
    const res = await PUT(mkReq("http://localhost", { method: "PUT", body: JSON.stringify({ isActive: true, title: "New Title" }) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isActive).toBe(true);
  });

  it("PUT creates settings when none exist", async () => {
    (db.query.footerWidgetSettings.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "new_w", isActive: true, title: "Created" });
    const { PUT } = await import("@/app/api/admin/footer-links/settings/route");
    const res = await PUT(mkReq("http://localhost", { method: "PUT", body: JSON.stringify({ isActive: true, title: "Created" }) }));
    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/gacha-categories (GET + POST)
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/gacha-categories (GET + POST)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { GET } = await import("@/app/api/admin/gacha-categories/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns list of categories with machine count", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.gachaCategories.findMany as any).mockResolvedValue([
      { id: "c1", name: "Action", sortOrder: 0, machines: [{ id: "m1" }, { id: "m2" }] },
      { id: "c2", name: "Puzzle", sortOrder: 1, machines: [] },
    ]);
    const { GET } = await import("@/app/api/admin/gacha-categories/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0]._count.machines).toBe(2);
    expect(body.data[1]._count.machines).toBe(0);
  });

  it("POST returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { POST } = await import("@/app/api/admin/gacha-categories/route");
    const res = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ name: "Action" }) }));
    expect(res.status).toBe(401);
  });

  it("POST creates a new category", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.gachaCategories.findFirst as any).mockResolvedValue({ id: "c_new", name: "Horror", sortOrder: 0 });
    const { POST } = await import("@/app/api/admin/gacha-categories/route");
    const res = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ name: "Horror", sortOrder: 2 }) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("Horror");
  });
});

// ════════════════════════════════════════════════════════════════
// /api/admin/gacha-categories/[id] (PATCH + DELETE)
// ════════════════════════════════════════════════════════════════
describe("API: /api/admin/gacha-categories/[id] (PATCH + DELETE)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("PATCH returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { PATCH } = await import("@/app/api/admin/gacha-categories/[id]/route");
    const res = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({}) }), mkParams("c1"));
    expect(res.status).toBe(401);
  });

  it("PATCH updates category name and sortOrder", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    (db.query.gachaCategories.findFirst as any).mockResolvedValue({ id: "c1", name: "Updated", sortOrder: 5 });
    const { PATCH } = await import("@/app/api/admin/gacha-categories/[id]/route");
    const res = await PATCH(
      new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ name: "Updated", sortOrder: 5, isActive: true }) }),
      mkParams("c1")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("DELETE returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue(UNAUTH);
    const { DELETE } = await import("@/app/api/admin/gacha-categories/[id]/route");
    const res = await DELETE(new Request("http://localhost"), mkParams("c1"));
    expect(res.status).toBe(401);
  });

  it("DELETE removes category", async () => {
    (isAdmin as any).mockResolvedValue(ADMIN_OK);
    const { DELETE } = await import("@/app/api/admin/gacha-categories/[id]/route");
    const res = await DELETE(new Request("http://localhost"), mkParams("c1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/dashboard/topup-trend
// ════════════════════════════════════════════════════════════════
describe("API: /api/dashboard/topup-trend (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/dashboard/topup-trend/route");
    const req = mkReq("http://localhost/api/dashboard/topup-trend");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", role: "USER" } });
    const { GET } = await import("@/app/api/dashboard/topup-trend/route");
    const req = mkReq("http://localhost/api/dashboard/topup-trend");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns topup trend data for default 7 days", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { amount: "500", status: "APPROVED", createdAt: "2026-03-14 12:00:00" },
          { amount: "200", status: "PENDING", createdAt: "2026-03-14 13:00:00" },
        ]),
      }),
    });
    const { GET } = await import("@/app/api/dashboard/topup-trend/route");
    const req = mkReq("http://localhost/api/dashboard/topup-trend");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("returns topup trend data with custom date range", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    const { GET } = await import("@/app/api/dashboard/topup-trend/route");
    const req = mkReq("http://localhost/api/dashboard/topup-trend?startDate=2026-03-01&endDate=2026-03-14");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("returns topup trend data with date param fallback", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    const { GET } = await import("@/app/api/dashboard/topup-trend/route");
    const req = mkReq("http://localhost/api/dashboard/topup-trend?date=2026-03-14");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
