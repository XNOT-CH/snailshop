import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  },
  users: {
    id: "id",
    email: "email",
    username: "username",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  or: vi.fn(),
}));

vi.mock("@/lib/mail", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/getSiteSettings", () => ({
  getSiteSettings: vi.fn(),
}));

vi.mock("@/lib/security/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
}));

vi.mock("@/lib/rateLimit", () => ({
  getClientIp: vi.fn(() => "198.51.100.15"),
}));

vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: {
    PASSWORD_RESET_REQUEST: "PASSWORD_RESET_REQUEST",
    PASSWORD_RESET_COMPLETE: "PASSWORD_RESET_COMPLETE",
  },
}));

vi.mock("@/lib/utils/date", () => ({
  mysqlNow: vi.fn(() => "2026-04-25 00:00:00"),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

describe("API: password reset routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret");
    vi.mocked(getSiteSettings).mockResolvedValue({ heroTitle: "Snail Shop" } as never);
    vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: true });
    vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
  });

  it("forgot-password returns a generic success message when user is missing", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null as never);
    const { POST } = await import("@/app/api/auth/forgot-password/route");

    const response = await POST(
      new NextRequest("http://localhost/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ identifier: "unknown", turnstileToken: "token-1" }),
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("forgot-password sends reset email for existing users with email", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: "u1",
      username: "demo",
      name: "Demo",
      email: "demo@example.com",
      password: "hashed-password",
    } as never);

    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const response = await POST(
      new NextRequest("http://localhost/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ identifier: "demo@example.com", turnstileToken: "token-1" }),
      })
    );

    expect(response.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "demo@example.com",
      subject: expect.stringContaining("รีเซ็ตรหัสผ่าน"),
    }));
  });

  it("reset-password GET rejects invalid tokens", async () => {
    const { GET } = await import("@/app/api/auth/reset-password/route");
    const response = await GET(new NextRequest("http://localhost/api/auth/reset-password?token=bad-token"));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.valid).toBe(false);
  });

  it("reset-password POST updates the password when token is valid", async () => {
    const { createPasswordResetToken } = await import("@/lib/passwordReset");
    const token = createPasswordResetToken({
      userId: "u1",
      passwordHash: "hashed-password",
      now: Date.now(),
    });

    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: "u1",
      username: "demo",
      password: "hashed-password",
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    vi.mocked(bcrypt.hash).mockResolvedValue("new-hash" as never);

    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(
      new NextRequest("http://localhost/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          password: "new-password-1",
          confirmPassword: "new-password-1",
        }),
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
