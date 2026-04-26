import { describe, expect, it, vi, beforeEach } from "vitest";

describe("passwordReset helpers", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret");
  });

  it("creates and verifies a valid reset token", async () => {
    const {
      createPasswordResetToken,
      verifyPasswordResetToken,
      createPasswordFingerprint,
    } = await import("@/lib/passwordReset");

    const token = createPasswordResetToken({
      userId: "user-1",
      passwordHash: "hashed-password",
      now: 1_000,
    });

    const result = verifyPasswordResetToken(token, 2_000);
    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Expected valid token");
    }
    expect(result.userId).toBe("user-1");
    expect(result.passwordFingerprint).toBe(createPasswordFingerprint("hashed-password"));
  });

  it("rejects expired tokens", async () => {
    const {
      createPasswordResetToken,
      verifyPasswordResetToken,
      PASSWORD_RESET_TOKEN_TTL_MS,
    } = await import("@/lib/passwordReset");

    const token = createPasswordResetToken({
      userId: "user-1",
      passwordHash: "hashed-password",
      now: 1_000,
    });

    const result = verifyPasswordResetToken(token, 1_000 + PASSWORD_RESET_TOKEN_TTL_MS + 1);
    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected expired token");
    }
    expect(result.message).toContain("หมดอายุ");
  });

  it("rejects tampered tokens", async () => {
    const { createPasswordResetToken, verifyPasswordResetToken } = await import("@/lib/passwordReset");
    const token = createPasswordResetToken({
      userId: "user-1",
      passwordHash: "hashed-password",
    });

    const tampered = `${token}x`;
    const result = verifyPasswordResetToken(tampered);
    expect(result.success).toBe(false);
  });
});
