import { afterEach, describe, expect, it, vi } from "vitest";

describe("authConfig cookie hardening", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses secure cookies in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("E2E_AUTH_TEST_MODE", "");
    vi.resetModules();

    const { authConfig } = await import("@/auth.config");

    expect(authConfig.useSecureCookies).toBe(true);
  });

  it("keeps cookies usable for localhost e2e production builds", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("E2E_AUTH_TEST_MODE", "1");
    vi.resetModules();

    const { authConfig } = await import("@/auth.config");

    expect(authConfig.useSecureCookies).toBe(false);
  });
});
