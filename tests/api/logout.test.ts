import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn(),
  AUDIT_ACTIONS: { LOGOUT: "LOGOUT" },
}));

vi.mock("@/lib/csrf", () => ({
  validateCsrfRequest: vi.fn(),
}));

import { auth, signOut } from "@/auth";
import { validateCsrfRequest } from "@/lib/csrf";

describe("API: /api/logout (POST)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (validateCsrfRequest as any).mockResolvedValue(true);
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

  it("rejects requests without CSRF or same-origin proof", async () => {
    (validateCsrfRequest as any).mockResolvedValue(false);
    const { POST } = await import("@/app/api/logout/route");
    const res = await POST(new Request("http://localhost/api/logout", { method: "POST" }));
    expect(res.status).toBe(401);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("returns 500 on error", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (signOut as any).mockRejectedValue(new Error("Logout failed"));
    const { POST } = await import("@/app/api/logout/route");
    const res = await POST(new Request("http://localhost/api/logout", { method: "POST" }));
    expect(res.status).toBe(500);
  });
});
