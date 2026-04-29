import { describe, it, expect } from "vitest";
import { LEGACY_LOGIN_DEPRECATED_MESSAGE } from "@/lib/login";

describe("API: /api/login (POST)", () => {
  it("returns 410 and points callers to NextAuth", async () => {
    const { POST } = await import("@/app/api/login/route");
    const res = await POST();
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe(LEGACY_LOGIN_DEPRECATED_MESSAGE);
  });
});
