import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
      roles: { findFirst: vi.fn() },
    },
  },
  users: { username: "username" },
  roles: { code: "code" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}));

vi.mock("@/lib/rateLimit", () => ({
  checkLoginRateLimitShared: vi.fn(),
  clearLoginAttemptsShared: vi.fn(),
  getClientIp: vi.fn(() => "203.0.113.10"),
  getProgressiveDelayShared: vi.fn(() => 0),
  recordFailedLoginShared: vi.fn(),
  sleep: vi.fn(),
}));

vi.mock("@/lib/security/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
}));

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  checkLoginRateLimitShared,
  clearLoginAttemptsShared,
  getClientIp,
  getProgressiveDelayShared,
  recordFailedLoginShared,
  sleep,
} from "@/lib/rateLimit";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { authenticateLoginAttempt } from "@/lib/login";

describe("authenticateLoginAttempt", () => {
  const audit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: true });
    vi.mocked(checkLoginRateLimitShared).mockResolvedValue({ blocked: false, remainingAttempts: 5 });
    vi.mocked(getClientIp).mockImplementation((request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "203.0.113.10");
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null as never);
    vi.mocked(db.query.roles.findFirst).mockResolvedValue(null as never);
  });

  it("uses the incoming request IP for rate limiting", async () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "198.51.100.24, 10.0.0.5" },
    });

    await authenticateLoginAttempt({
      payload: { username: "demo", password: "secret" },
      request,
      onAudit: audit,
    });

    expect(getClientIp).toHaveBeenCalledWith(request);
    expect(checkLoginRateLimitShared).toHaveBeenCalledWith("198.51.100.24:demo");
  });

  it("trims usernames and normalizes the rate-limit key", async () => {
    await authenticateLoginAttempt({
      payload: { username: " DemoUser ", password: "secret" },
      onAudit: audit,
    });

    expect(checkLoginRateLimitShared).toHaveBeenCalledWith("unknown:demouser");
    expect(eq).toHaveBeenCalledWith("username", "DemoUser");
  });

  it("skips turnstile failure when verifier passes without a token", async () => {
    await authenticateLoginAttempt({
      payload: { username: "demo", password: "secret" },
      onAudit: audit,
    });

    expect(verifyTurnstileToken).toHaveBeenCalledWith(undefined, "unknown");
  });

  it("returns a generic invalid credentials error for missing users", async () => {
    const result = await authenticateLoginAttempt({
      payload: { username: "demo", password: "secret" },
      onAudit: audit,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected login failure");
    }
    expect(result.status).toBe(401);
    expect(result.message).toBe("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    expect(recordFailedLoginShared).toHaveBeenCalledWith("unknown:demo");
  });

  it("returns the authenticated user and clears rate limits on success", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: "u1",
      username: "demo",
      password: "hashed",
      role: "ADMIN",
      email: "demo@example.com",
      image: null,
      name: "Demo",
    } as never);
    vi.mocked(db.query.roles.findFirst).mockResolvedValue({ permissions: ["product:view"] } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await authenticateLoginAttempt({
      payload: { username: "demo", password: "secret", turnstileToken: "token-1" },
      onAudit: audit,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Expected login success");
    }
    expect(result.user.username).toBe("demo");
    expect(clearLoginAttemptsShared).toHaveBeenCalledWith("unknown:demo");
    expect(audit).toHaveBeenCalled();
  });

  it("applies progressive delay when configured", async () => {
    vi.mocked(checkLoginRateLimitShared).mockResolvedValue({ blocked: false, remainingAttempts: 4 });
    vi.mocked(getProgressiveDelayShared).mockResolvedValue(250);

    await authenticateLoginAttempt({
      payload: { username: "demo", password: "secret" },
      onAudit: audit,
    });

    expect(sleep).toHaveBeenCalledWith(250);
  });
});
