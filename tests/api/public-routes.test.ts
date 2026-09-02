/**
 * Batch tests for public API routes (read-only GET endpoints + session)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      newsArticles: { findMany: vi.fn().mockResolvedValue([{ id: "1", title: "News" }]) },
      navItems: { findMany: vi.fn().mockResolvedValue([{ id: "1", label: "Home", href: "/" }]) },
      footerWidgetSettings: { findFirst: vi.fn() },
      footerLinks: { findMany: vi.fn().mockResolvedValue([]) },
      announcementPopups: { findMany: vi.fn().mockResolvedValue([]) },
    },
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
  },
  newsArticles: { isActive: "isActive", sortOrder: "sortOrder", createdAt: "createdAt" },
  navItems: { isActive: "isActive", sortOrder: "sortOrder" },
  footerLinks: { isActive: "isActive", sortOrder: "sortOrder" },
  announcementPopups: { id: "id", title: "title", imageUrl: "imageUrl", linkUrl: "linkUrl", dismissOption: "dismissOption", isActive: "isActive", sortOrder: "sortOrder", createdAt: "createdAt" },
  products: { id: "id", name: "name", price: "price", discountPrice: "discountPrice", imageUrl: "imageUrl", category: "category", isSold: "isSold" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
  isNotNull: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
}));

vi.mock("@/lib/cache", () => ({
  cacheOrFetch: vi.fn((_key: string, fn: () => Promise<any>) => fn()),
  CACHE_KEYS: { NEWS_ARTICLES: "news", SALE_PRODUCTS: "sale", ANNOUNCEMENT_POPUPS: "popups" },
  CACHE_TTL: { MEDIUM: 900 },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

import { db } from "@/lib/db";

// ═══════════════════════════════════════════════════════════
// Public Sale Products
// ═══════════════════════════════════════════════════════════
describe("API: /api/sale-products (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns sale products", async () => {
    const { GET } = await import("@/app/api/sale-products/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// Public Popups
// ═══════════════════════════════════════════════════════════
describe("API: /api/popups (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns active popups", async () => {
    const { GET } = await import("@/app/api/popups/route");
    const res = await GET();
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════
// Session API
// ═══════════════════════════════════════════════════════════
describe("API: /api/session", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("POST", () => {
    it("returns 410 because the legacy endpoint is disabled", async () => {
      const { POST } = await import("@/app/api/session/route");
      const res = await POST();
      expect(res.status).toBe(410);
      const body = await res.json();
      expect(body.message).toContain("disabled");
    });
  });

  describe("DELETE", () => {
    it("returns 410 because the legacy endpoint is disabled", async () => {
      const { DELETE } = await import("@/app/api/session/route");
      const res = await DELETE();
      expect(res.status).toBe(410);
      const body = await res.json();
      expect(body.message).toContain("disabled");
    });
  });
});
