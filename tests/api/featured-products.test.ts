import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "1", name: "Game 1", price: "100", imageUrl: null, category: "Games", isSold: false },
              { id: "2", name: "Game 2", price: "200", imageUrl: null, category: "Games", isSold: false },
            ]),
          }),
        }),
      }),
    }),
  },
  products: {
    id: "id",
    name: "name",
    price: "price",
    imageUrl: "imageUrl",
    category: "category",
    isSold: "isSold",
    isFeatured: "isFeatured",
    sortOrder: "sortOrder",
    createdAt: "createdAt",
  },
}));

vi.mock("@/lib/cache", () => ({
  cacheOrFetch: vi.fn((_key: string, fn: () => Promise<any>) => fn()),
  CACHE_KEYS: { FEATURED_PRODUCTS: "featured-products" },
  CACHE_TTL: { MEDIUM: 300 },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
}));

describe("API: /api/featured-products (GET)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns featured products", async () => {
    const { GET } = await import("@/app/api/featured-products/route");
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].name).toBe("Game 1");
  });
});
