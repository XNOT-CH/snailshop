/**
 * Tests for utility libraries and final low-coverage routes:
 * - /api/gacha/recent     (GET)
 * - lib/cache.ts          (cacheOrFetch, getFromCache, setToCache, invalidate*)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ════════════════════════════════════════════════════════════════
// /api/gacha/recent
// ════════════════════════════════════════════════════════════════
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      gachaRollLogs: { findMany: vi.fn() },
    },
  },
}));

import { db } from "@/lib/db";

describe("API: /api/gacha/recent (GET)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns recent winners with all fields", async () => {
    (db.query.gachaRollLogs.findMany as any).mockResolvedValue([
      { id: "l1", tier: "GOLD", rewardName: "Gold Badge", rewardImageUrl: "/gold.webp",
        createdAt: "2026-03-14 10:00:00", user: { username: "alice" }, product: null },
      { id: "l2", tier: "SILVER", rewardName: null, rewardImageUrl: null,
        createdAt: "2026-03-14 09:00:00", user: null, // no user
        product: { name: "ROV Account", imageUrl: "/rov.webp" } }, // uses product name
    ]);
    const { GET } = await import("@/app/api/gacha/recent/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].rewardName).toBe("Gold Badge");
    expect(body.data[1].rewardName).toBe("ROV Account"); // from product
    expect(body.data[1].username).toBe("ผู้ใช้ทั่วไป"); // fallback
  });

  it("uses fallback for null rewardName and null product", async () => {
    (db.query.gachaRollLogs.findMany as any).mockResolvedValue([
      { id: "l1", tier: "BRONZE", rewardName: null, rewardImageUrl: null,
        createdAt: "2026-03-14", user: { username: "bob" }, product: null },
    ]);
    const { GET } = await import("@/app/api/gacha/recent/route");
    const res = await GET();
    const body = await res.json();
    expect(body.data[0].rewardName).toBe("รางวัล"); // final fallback
    expect(body.data[0].rewardImageUrl).toBeNull();
  });

  it("returns 500 on DB error", async () => {
    (db.query.gachaRollLogs.findMany as any).mockRejectedValue(new Error("DB fail"));
    const { GET } = await import("@/app/api/gacha/recent/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════
// lib/cache.ts
// ════════════════════════════════════════════════════════════════
vi.mock("@/lib/redis", () => ({
  isRedisAvailable: vi.fn().mockReturnValue(true),
  redis: {
    get: vi.fn(),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
  },
}));

describe("lib/cache", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("getFromCache returns null when redis unavailable", async () => {
    const { isRedisAvailable } = await import("@/lib/redis");
    (isRedisAvailable as any).mockReturnValueOnce(false);
    const { getFromCache } = await import("@/lib/cache");
    const result = await getFromCache("test_key");
    expect(result).toBeNull();
  });

  it("getFromCache returns cached value on hit", async () => {
    const { redis } = await import("@/lib/redis");
    (redis!.get as any).mockResolvedValueOnce({ id: "cached" });
    const { getFromCache } = await import("@/lib/cache");
    const result = await getFromCache("test_key");
    expect(result).toEqual({ id: "cached" });
  });

  it("getFromCache returns null on cache miss", async () => {
    const { redis } = await import("@/lib/redis");
    (redis!.get as any).mockResolvedValueOnce(null);
    const { getFromCache } = await import("@/lib/cache");
    const result = await getFromCache("test_key");
    expect(result).toBeNull();
  });

  it("getFromCache returns null on redis error", async () => {
    const { redis } = await import("@/lib/redis");
    (redis!.get as any).mockRejectedValueOnce(new Error("Redis fail"));
    const { getFromCache } = await import("@/lib/cache");
    const result = await getFromCache("test_key");
    expect(result).toBeNull();
  });

  it("setToCache returns false when redis unavailable", async () => {
    const { isRedisAvailable } = await import("@/lib/redis");
    (isRedisAvailable as any).mockReturnValueOnce(false);
    const { setToCache } = await import("@/lib/cache");
    const result = await setToCache("test_key", { data: "value" });
    expect(result).toBe(false);
  });

  it("setToCache stores data with TTL", async () => {
    const { setToCache } = await import("@/lib/cache");
    const result = await setToCache("test_key", { data: "value" }, 300);
    expect(result).toBe(true);
  });

  it("setToCache returns false on redis error", async () => {
    const { redis } = await import("@/lib/redis");
    (redis!.set as any).mockRejectedValueOnce(new Error("Redis fail"));
    const { setToCache } = await import("@/lib/cache");
    const result = await setToCache("test_key", { data: "value" });
    expect(result).toBe(false);
  });

  it("deleteFromCache returns false when redis unavailable", async () => {
    const { isRedisAvailable } = await import("@/lib/redis");
    (isRedisAvailable as any).mockReturnValueOnce(false);
    const { deleteFromCache } = await import("@/lib/cache");
    const result = await deleteFromCache("test_key");
    expect(result).toBe(false);
  });

  it("deleteFromCache removes key", async () => {
    const { deleteFromCache } = await import("@/lib/cache");
    const result = await deleteFromCache("test_key");
    expect(result).toBe(true);
  });

  it("deleteFromCache returns false on redis error", async () => {
    const { redis } = await import("@/lib/redis");
    (redis!.del as any).mockRejectedValueOnce(new Error("Redis fail"));
    const { deleteFromCache } = await import("@/lib/cache");
    const result = await deleteFromCache("test_key");
    expect(result).toBe(false);
  });

  it("invalidateCache deletes multiple keys", async () => {
    const { invalidateCache } = await import("@/lib/cache");
    const result = await invalidateCache(["key1", "key2", "key3"]);
    expect(result).toBe(true);
  });

  it("invalidateCache returns false when redis unavailable", async () => {
    const { isRedisAvailable } = await import("@/lib/redis");
    (isRedisAvailable as any).mockReturnValueOnce(false);
    const { invalidateCache } = await import("@/lib/cache");
    const result = await invalidateCache(["key1"]);
    expect(result).toBe(false);
  });

  it("invalidateCache returns false on error", async () => {
    const { redis } = await import("@/lib/redis");
    (redis!.del as any).mockRejectedValueOnce(new Error("Redis fail"));
    const { invalidateCache } = await import("@/lib/cache");
    const result = await invalidateCache(["key1"]);
    expect(result).toBe(false);
  });

  it("cacheOrFetch returns cached value when available", async () => {
    const { redis } = await import("@/lib/redis");
    (redis!.get as any).mockResolvedValueOnce({ id: "cached" });
    const { cacheOrFetch } = await import("@/lib/cache");
    const fetchFn = vi.fn().mockResolvedValue({ id: "fresh" });
    const result = await cacheOrFetch("test_key", fetchFn);
    expect(result).toEqual({ id: "cached" });
    expect(fetchFn).not.toHaveBeenCalled(); // did NOT fetch
  });

  it("cacheOrFetch fetches and caches when not cached", async () => {
    const { redis } = await import("@/lib/redis");
    (redis!.get as any).mockResolvedValueOnce(null); // cache miss
    const { cacheOrFetch } = await import("@/lib/cache");
    const fetchFn = vi.fn().mockResolvedValue({ id: "fresh" });
    const result = await cacheOrFetch("test_key", fetchFn, 60);
    expect(result).toEqual({ id: "fresh" });
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(redis!.set).toHaveBeenCalledWith("test_key", { id: "fresh" }, { ex: 60 });
  });

  it("cacheOrFetch waits for the cache write before resolving", async () => {
    const { redis } = await import("@/lib/redis");
    let resolveSet: ((value: string) => void) | undefined;

    (redis!.get as any).mockResolvedValueOnce(null);
    (redis!.set as any).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSet = resolve;
        })
    );

    const { cacheOrFetch } = await import("@/lib/cache");
    const fetchFn = vi.fn().mockResolvedValue({ id: "fresh" });
    let settled = false;

    const pending = cacheOrFetch("test_key", fetchFn, 60).then(() => {
      settled = true;
    });

    await vi.waitFor(() => {
      expect(redis!.set).toHaveBeenCalledTimes(1);
      expect(resolveSet).toBeTypeOf("function");
    });
    expect(settled).toBe(false);

    resolveSet?.("OK");
    await pending;
    expect(settled).toBe(true);
  });

  it("invalidateProductCaches invalidates product keys", async () => {
    const { invalidateProductCaches } = await import("@/lib/cache");
    await expect(invalidateProductCaches()).resolves.toBeUndefined();
  });

  it("invalidateNewsCaches invalidates news key", async () => {
    const { invalidateNewsCaches } = await import("@/lib/cache");
    await expect(invalidateNewsCaches()).resolves.toBeUndefined();
  });

  it("invalidateSettingsCaches invalidates settings key", async () => {
    const { invalidateSettingsCaches } = await import("@/lib/cache");
    await expect(invalidateSettingsCaches()).resolves.toBeUndefined();
  });

  it("invalidatePopupCaches invalidates popup key", async () => {
    const { invalidatePopupCaches } = await import("@/lib/cache");
    await expect(invalidatePopupCaches()).resolves.toBeUndefined();
  });
});
