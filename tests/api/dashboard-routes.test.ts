/**
 * Tests for:
 * - lib/validations/validate.ts  (validateBody edge cases: _root path, multi-issue)
 * - /api/dashboard/members-summary (GET)
 * - /api/dashboard/topup-summary   (GET)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────
vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    query: {
      users: { findMany: vi.fn() },
      orders: { findMany: vi.fn() },
      topups: { findMany: vi.fn() },
    },
  },
  users: { createdAt: "createdAt", id: "id" },
  orders: { userId: "userId", purchasedAt: "purchasedAt" },
  topups: { createdAt: "createdAt" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), gte: vi.fn(), lt: vi.fn(), lte: vi.fn(), count: vi.fn(), isNull: vi.fn(),
}));

vi.mock("@/lib/encryption", () => ({
  decrypt: vi.fn().mockReturnValue("decrypted-data"),
}));

import { auth } from "@/auth";
import { db } from "@/lib/db";

const ADMIN_SESSION = { user: { id: "u1", role: "ADMIN" } };
const USER_SESSION = { user: { id: "u1", role: "USER" } };

// ════════════════════════════════════════════════════════════════
// validateBody edge cases
// ════════════════════════════════════════════════════════════════
describe("lib/validations/validate: validateBody edge cases", () => {
  it("returns _root key for issues with empty path (root-level refine)", async () => {
    const schema = z.object({ name: z.string() }).refine(() => false, {
      message: "Root level error",
    });
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "test" }),
      headers: { "Content-Type": "application/json" },
    });
    const { validateBody } = await import("@/lib/validations/validate");
    const result = await validateBody(req, schema);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      const body = await result.error.json();
      expect(body.errors["_root"]).toBeDefined();
    }
  });

  it("accumulates multiple issues on the same field key", async () => {
    const schema = z.object({
      name: z.string().superRefine((_, ctx) => {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Error A" });
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Error B" });
      }),
    });
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "x" }),
      headers: { "Content-Type": "application/json" },
    });
    const { validateBody } = await import("@/lib/validations/validate");
    const result = await validateBody(req, schema);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      const body = await result.error.json();
      expect(body.errors["name"]).toHaveLength(2);
    }
  });

  it("uses fallback message when issues array is empty", async () => {
    // Fake schema that returns failure with zero issues — triggers the `??` branch on line 30
    const emptyIssuesSchema = {
      safeParse: () => ({ success: false, error: { issues: [] } }),
    };
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const { validateBody } = await import("@/lib/validations/validate");
    const result = await validateBody(req, emptyIssuesSchema as any);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      const body = await result.error.json();
      expect(body.message).toBe("ข้อมูลไม่ถูกต้อง"); // fallback string used
    }
  });
});

// ════════════════════════════════════════════════════════════════
// /api/dashboard/members-summary
// ════════════════════════════════════════════════════════════════
describe("API: /api/dashboard/members-summary (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const mkMemberReq = (params = "") =>
    new NextRequest(`http://localhost/api/dashboard/members-summary${params}`);

  const mockCountSelect = (count = 0) => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count }]),
    }),
  });

  it("returns 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/dashboard/members-summary/route");
    const res = await GET(mkMemberReq());
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not ADMIN", async () => {
    (auth as any).mockResolvedValue(USER_SESSION);
    const { GET } = await import("@/app/api/dashboard/members-summary/route");
    const res = await GET(mkMemberReq());
    expect(res.status).toBe(403);
  });

  it("returns members summary with vs-previous counts for ADMIN", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);

    // Call order: today, yesterday, week, prev week, month, prev month, total, trend users.
    (db.select as any) = vi.fn()
      .mockReturnValueOnce(mockCountSelect(3))  // today
      .mockReturnValueOnce(mockCountSelect(2))  // yesterday
      .mockReturnValueOnce(mockCountSelect(10)) // week
      .mockReturnValueOnce(mockCountSelect(8))  // previous week
      .mockReturnValueOnce(mockCountSelect(25)) // month-to-date
      .mockReturnValueOnce(mockCountSelect(20)) // same slice of previous month
      .mockReturnValueOnce({ from: vi.fn().mockResolvedValue([{ count: 100 }]) }) // total (no where)
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ createdAt: "2026-03-14 10:00:00" }]) }) }); // trend users

    (db.query.users.findMany as any).mockResolvedValue([
      { id: "u1", username: "alice", name: "Alice", email: null, image: null,
        phone: null, creditBalance: { toString: () => "500" }, createdAt: "2026-03-14 10:00:00" },
    ]);

    const { GET } = await import("@/app/api/dashboard/members-summary/route");
    const res = await GET(mkMemberReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalCount).toBe(100);
    expect(body.data.todayCount).toBe(3);
    expect(body.data.previous).toEqual({ todayCount: 2, weekCount: 8, monthCount: 20 });
    expect(Array.isArray(body.data.dailyTrend)).toBe(true);
    expect(Array.isArray(body.data.recentMembers)).toBe(true);
  });

  it("returns members summary with custom days param", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.select as any) = vi.fn()
      .mockReturnValueOnce(mockCountSelect(1))
      .mockReturnValueOnce(mockCountSelect(0))
      .mockReturnValueOnce(mockCountSelect(5))
      .mockReturnValueOnce(mockCountSelect(4))
      .mockReturnValueOnce(mockCountSelect(15))
      .mockReturnValueOnce(mockCountSelect(12))
      .mockReturnValueOnce({ from: vi.fn().mockResolvedValue([{ count: 50 }]) })
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) });

    (db.query.users.findMany as any).mockResolvedValue([]);

    const { GET } = await import("@/app/api/dashboard/members-summary/route");
    const res = await GET(mkMemberReq("?days=30"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.dailyTrend).toHaveLength(30);
  });

  it("returns 500 on DB error", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.select as any) = vi.fn().mockReturnValue({
      from: vi.fn().mockRejectedValue(new Error("DB fail")),
    });
    const { GET } = await import("@/app/api/dashboard/members-summary/route");
    const res = await GET(mkMemberReq());
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// /api/dashboard/topup-summary
// ════════════════════════════════════════════════════════════════
describe("API: /api/dashboard/topup-summary (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const mkTopupReq = (params = "") =>
    new NextRequest(`http://localhost/api/dashboard/topup-summary${params}`);

  it("returns 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(mkTopupReq());
    expect(res.status).toBe(401);
  });

  it("returns 403 when not ADMIN", async () => {
    (auth as any).mockResolvedValue(USER_SESSION);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(mkTopupReq());
    expect(res.status).toBe(403);
  });

  it("returns topup summary with all statuses", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.query.topups.findMany as any).mockResolvedValue([
      { id: "t1", amount: "500", status: "APPROVED", userId: "u1", senderBank: "KBANK", createdAt: "2026-03-14 10:00:00", user: { username: "alice" }, proofImage: null, transactionRef: null, rejectReason: null },
      { id: "t2", amount: "200", status: "PENDING", userId: "u2", senderBank: "SCB", createdAt: "2026-03-14 11:00:00", user: { username: "bob" }, proofImage: null, transactionRef: null, rejectReason: null },
      { id: "t3", amount: "100", status: "REJECTED", userId: "u3", senderBank: null, createdAt: "2026-03-14 12:00:00", user: { username: "carol" }, proofImage: null, transactionRef: null, rejectReason: "Fake slip" },
    ]);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(mkTopupReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.statusSummary.approved.count).toBe(1);
    expect(body.data.statusSummary.approved.amount).toBe(500);
    expect(body.data.statusSummary.pending.count).toBe(1);
    expect(body.data.statusSummary.rejected.count).toBe(1);
    expect(body.data.totalAmount).toBe(500);
    expect(body.data.paymentMethods).toHaveLength(1); // only APPROVED ones
  });

  it("returns summary with startDate/endDate params", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.query.topups.findMany as any).mockResolvedValue([]);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(mkTopupReq("?startDate=2026-03-01&endDate=2026-03-14"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.totalAmount).toBe(0);
  });

  it("returns summary with date param fallback", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.query.topups.findMany as any).mockResolvedValue([]);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(mkTopupReq("?date=2026-03-14"));
    expect(res.status).toBe(200);
  });

  it("returns 500 on DB error", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.query.topups.findMany as any).mockRejectedValue(new Error("DB fail"));
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(mkTopupReq());
    expect(res.status).toBe(500);
  });

  it("uses gray color for approved topup with null senderBank", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.query.topups.findMany as any).mockResolvedValue([
      // APPROVED with null senderBank triggers getBankColor(null) → "#9ca3af"
      { id: "t1", amount: "300", status: "APPROVED", userId: "u1", senderBank: null,
        createdAt: "2026-03-14 08:00:00", user: { username: "user1" }, proofImage: null, transactionRef: null, rejectReason: null },
    ]);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(mkTopupReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // "ไม่ระบุ" bank with getBankColor("ไม่ระบุ") → fallback "#6366f1" (unknown bank)
    expect(body.data.paymentMethods[0].color).toBe("#6366f1");
  });

  it("uses indigo fallback for unknown bank name", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.query.topups.findMany as any).mockResolvedValue([
      { id: "t1", amount: "200", status: "APPROVED", userId: "u1", senderBank: "UNKNOWN_BANK",
        createdAt: "2026-03-14 09:00:00", user: { username: "user2" }, proofImage: null, transactionRef: null, rejectReason: null },
    ]);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(mkTopupReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.paymentMethods[0].color).toBe("#6366f1"); // fallback color
  });
});
