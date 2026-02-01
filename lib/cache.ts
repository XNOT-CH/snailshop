import { redis, isRedisAvailable } from "./redis";

// Cache key prefixes
export const CACHE_KEYS = {
    FEATURED_PRODUCTS: "featured_products",
    SALE_PRODUCTS: "sale_products",
    NEWS_ARTICLES: "news_articles",
    SITE_SETTINGS: "site_settings",
    HELP_ARTICLES: "help_articles",
    PRODUCTS_LIST: "products_list",
} as const;

// Default TTL values (in seconds)
export const CACHE_TTL = {
    SHORT: 60 * 5,        // 5 minutes - for frequently changing data
    MEDIUM: 60 * 15,      // 15 minutes - for products, news
    LONG: 60 * 60,        // 1 hour - for settings, help articles
    VERY_LONG: 60 * 60 * 24, // 24 hours - for rarely changing data
} as const;

/**
 * Get data from cache
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
    if (!isRedisAvailable() || !redis) {
        return null;
    }

    try {
        const cached = await redis.get<T>(key);
        if (cached) {
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
    if (!isRedisAvailable() || !redis) {
        return false;
    }

    try {
        await redis.set(key, data, { ex: ttlSeconds });
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
    if (!isRedisAvailable() || !redis) {
        return false;
    }

    try {
        await redis.del(key);
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
    if (!isRedisAvailable() || !redis) {
        return false;
    }

    try {
        for (const key of keys) {
            await redis.del(key);
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

    // Store in cache (don't await to not block response)
    setToCache(key, data, ttlSeconds);

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
