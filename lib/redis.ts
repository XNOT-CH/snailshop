import { Redis } from "@upstash/redis";

// สร้าง Redis client - ใช้ environment variables จาก Upstash
// ถ้าไม่มี credentials จะ return null และระบบจะทำงานโดยไม่ใช้ cache
function createRedisClient(): Redis | null {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        console.warn("⚠️ Redis credentials not found. Caching disabled.");
        return null;
    }

    try {
        return new Redis({
            url,
            token,
        });
    } catch (error) {
        console.error("❌ Failed to create Redis client:", error);
        return null;
    }
}

export const redis = createRedisClient();

// Check if Redis is available
export const isRedisAvailable = (): boolean => {
    return redis !== null;
};
