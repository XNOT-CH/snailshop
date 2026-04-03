/**
 * Tests for utility libraries and final low-coverage routes:
 * - lib/apiSecurity.ts    (apiSuccess, apiError, API_ERRORS, helpers, parseRequestBody, validateRequestBody)
 * - /api/gacha/recent     (GET)
 * - lib/cache.ts          (cacheOrFetch, getFromCache, setToCache, invalidate*)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ════════════════════════════════════════════════════════════════
// lib/apiSecurity  (no mocks needed — pure functions)
// ════════════════════════════════════════════════════════════════
describe("lib/apiSecurity", () => {
  it("apiSuccess returns 200 with default message", async () => {
    const { apiSuccess } = await import("@/lib/apiSecurity");
    const res = apiSuccess({ id: "1" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe("Success");
    expect(body.data).toEqual({ id: "1" });
    expect(body.timestamp).toBeDefined();
  });

  it("apiSuccess with custom message and status code", async () => {
    const { apiSuccess } = await import("@/lib/apiSecurity");
    const res = apiSuccess({ item: "x" }, "Created!", 201);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.message).toBe("Created!");
  });

  it("apiError returns error response with default errorCode", async () => {
    const { apiError } = await import("@/lib/apiSecurity");
    const res = apiError("Bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Bad input");
    expect(body.errorCode).toBe("ERR_400");
  });

  it("apiError with custom statusCode and errorCode", async () => {
    const { apiError } = await import("@/lib/apiSecurity");
    const res = apiError("Not found", 404, "CUSTOM_404");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.errorCode).toBe("CUSTOM_404");
  });

  it("API_ERRORS.UNAUTHORIZED returns 401", async () => {
    const { API_ERRORS } = await import("@/lib/apiSecurity");
    const res = API_ERRORS.UNAUTHORIZED();
    expect(res.status).toBe(401);
  });

  it("API_ERRORS.FORBIDDEN returns 403", async () => {
    const { API_ERRORS } = await import("@/lib/apiSecurity");
    const res = API_ERRORS.FORBIDDEN();
    expect(res.status).toBe(403);
  });

  it("API_ERRORS.NOT_FOUND with custom resource", async () => {
    const { API_ERRORS } = await import("@/lib/apiSecurity");
    const res = API_ERRORS.NOT_FOUND("สินค้า");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toContain("สินค้า");
  });

  it("API_ERRORS.NOT_FOUND without resource uses default", async () => {
    const { API_ERRORS } = await import("@/lib/apiSecurity");
    const res = API_ERRORS.NOT_FOUND();
    expect(res.status).toBe(404);
  });

  it("API_ERRORS.BAD_REQUEST with custom message", async () => {
    const { API_ERRORS } = await import("@/lib/apiSecurity");
    const res = API_ERRORS.BAD_REQUEST("Missing username");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Missing username");
  });

  it("API_ERRORS.BAD_REQUEST without message uses default", async () => {
    const { API_ERRORS } = await import("@/lib/apiSecurity");
    const res = API_ERRORS.BAD_REQUEST();
    expect(res.status).toBe(400);
  });

  it("API_ERRORS.RATE_LIMITED without retryAfter", async () => {
    const { API_ERRORS } = await import("@/lib/apiSecurity");
    const res = API_ERRORS.RATE_LIMITED();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeNull();
  });

  it("API_ERRORS.RATE_LIMITED with retryAfter sets header", async () => {
    const { API_ERRORS } = await import("@/lib/apiSecurity");
    const res = API_ERRORS.RATE_LIMITED(5000); // 5 seconds
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("5");
  });

  it("API_ERRORS.INTERNAL_ERROR returns 500", async () => {
    const { API_ERRORS } = await import("@/lib/apiSecurity");
    const res = API_ERRORS.INTERNAL_ERROR();
    expect(res.status).toBe(500);
  });

  it("API_ERRORS.VALIDATION_ERROR returns 422 with field message", async () => {
    const { API_ERRORS } = await import("@/lib/apiSecurity");
    const res = API_ERRORS.VALIDATION_ERROR("email", "Invalid format");
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.message).toBe("email: Invalid format");
  });

  it("API_ERRORS.CSRF_ERROR returns 403", async () => {
    const { API_ERRORS } = await import("@/lib/apiSecurity");
    const res = API_ERRORS.CSRF_ERROR();
    expect(res.status).toBe(403);
  });

  it("handleApiError logs and returns INTERNAL_ERROR (with context)", async () => {
    const { handleApiError } = await import("@/lib/apiSecurity");
    const res = handleApiError(new Error("DB fail"), "fetchUser");
    expect(res.status).toBe(500);
  });

  it("handleApiError without context", async () => {
    const { handleApiError } = await import("@/lib/apiSecurity");
    const res = handleApiError("string error");
    expect(res.status).toBe(500);
  });

  it("isValidString returns true for valid string", async () => {
    const { isValidString } = await import("@/lib/apiSecurity");
    expect(isValidString("hello")).toBe(true);
    expect(isValidString("hi", 2)).toBe(true);
    expect(isValidString("x", 3)).toBe(false); // too short
    expect(isValidString("", 1)).toBe(false);   // empty
    expect(isValidString(123)).toBe(false);     // not string
  });

  it("isValidNumber validates numbers correctly", async () => {
    const { isValidNumber } = await import("@/lib/apiSecurity");
    expect(isValidNumber(5)).toBe(true);
    expect(isValidNumber(0)).toBe(true);
    expect(isValidNumber(-1)).toBe(false);      // < default min 0
    expect(isValidNumber(-1, -10)).toBe(true);  // within custom min
    expect(isValidNumber("abc")).toBe(false);   // NaN
    expect(isValidNumber(null)).toBe(true);     // Number(null)=0, valid at min=0
  });

  it("isValidEmail validates email addresses", async () => {
    const { isValidEmail } = await import("@/lib/apiSecurity");
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("bad-email")).toBe(false);
    expect(isValidEmail(12345)).toBe(false);   // not string
    expect(isValidEmail("")).toBe(false);
  });

  it("isValidUuid validates UUID format", async () => {
    const { isValidUuid } = await import("@/lib/apiSecurity");
    expect(isValidUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidUuid("not-a-uuid")).toBe(false);
    expect(isValidUuid(123)).toBe(false); // not string
  });

  it("validateRequired checks for missing fields", async () => {
    const { validateRequired } = await import("@/lib/apiSecurity");
    const result = validateRequired({ name: "Alice", email: "" }, ["name", "email", "age"]);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("email");
    expect(result.missing).toContain("age");
  });

  it("validateRequired returns valid=true when all fields present", async () => {
    const { validateRequired } = await import("@/lib/apiSecurity");
    const result = validateRequired({ name: "Bob", age: 25 }, ["name", "age"]);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("parseRequestBody parses valid JSON", async () => {
    const { parseRequestBody } = await import("@/lib/apiSecurity");
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ username: "alice" }),
    });
    const result = await parseRequestBody(req);
    expect(result.success).toBe(true);
    if (result.success) expect((result.data as any).username).toBe("alice");
  });

  it("parseRequestBody returns error on invalid JSON", async () => {
    const { parseRequestBody } = await import("@/lib/apiSecurity");
    const req = new Request("http://localhost", {
      method: "POST",
      body: "not-json",
    });
    const result = await parseRequestBody(req);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.status).toBe(400);
  });

  it("validateRequestBody validates required fields", async () => {
    const { validateRequestBody } = await import("@/lib/apiSecurity");
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "Alice" }), // missing "email"
    });
    const result = await validateRequestBody(req, ["name", "email"]);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.status).toBe(400);
  });

  it("validateRequestBody returns success when all fields present", async () => {
    const { validateRequestBody } = await import("@/lib/apiSecurity");
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "Alice", email: "a@b.com" }),
    });
    const result = await validateRequestBody(req, ["name", "email"]);
    expect(result.success).toBe(true);
  });
});

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
