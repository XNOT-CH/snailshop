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
 * Dev and production share one Upstash instance. Without a namespace the two
 * environments write the same slot, and whichever wrote last serves both — which
 * is how dev seed rows once rendered on the live site. These pin the separation.
 */
async function loadCacheAs(nodeEnv: string) {
    vi.stubEnv("NODE_ENV", nodeEnv);
    vi.resetModules();
    return import("@/lib/cache");
}

describe("cache key namespace", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it("reads a different Redis key in production than in development", async () => {
        const dev = await loadCacheAs("development");
        await dev.getFromCache(dev.CACHE_KEYS.SITE_SETTINGS);
        const devKey = redisMock.get.mock.calls[0]?.[0];

        redisMock.get.mockClear();

        const prod = await loadCacheAs("production");
        await prod.getFromCache(prod.CACHE_KEYS.SITE_SETTINGS);
        const prodKey = redisMock.get.mock.calls[0]?.[0];

        expect(devKey).toBe("dev:site_settings");
        expect(prodKey).toBe("prod:site_settings");
        expect(devKey).not.toBe(prodKey);
    });

    it("writes under the namespace too, so a warm read cannot cross over", async () => {
        const dev = await loadCacheAs("development");
        await dev.setToCache(dev.CACHE_KEYS.PRODUCTS_LIST, { any: "value" }, 60);

        expect(redisMock.set).toHaveBeenCalledWith("dev:products_list", { any: "value" }, { ex: 60 });
    });

    it("invalidates the namespaced key, not the bare one", async () => {
        const prod = await loadCacheAs("production");
        await prod.invalidateProductCaches();

        const deleted = redisMock.del.mock.calls.map((call) => call[0]);
        expect(deleted).toContain("prod:featured_products_v2");
        expect(deleted.every((key: string) => key.startsWith("prod:"))).toBe(true);
    });
});
