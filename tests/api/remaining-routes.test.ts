/**
 * Tests for dashboard overview, upload, user/settings, and topup API routes
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ═══════════════════════════════════════
// Dashboard Overview
// ═══════════════════════════════════════

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
      topups: { findFirst: vi.fn() },
    },
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ cnt: 5, total: "500" }]),
      }),
    }),
    insert: vi.fn().mockReturnValue({ values: vi.fn() }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
    transaction: vi.fn(),
  },
  users: { id: "id", email: "email", creditBalance: "creditBalance" },
  orders: { userId: "userId", purchasedAt: "purchasedAt", totalPrice: "totalPrice" },
  topups: { userId: "userId", status: "status", createdAt: "createdAt", amount: "amount", transactionRef: "transactionRef" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), gte: vi.fn(), lte: vi.fn(), sum: vi.fn(), count: vi.fn(), sql: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ isAdmin: vi.fn() }));

vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn(),
  AUDIT_ACTIONS: { TOPUP_REQUEST: "TOPUP_REQUEST" },
}));

vi.mock("@/lib/utils/date", () => ({
  mysqlNow: vi.fn(() => "2026-01-01 00:00:00"),
}));

vi.mock("node:fs/promises", () => ({
  default: {},
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock("node:fs", () => ({
  default: {},
  existsSync: vi.fn(() => true),
}));

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

describe("API: /api/dashboard/overview (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/dashboard/overview/route");
    const req = new NextRequest("http://localhost/api/dashboard/overview");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 404 when user not found", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/dashboard/overview/route");
    const req = new NextRequest("http://localhost/api/dashboard/overview");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("returns dashboard data for authenticated user", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (db.query.users.findFirst as any).mockResolvedValue({ id: "u1", creditBalance: "500" });
    const { GET } = await import("@/app/api/dashboard/overview/route");
    const req = new NextRequest("http://localhost/api/dashboard/overview");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ═══════════════════════════════════════
// Upload
// ═══════════════════════════════════════
describe("API: /api/upload (POST)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not admin", async () => {
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { POST } = await import("@/app/api/upload/route");
    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file uploaded", async () => {
    (isAdmin as any).mockResolvedValue({ success: true });
    const formData = new FormData();
    const { POST } = await import("@/app/api/upload/route");
    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════
// User Settings
// ═══════════════════════════════════════
describe("API: /api/user/settings (PATCH)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 410 because the legacy endpoint is disabled", async () => {
    const { PATCH } = await import("@/app/api/user/settings/route");
    const res = await PATCH();
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.message).toContain("disabled");
  });
});

// ═══════════════════════════════════════
// Topup
// ═══════════════════════════════════════
describe("API: /api/topup (POST)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 400 when no proof image", async () => {
    const { POST } = await import("@/app/api/topup/route");
    const req = new NextRequest("http://localhost/api/topup", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);
    const { POST } = await import("@/app/api/topup/route");
    const req = new NextRequest("http://localhost/api/topup", {
      method: "POST",
      body: JSON.stringify({ proofImage: "data:image/jpeg;base64,/9j/test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 413 when proof image is too large", async () => {
    const { POST } = await import("@/app/api/topup/route");
    const largeBase64 = "A".repeat((5 * 1024 * 1024 * 4) / 3 + 8);
    const req = new NextRequest("http://localhost/api/topup", {
      method: "POST",
      body: JSON.stringify({ proofImage: `data:image/jpeg;base64,${largeBase64}` }),
    });
    const res = await POST(req);
    expect(res.status).toBe(413);
  });
});
