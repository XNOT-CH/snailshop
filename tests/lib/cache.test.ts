import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./redis", () => ({
  redis: null,
  isRedisAvailable: vi.fn(() => false),
}));

describe("lib/cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports CACHE_KEYS and CACHE_TTL constants", async () => {
    const { CACHE_KEYS, CACHE_TTL } = await import("@/lib/cache");
    expect(CACHE_KEYS.FEATURED_PRODUCTS).toBe("featured_products_v2");
    expect(CACHE_TTL.SHORT).toBe(300);
    expect(CACHE_TTL.MEDIUM).toBe(900);
    expect(CACHE_TTL.LONG).toBe(3600);
  });

  describe("without Redis", () => {
    it("getFromCache returns null when redis not available", async () => {
      const { getFromCache } = await import("@/lib/cache");
      const result = await getFromCache("test-key");
      expect(result).toBeNull();
    });

    it("setToCache returns false when redis not available", async () => {
      const { setToCache } = await import("@/lib/cache");
      const result = await setToCache("test-key", { data: "test" });
      expect(result).toBe(false);
    });

    it("deleteFromCache returns false when redis not available", async () => {
      const { deleteFromCache } = await import("@/lib/cache");
      const result = await deleteFromCache("test-key");
      expect(result).toBe(false);
    });

    it("invalidateCache returns false when redis not available", async () => {
      const { invalidateCache } = await import("@/lib/cache");
      const result = await invalidateCache(["key1", "key2"]);
      expect(result).toBe(false);
    });

    it("cacheOrFetch calls fetchFn when cache miss", async () => {
      const { cacheOrFetch } = await import("@/lib/cache");
      const fetchFn = vi.fn().mockResolvedValue([{ id: 1 }]);
      const result = await cacheOrFetch("test-key", fetchFn);
      expect(fetchFn).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1 }]);
    });

    it("invalidateProductCaches runs without error", async () => {
      const { invalidateProductCaches } = await import("@/lib/cache");
      await expect(invalidateProductCaches()).resolves.not.toThrow();
    });

    it("invalidateNewsCaches runs without error", async () => {
      const { invalidateNewsCaches } = await import("@/lib/cache");
      await expect(invalidateNewsCaches()).resolves.not.toThrow();
    });

    it("invalidateSettingsCaches runs without error", async () => {
      const { invalidateSettingsCaches } = await import("@/lib/cache");
      await expect(invalidateSettingsCaches()).resolves.not.toThrow();
    });

    it("invalidatePopupCaches runs without error", async () => {
      const { invalidatePopupCaches } = await import("@/lib/cache");
      await expect(invalidatePopupCaches()).resolves.not.toThrow();
    });
  });
});
