import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { redisMock } = vi.hoisted(() => ({
    redisMock: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue("OK"),
        del: vi.fn().mockResolvedValue(1),
    },
}));

vi.mock("@/lib/redis", () => ({
    redis: redisMock,
    isRedisAvailable: () => true,
}));

/**
 * The in-process layer exists because Upstash is a network hop — 40ms measured
 * from the production container, against a local MySQL answering in about one.
 * The risk it introduces is staleness: if any write or invalidation path forgets
 * this layer, an admin edit stops being visible and nothing errors.
 */
async function freshCache() {
    vi.resetModules();
    return import("@/lib/cache");
}

describe("in-process cache layer", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        redisMock.get.mockResolvedValue(null);
    });

    afterEach(() => {
        vi.resetModules();
    });

    it("serves a second read without touching Redis", async () => {
        const cache = await freshCache();
        redisMock.get.mockResolvedValueOnce({ hello: "world" });

        const first = await cache.getFromCache(cache.CACHE_KEYS.SITE_SETTINGS);
        const second = await cache.getFromCache(cache.CACHE_KEYS.SITE_SETTINGS);

        expect(first).toEqual({ hello: "world" });
        expect(second).toEqual({ hello: "world" });
        expect(redisMock.get).toHaveBeenCalledTimes(1);
    });

    it("reads back a value it just wrote, with no Redis round trip", async () => {
        const cache = await freshCache();
        await cache.setToCache(cache.CACHE_KEYS.PRODUCTS_LIST, [{ id: "p1" }], 60);

        expect(await cache.getFromCache(cache.CACHE_KEYS.PRODUCTS_LIST)).toEqual([{ id: "p1" }]);
        expect(redisMock.get).not.toHaveBeenCalled();
    });

    it("stops serving a value once it is invalidated", async () => {
        // The failure this guards: an admin saves, Redis is cleared, and the
        // page keeps rendering the old value out of this process's memory.
        const cache = await freshCache();
        await cache.setToCache(cache.CACHE_KEYS.FEATURED_PRODUCTS, ["old"], 60);

        await cache.invalidateProductCaches();

        expect(await cache.getFromCache(cache.CACHE_KEYS.FEATURED_PRODUCTS)).toBeNull();
    });

    it("stops serving a value once it is deleted by key", async () => {
        const cache = await freshCache();
        await cache.setToCache(cache.CACHE_KEYS.NEWS_ARTICLES, ["old"], 60);

        await cache.deleteFromCache(cache.CACHE_KEYS.NEWS_ARTICLES);

        expect(await cache.getFromCache(cache.CACHE_KEYS.NEWS_ARTICLES)).toBeNull();
    });

    it("expires its copy, so a stale value cannot outlive the cap", async () => {
        vi.useFakeTimers();
        try {
            const cache = await freshCache();
            await cache.setToCache(cache.CACHE_KEYS.SALE_PRODUCTS, ["v1"], 3600);

            vi.advanceTimersByTime(31_000);

            expect(await cache.getFromCache(cache.CACHE_KEYS.SALE_PRODUCTS)).toBeNull();
            // Fell through to Redis rather than answering from memory.
            expect(redisMock.get).toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

    it("still caches in memory when Redis is not configured at all", async () => {
        vi.resetModules();
        vi.doMock("@/lib/redis", () => ({ redis: null, isRedisAvailable: () => false }));
        const cache = await import("@/lib/cache");

        await cache.setToCache(cache.CACHE_KEYS.HELP_ARTICLES, ["a"], 60);

        expect(await cache.getFromCache(cache.CACHE_KEYS.HELP_ARTICLES)).toEqual(["a"]);
        vi.doUnmock("@/lib/redis");
    });
});
