/**
 * Comprehensive tests for /api/dashboard/topup-summary
 * Covers: auth checks, parseDateRange, getBankColor,
 *         all status processing (APPROVED/PENDING/REJECTED), mixed data
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      topups: { findMany: vi.fn().mockResolvedValue([]) },
    },
  },
}));

import { auth } from "@/auth";
import { db } from "@/lib/db";

const req = (url = "http://localhost/api/dashboard/topup-summary") =>
  new NextRequest(url);

const ADMIN_SESSION = { user: { id: "u1", role: "ADMIN" } };

const mkTopup = (override: Partial<{
  id: string; status: string; amount: string; userId: string;
  senderBank: string | null; proofImage: string | null;
  transactionRef: string | null; rejectReason: string | null;
  createdAt: string;
}> = {}) => ({
  id: "t1", status: "APPROVED", amount: "500", userId: "u1",
  senderBank: "KBANK", proofImage: null, transactionRef: null, rejectReason: null,
  createdAt: "2026-03-14 10:00:00",
  user: { username: "testuser" },
  ...override,
});

describe("API: /api/dashboard/topup-summary (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ── auth ────────────────────────────────────────────────────────────────
  it("returns 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1", role: "USER" } });
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(req());
    expect(res.status).toBe(403);
  });

  // ── empty data ──────────────────────────────────────────────────────────
  it("returns success with empty topup list", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.query.topups.findMany as any).mockResolvedValue([]);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalAmount).toBe(0);
    expect(body.data.totalTransactions).toBe(0);
    expect(body.data.allTransactions).toBe(0);
  });

  // ── APPROVED topups ─────────────────────────────────────────────────────
  it("calculates correct totals for APPROVED topups", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.query.topups.findMany as any).mockResolvedValue([
      mkTopup({ amount: "500", senderBank: "KBANK" }),
      mkTopup({ id: "t2", amount: "300", senderBank: "SCB", userId: "u2" }),
    ]);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(req());
    const body = await res.json();
    expect(body.data.totalAmount).toBe(800);
    expect(body.data.totalTransactions).toBe(2);
    expect(body.data.totalPeople).toBe(2);
  });

  it("groups payment methods correctly", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.query.topups.findMany as any).mockResolvedValue([
      mkTopup({ senderBank: "KBANK", amount: "500" }),
      mkTopup({ id: "t2", senderBank: "KBANK", amount: "200" }),
      mkTopup({ id: "t3", senderBank: "SCB", amount: "300" }),
    ]);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(req());
    const body = await res.json();
    const kbank = body.data.paymentMethods.find((m: any) => m.name === "KBANK");
    expect(kbank?.count).toBe(2);
    expect(kbank?.amount).toBe(700);
    expect(kbank?.color).toBe("#00A651"); // KBANK green
  });

  it("maps bank colors for known banks", async () => {
    const banks = ["SCB", "KTB", "BBL", "BAY", "TMB", "TTB", "GSB", "TRUEWALLET", "PROMPTPAY"];
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    for (const bank of banks) {
      (db.query.topups.findMany as any).mockResolvedValue([
        mkTopup({ senderBank: bank }),
      ]);
      const { GET } = await import("@/app/api/dashboard/topup-summary/route");
      const res = await GET(req());
      const body = await res.json();
      const method = body.data.paymentMethods.find((m: any) => m.name === bank);
      expect(method?.color).not.toBe("#9ca3af"); // not the null/unknown color
      vi.clearAllMocks();
      (auth as any).mockResolvedValue(ADMIN_SESSION);
    }
  });

  it("uses fallback color for unknown bank", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.query.topups.findMany as any).mockResolvedValue([
      mkTopup({ senderBank: "UNKNOWNBANK" }),
    ]);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(req());
    const body = await res.json();
    const method = body.data.paymentMethods.find((m: any) => m.name === "UNKNOWNBANK");
    expect(method?.color).toBe("#6366f1");
  });

  it("uses grey color for null senderBank", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.query.topups.findMany as any).mockResolvedValue([
      mkTopup({ senderBank: null }),
    ]);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(req());
    const body = await res.json();
    const method = body.data.paymentMethods.find((m: any) => m.name === "ไม่ระบุ");
    // null senderBank → becomes string "ไม่ระบุ" in route, not found in BANK_COLORS → fallback indigo
    expect(method?.color).toBe("#6366f1");
  });

  // ── PENDING / REJECTED ──────────────────────────────────────────────────
  it("counts PENDING topups in statusSummary", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.query.topups.findMany as any).mockResolvedValue([
      mkTopup({ status: "PENDING", amount: "100" }),
      mkTopup({ id: "t2", status: "PENDING", amount: "200" }),
    ]);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(req());
    const body = await res.json();
    expect(body.data.statusSummary.pending.count).toBe(2);
    expect(body.data.statusSummary.pending.amount).toBe(300);
    expect(body.data.totalTransactions).toBe(0); // PENDING not in approved
  });

  it("counts REJECTED topups in statusSummary", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.query.topups.findMany as any).mockResolvedValue([
      mkTopup({ status: "REJECTED", amount: "150", rejectReason: "Invalid" }),
    ]);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(req());
    const body = await res.json();
    expect(body.data.statusSummary.rejected.count).toBe(1);
    expect(body.data.statusSummary.rejected.amount).toBe(150);
  });

  it("handles mixed status topups correctly", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.query.topups.findMany as any).mockResolvedValue([
      mkTopup({ status: "APPROVED", amount: "500" }),
      mkTopup({ id: "t2", status: "PENDING", amount: "200" }),
      mkTopup({ id: "t3", status: "REJECTED", amount: "100" }),
    ]);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(req());
    const body = await res.json();
    expect(body.data.allTransactions).toBe(3);
    expect(body.data.statusSummary.approved.count).toBe(1);
    expect(body.data.statusSummary.pending.count).toBe(1);
    expect(body.data.statusSummary.rejected.count).toBe(1);
    expect(body.data.hourlyData).toHaveLength(24); // always 24 hours
  });

  it("returns admin slip image route instead of raw file path", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.query.topups.findMany as any).mockResolvedValue([
      mkTopup({ id: "t-slip", proofImage: "/private/slips/example.webp" }),
    ]);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(req());
    const body = await res.json();
    expect(body.data.records[0].proofImage).toBe("/api/admin/slips/t-slip/image");
  });

  // ── date range filter ───────────────────────────────────────────────────
  it("accepts startDate/endDate query params", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.query.topups.findMany as any).mockResolvedValue([]);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(req("http://localhost/api/dashboard/topup-summary?startDate=2026-03-01&endDate=2026-03-14"));
    expect(res.status).toBe(200);
  });

  it("accepts single date query param", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.query.topups.findMany as any).mockResolvedValue([]);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(req("http://localhost/api/dashboard/topup-summary?date=2026-03-13"));
    expect(res.status).toBe(200);
  });

  it("calculates averagePerTransaction correctly", async () => {
    (auth as any).mockResolvedValue(ADMIN_SESSION);
    (db.query.topups.findMany as any).mockResolvedValue([
      mkTopup({ amount: "300" }),
      mkTopup({ id: "t2", amount: "700" }),
    ]);
    const { GET } = await import("@/app/api/dashboard/topup-summary/route");
    const res = await GET(req());
    const body = await res.json();
    expect(body.data.averagePerTransaction).toBe(500); // (300+700)/2 = 500
  });
});
