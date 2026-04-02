import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn(),
  AUDIT_ACTIONS: { LOGOUT: "LOGOUT" },
}));

import { auth, signOut } from "@/auth";

describe("API: /api/logout (POST)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs out successfully", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (signOut as any).mockResolvedValue(undefined);
    const { POST } = await import("@/app/api/logout/route");
    const res = await POST(new Request("http://localhost/api/logout", { method: "POST" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 500 on error", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (signOut as any).mockRejectedValue(new Error("Logout failed"));
    const { POST } = await import("@/app/api/logout/route");
    const res = await POST(new Request("http://localhost/api/logout", { method: "POST" }));
    expect(res.status).toBe(500);
  });
});
