/**
 * Targeted success-path tests for /api/admin/news
 * Uses proper validateBody mock to cover POST business logic
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ requirePermission: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) }),
    query: {
      newsArticles: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue({ id: "n1", title: "Test News" }),
      },
    },
  },
  newsArticles: { id: "id", isActive: "isActive" },
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), asc: vi.fn(), desc: vi.fn() }));
vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn(), AUDIT_ACTIONS: { NEWS_CREATE: "NEWS_CREATE" },
}));
vi.mock("@/lib/cache", () => ({ invalidateNewsCaches: vi.fn() }));
vi.mock("@/lib/utils/date", () => ({ mysqlNow: vi.fn(() => "2026-03-14 00:00:00") }));
vi.mock("@/lib/validations/content", () => ({ newsItemSchema: {} }));
vi.mock("@/lib/validations/validate", () => ({
  validateBody: vi.fn(),
}));

import { db } from "@/lib/db";
import { validateBody } from "@/lib/validations/validate";
import { requirePermission } from "@/lib/auth";

type NextRequestInit = ConstructorParameters<typeof NextRequest>[1];

const mkReq = (url = "http://localhost/api/admin/news", opts?: NextRequestInit) =>
  new NextRequest(url, opts);

const ADMIN_OK = { success: true };
const UNAUTH = { success: false, error: "Unauthorized" };

describe("API: /api/admin/news", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ── GET ──────────────────────────────────────────────────────────────────
  it("GET returns 401 when not admin", async () => {
    (requirePermission as any).mockResolvedValue(UNAUTH);
    const { GET } = await import("@/app/api/admin/news/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(401);
  });

  it("GET returns all articles (no filter)", async () => {
    (requirePermission as any).mockResolvedValue(ADMIN_OK);
    (db.query.newsArticles.findMany as any).mockResolvedValue([
      { id: "n1", title: "News 1", isActive: true },
      { id: "n2", title: "News 2", isActive: false },
    ]);
    const { GET } = await import("@/app/api/admin/news/route");
    const res = await GET(mkReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it("GET filters active-only when ?active=true", async () => {
    (requirePermission as any).mockResolvedValue(ADMIN_OK);
    (db.query.newsArticles.findMany as any).mockResolvedValue([
      { id: "n1", title: "Active News", isActive: true },
    ]);
    const { GET } = await import("@/app/api/admin/news/route");
    const res = await GET(mkReq("http://localhost/api/admin/news?active=true"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  // ── POST ─────────────────────────────────────────────────────────────────
  it("POST returns 401 when not admin", async () => {
    (requirePermission as any).mockResolvedValue(UNAUTH);
    const { POST } = await import("@/app/api/admin/news/route");
    const res = await POST(mkReq("http://localhost/api/admin/news", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("POST returns validation error when body invalid", async () => {
    (requirePermission as any).mockResolvedValue(ADMIN_OK);
    const errorRes = new Response(JSON.stringify({ message: "invalid" }), { status: 400 });
    (validateBody as any).mockResolvedValue({ error: errorRes });
    const { POST } = await import("@/app/api/admin/news/route");
    const res = await POST(mkReq("http://localhost", {
      method: "POST",
      body: JSON.stringify({}),
    }));
    expect(res.status).toBe(400);
  });

  it("POST creates news article and returns 201", async () => {
    (requirePermission as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({
      data: {
        title: "Big Sale!", description: "50% OFF everything",
        imageUrl: "/img.jpg", link: "/shop", sortOrder: 1, isActive: true,
      },
    });
    (db.query.newsArticles.findFirst as any).mockResolvedValue({
      id: "n-new", title: "Big Sale!",
    });
    const { POST } = await import("@/app/api/admin/news/route");
    const res = await POST(mkReq("http://localhost", {
      method: "POST",
      body: JSON.stringify({ title: "Big Sale!", sortOrder: 1, isActive: true }),
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("Big Sale!");
  });

  it("POST handles null imageUrl and link", async () => {
    (requirePermission as any).mockResolvedValue(ADMIN_OK);
    (validateBody as any).mockResolvedValue({
      data: { title: "Plain News", description: "News without link", imageUrl: "", link: "", sortOrder: 0, isActive: false },
    });
    (db.query.newsArticles.findFirst as any).mockResolvedValue({ id: "n2", title: "Plain News" });
    const { POST } = await import("@/app/api/admin/news/route");
    const res = await POST(mkReq("http://localhost", { method: "POST", body: JSON.stringify({}) }));
    expect(res.status).toBe(201);
  });
});
