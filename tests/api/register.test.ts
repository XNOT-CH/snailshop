import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    query: { users: { findFirst: vi.fn() } },
    insert: vi.fn().mockReturnValue({ values: vi.fn() }),
  },
  users: { username: "username", id: "id" },
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), or: vi.fn() }));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed_password") },
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRegisterRateLimit: vi.fn().mockReturnValue({ blocked: false }),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn(),
  AUDIT_ACTIONS: { REGISTER: "REGISTER" },
}));

vi.mock("@/lib/api", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/validations", () => ({
  registerSchema: {},
}));

vi.mock("@/lib/utils/date", () => ({
  mysqlNow: vi.fn(() => "2026-01-01 00:00:00"),
}));

vi.mock("@/lib/security/turnstile", () => ({
  verifyTurnstileToken: vi.fn().mockResolvedValue({ success: true }),
}));

import { db } from "@/lib/db";
import { parseBody } from "@/lib/api";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

describe("API: /api/register (POST)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (parseBody as any).mockResolvedValue({ data: { username: "newuser", email: "new@example.com", password: "secure123", turnstileToken: "token-1" } });
    vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: true });
  });

  const createRequest = () =>
    new NextRequest("http://localhost/api/register", {
      method: "POST",
      body: JSON.stringify({ username: "newuser", email: "new@example.com", password: "secure123" }),
    });

  it("returns validation error if parseBody fails", async () => {
    const errorRes = new Response(JSON.stringify({ success: false }), { status: 422 });
    (parseBody as any).mockResolvedValue({ error: errorRes });

    const { POST } = await import("@/app/api/register/route");
    const res = await POST(createRequest());
    expect(res.status).toBe(422);
  });

  it("returns 400 if username already exists", async () => {
    (db.query.users.findFirst as any).mockResolvedValue({ id: "existing" });

    const { POST } = await import("@/app/api/register/route");
    const res = await POST(createRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("registers user successfully", async () => {
    (db.query.users.findFirst as any).mockResolvedValue(null);

    const { POST } = await import("@/app/api/register/route");
    const res = await POST(createRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(db.insert).toHaveBeenCalled();
    const valuesMock = (db.insert as any).mock.results[0]?.value?.values;
    expect(valuesMock).toHaveBeenCalledWith(expect.objectContaining({ email: "new@example.com" }));
  });

  it("returns 400 if email already exists", async () => {
    (db.query.users.findFirst as any).mockResolvedValue({ id: "existing", username: "someone-else", email: "new@example.com" });

    const { POST } = await import("@/app/api/register/route");
    const res = await POST(createRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("อีเมล");
  });
});
