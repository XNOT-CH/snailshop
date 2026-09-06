import { redis, isRedisAvailable } from "./redis";

// Cache key prefixes
export const CACHE_KEYS = {
    FEATURED_PRODUCTS: "featured_products_v2",
    SALE_PRODUCTS: "sale_products",
    NEWS_ARTICLES: "news_articles",
    SITE_SETTINGS: "site_settings",
    HELP_ARTICLES: "help_articles",
    PRODUCTS_LIST: "products_list",
    ANNOUNCEMENT_POPUPS: "announcement_popups",
    NAV_ITEMS: "nav_items",
    FOOTER_LINKS: "footer_links",
    FOOTER_WIDGET: "footer_widget",
    PRODUCT_CATEGORIES: "product_categories",
    REGISTRATION_POLICIES: "registration_policies",
} as const;

// Default TTL values (in seconds)
export const CACHE_TTL = {
    SHORT: 60 * 5,        // 5 minutes - for frequently changing data
    MEDIUM: 60 * 15,      // 15 minutes - for products, news
    LONG: 60 * 60,        // 1 hour - for settings, help articles
    VERY_LONG: 60 * 60 * 24, // 24 hours - for rarely changing data
} as const;

// Dev and production point at the same Upstash instance, so an unprefixed key
// is one shared slot: whichever environment last wrote it serves both. On
// 2026-09-06 seed rows written to the dev database rendered on the live /terms
// because of exactly this. The namespace is derived from NODE_ENV rather than a
// new env var so no deployment can forget to set it.
//
// Applied inside the four accessors below, so callers keep passing plain
// CACHE_KEYS values and nothing else in the codebase has to know.
const CACHE_NAMESPACE = process.env.NODE_ENV === "production" ? "prod" : "dev";

function namespaced(key: string): string {
    return `${CACHE_NAMESPACE}:${key}`;
}

// ── In-process layer in front of Redis ────────────────────────────────────
//
// Upstash is a service on the internet, not a sidecar: measured from the
// production container its round trip is a median 40ms. A page that reads two
// cached values therefore spent ~80ms of its ~90ms waiting on the network,
// while the MySQL it was caching sat on the same host answering in about a
// millisecond and idling at 0.2% CPU. Throughput flattened at ~42 req/s from
// five concurrent users up, with the web container at under 10% CPU — requests
// were queueing behind a network wait, not behind any work.
//
// So the values are held here too. The site runs one Node process, which means
// this layer covers every request it serves.
//
// The TTL is capped well below the Redis one on purpose. Redis stays the shared
// source of truth, and every write and invalidation below clears this map
// first, so an admin edit is visible immediately in this process. A second
// replica would not see that clear, and the cap is what bounds how long it
// could serve a stale value — keep it short for that reason, not this one.
const MEMORY_TTL_CAP_MS = 30_000;

// CACHE_KEYS is a fixed list of 13, so this map cannot grow on its own. The cap
// is here only so that a future dynamic key cannot turn a long-lived server
// process into a leak.
const MEMORY_MAX_ENTRIES = 100;

const memory = new Map<string, { value: unknown; expiresAt: number }>();

function readMemory<T>(key: string): T | null {
    const hit = memory.get(key);
    if (!hit) return null;
    if (hit.expiresAt <= Date.now()) {
        memory.delete(key);
        return null;
    }
    return hit.value as T;
}

function writeMemory(key: string, value: unknown, ttlSeconds: number): void {
    if (memory.size >= MEMORY_MAX_ENTRIES && !memory.has(key)) {
        const oldest = memory.keys().next().value;
        if (oldest !== undefined) memory.delete(oldest);
    }
    memory.set(key, {
        value,
        expiresAt: Date.now() + Math.min(ttlSeconds * 1000, MEMORY_TTL_CAP_MS),
    });
}

/**
 * Get data from cache
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
    // Checked before the Redis guard: this layer is worth having even when
    // Redis is not configured at all.
    const local = readMemory<T>(key);
    if (local !== null) return local;

    if (!isRedisAvailable() || !redis) {
        return null;
    }

    try {
        const cached = await redis.get<T>(namespaced(key));
        if (cached) {
            // Hold it locally so the next reader does not pay the round trip.
            // CACHE_TTL.LONG is the ceiling; MEMORY_TTL_CAP_MS is what applies.
            writeMemory(key, cached, CACHE_TTL.LONG);
            console.log(`✅ Cache HIT: ${key}`);
            return cached;
        }
        console.log(`❌ Cache MISS: ${key}`);
        return null;
    } catch (error) {
        console.error(`Cache get error for ${key}:`, error);
        return null;
    }
}

/**
 * Set data to cache with TTL
 */
export async function setToCache<T>(
    key: string,
    data: T,
    ttlSeconds: number = CACHE_TTL.MEDIUM
): Promise<boolean> {
    writeMemory(key, data, ttlSeconds);

    if (!isRedisAvailable() || !redis) {
        return false;
    }

    try {
        await redis.set(namespaced(key), data, { ex: ttlSeconds });
        console.log(`💾 Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
        return true;
    } catch (error) {
        console.error(`Cache set error for ${key}:`, error);
        return false;
    }
}

/**
 * Delete a specific cache key
 */
export async function deleteFromCache(key: string): Promise<boolean> {
    memory.delete(key);

    if (!isRedisAvailable() || !redis) {
        return false;
    }

    try {
        await redis.del(namespaced(key));
        console.log(`🗑️ Cache DELETE: ${key}`);
        return true;
    } catch (error) {
        console.error(`Cache delete error for ${key}:`, error);
        return false;
    }
}

/**
 * Delete multiple cache keys by pattern
 */
export async function invalidateCache(keys: string[]): Promise<boolean> {
    // Cleared first and unconditionally. An admin edit has to be visible in
    // this process even if Redis is unreachable at that moment.
    for (const key of keys) memory.delete(key);

    if (!isRedisAvailable() || !redis) {
        return false;
    }

    try {
        for (const key of keys) {
            await redis.del(namespaced(key));
        }
        console.log(`🗑️ Cache INVALIDATED: ${keys.join(", ")}`);
        return true;
    } catch (error) {
        console.error("Cache invalidation error:", error);
        return false;
    }
}

/**
 * Get or set pattern - fetch from cache or execute function and cache result
 */
export async function cacheOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = CACHE_TTL.MEDIUM
): Promise<T> {
    // Try to get from cache first
    const cached = await getFromCache<T>(key);
    if (cached !== null) {
        return cached;
    }

    // Fetch fresh data
    const data = await fetchFn();

    // Await the write so the request that warms the cache reliably persists it.
    await setToCache(key, data, ttlSeconds);

    return data;
}

/**
 * Invalidate product-related caches
 */
export async function invalidateProductCaches(): Promise<void> {
    await invalidateCache([
        CACHE_KEYS.FEATURED_PRODUCTS,
        CACHE_KEYS.SALE_PRODUCTS,
        CACHE_KEYS.PRODUCTS_LIST,
        // The navbar's category dropdown is counted from the products table.
        CACHE_KEYS.PRODUCT_CATEGORIES,
    ]);
}

/**
 * Invalidate news-related caches
 */
export async function invalidateNewsCaches(): Promise<void> {
    await invalidateCache([CACHE_KEYS.NEWS_ARTICLES]);
}

/**
 * Invalidate settings cache
 */
export async function invalidateSettingsCaches(): Promise<void> {
    await invalidateCache([CACHE_KEYS.SITE_SETTINGS]);
}

/**
 * Invalidate popup caches
 */
export async function invalidatePopupCaches(): Promise<void> {
    await invalidateCache([CACHE_KEYS.ANNOUNCEMENT_POPUPS]);
}

/**
 * Invalidate the nav-item cache — the navbar caches the active menu for 60s,
 * so an admin edit is invisible until the TTL expires without this.
 */
export async function invalidateNavItemCaches(): Promise<void> {
    await invalidateCache([CACHE_KEYS.NAV_ITEMS]);
}

/**
 * Invalidate footer caches — the shared layout caches the widget settings and
 * the link list for 60s each, so any admin write must clear both or the site
 * keeps showing the old column names and links.
 */
export async function invalidateFooterCaches(): Promise<void> {
    await invalidateCache([CACHE_KEYS.FOOTER_WIDGET, CACHE_KEYS.FOOTER_LINKS]);
}

/**
 * Invalidate the registration policy cache — the signup page and the public
 * /terms and /privacy pages read the TOS/PP clauses through cacheOrFetch, so an
 * admin write is invisible to visitors until the TTL expires without this.
 */
export async function invalidateRegistrationPolicyCaches(): Promise<void> {
    await invalidateCache([CACHE_KEYS.REGISTRATION_POLICIES]);
}
