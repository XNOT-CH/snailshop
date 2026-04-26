import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { LEGACY_LOGIN_DEPRECATED_MESSAGE } from "@/lib/login";

describe("API: /api/login (POST)", () => {
  const createRequest = () =>
    new NextRequest("http://localhost/api/login", {
      method: "POST",
      body: JSON.stringify({ username: "testuser", password: "pass123" }),
    });

  it("returns 410 and points callers to NextAuth", async () => {
    const { POST } = await import("@/app/api/login/route");
    const res = await POST(createRequest());
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe(LEGACY_LOGIN_DEPRECATED_MESSAGE);
  });
});
