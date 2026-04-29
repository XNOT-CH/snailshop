import { beforeEach, describe, expect, it, vi } from "vitest";

const redisMock = {
  get: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};

vi.mock("@/lib/redis", () => ({
  isRedisAvailable: vi.fn(() => true),
  redis: redisMock,
}));

describe("rateLimit shared password-reset helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses Redis-backed counters for login limits", async () => {
    redisMock.ttl.mockResolvedValue(-1);
    redisMock.get.mockResolvedValue(2);

    const { checkLoginRateLimitShared } = await import("@/lib/rateLimit");
    const result = await checkLoginRateLimitShared("ip:user");

    expect(result.blocked).toBe(false);
    expect(result.remainingAttempts).toBe(3);
    expect(redisMock.ttl).toHaveBeenCalledWith("login-lock:ip:user");
    expect(redisMock.get).toHaveBeenCalledWith("login:ip:user");
  });

  it("records failed login attempts in Redis and creates a lock at the limit", async () => {
    redisMock.incr.mockResolvedValue(5);
    redisMock.expire.mockResolvedValue(1);
    redisMock.set.mockResolvedValue("OK");

    const { recordFailedLoginShared } = await import("@/lib/rateLimit");
    await recordFailedLoginShared("ip:user");

    expect(redisMock.incr).toHaveBeenCalledWith("login:ip:user");
    expect(redisMock.set).toHaveBeenCalledWith("login-lock:ip:user", "1", { ex: 1800 });
  });

  it("clears Redis login counter and lock after a successful login", async () => {
    redisMock.del.mockResolvedValue(2);

    const { clearLoginAttemptsShared } = await import("@/lib/rateLimit");
    await clearLoginAttemptsShared("ip:user");

    expect(redisMock.del).toHaveBeenCalledWith("login:ip:user", "login-lock:ip:user");
  });

  it("uses Redis-backed counters for password reset request limits", async () => {
    redisMock.incr.mockResolvedValue(1);
    redisMock.expire.mockResolvedValue(1);
    redisMock.ttl.mockResolvedValue(900);

    const { checkPasswordResetRequestRateLimitShared } = await import("@/lib/rateLimit");
    const result = await checkPasswordResetRequestRateLimitShared("ip:user");

    expect(result.blocked).toBe(false);
    expect(result.remainingAttempts).toBe(2);
    expect(redisMock.incr).toHaveBeenCalledWith("password-reset-request:ip:user");
    expect(redisMock.expire).toHaveBeenCalledWith("password-reset-request:ip:user", 900);
  });

  it("returns a block message when Redis-backed reset submit limit is exceeded", async () => {
    redisMock.incr.mockResolvedValue(6);
    redisMock.expire.mockResolvedValue(1);
    redisMock.ttl.mockResolvedValue(1200);

    const { checkPasswordResetAttemptRateLimitShared } = await import("@/lib/rateLimit");
    const result = await checkPasswordResetAttemptRateLimitShared("ip:u1");

    expect(result.blocked).toBe(true);
    expect(result.remainingAttempts).toBe(0);
    expect(result.message).toContain("กรุณารอประมาณ");
    expect(redisMock.incr).toHaveBeenCalledWith("password-reset-attempt:ip:u1");
  });
});
