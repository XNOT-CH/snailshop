import { describe, expect, it } from "vitest";
import { normalizeCallbackUrl } from "@/lib/authRedirect";

describe("normalizeCallbackUrl", () => {
  it("allows internal callback paths", () => {
    expect(normalizeCallbackUrl("/dashboard?tab=wallet#top")).toBe("/dashboard?tab=wallet#top");
  });

  it("rejects absolute and protocol-relative external URLs", () => {
    expect(normalizeCallbackUrl("https://evil.example/dashboard")).toBe("/");
    expect(normalizeCallbackUrl("//evil.example/dashboard")).toBe("/");
  });

  it("rejects backslash based open redirect tricks", () => {
    expect(normalizeCallbackUrl("/\\evil.example")).toBe("/");
    expect(normalizeCallbackUrl("/%5C%5Cevil.example")).toBe("/");
  });

  it("rejects auth and login callback loops", () => {
    expect(normalizeCallbackUrl("/login?callbackUrl=%2Fdashboard")).toBe("/");
    expect(normalizeCallbackUrl("/api/auth/signin")).toBe("/");
  });
});
