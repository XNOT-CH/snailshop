import { afterEach, describe, expect, it, vi } from "vitest";
import { E2E_TURNSTILE_BYPASS_TOKEN, verifyTurnstileToken } from "@/lib/security/turnstile";

describe("verifyTurnstileToken", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("allows the e2e bypass token only outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("E2E_AUTH_TEST_MODE", "1");

    await expect(verifyTurnstileToken(E2E_TURNSTILE_BYPASS_TOKEN, "127.0.0.1"))
      .resolves.toEqual({ success: true });
  });

  it("does not allow the e2e bypass token in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("E2E_AUTH_TEST_MODE", "1");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");

    const result = await verifyTurnstileToken(E2E_TURNSTILE_BYPASS_TOKEN, "127.0.0.1");

    expect(result.success).toBe(false);
  });

  it("fails closed when a public site key exists without a secret", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");

    const result = await verifyTurnstileToken(undefined, "127.0.0.1");

    expect(result.success).toBe(false);
  });

  it("allows local development when Turnstile is not configured at all", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");

    await expect(verifyTurnstileToken(undefined, "127.0.0.1"))
      .resolves.toEqual({ success: true });
  });
});
