import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = {
  E2E_AUTH_TEST_MODE: process.env.E2E_AUTH_TEST_MODE,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
};

afterEach(() => {
  vi.resetModules();
  process.env.E2E_AUTH_TEST_MODE = originalEnv.E2E_AUTH_TEST_MODE;
  vi.unstubAllEnvs();
  process.env.UPSTASH_REDIS_REST_TOKEN = originalEnv.UPSTASH_REDIS_REST_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL = originalEnv.UPSTASH_REDIS_REST_URL;
});

describe("redis availability", () => {
  it("does not connect to shared Redis during non-production E2E auth tests", async () => {
    vi.resetModules();
    process.env.E2E_AUTH_TEST_MODE = "1";
    vi.stubEnv("NODE_ENV", "development");
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";

    const { isRedisAvailable, redis } = await import("@/lib/redis");

    expect(redis).toBeNull();
    expect(isRedisAvailable()).toBe(false);
  });
});
