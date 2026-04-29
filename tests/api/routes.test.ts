import { describe, it, expect, vi, beforeEach } from "vitest";
import { LEGACY_LOGIN_DEPRECATED_MESSAGE } from "@/lib/login";

// ── Mock dependencies BEFORE importing route ──
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
  },
  users: {},
}));

vi.mock("@/lib/auth", () => ({
  isAdmin: vi.fn(),
  requirePermission: vi.fn(),
}));

vi.mock("@/lib/auditLog", () => ({
  auditFromRequest: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: {
    LOGIN: "LOGIN",
    LOGIN_FAILED: "LOGIN_FAILED",
    REGISTER: "REGISTER",
    PRODUCT_CREATE: "PRODUCT_CREATE",
  },
}));

vi.mock("@/lib/api", () => ({
  parseBody: vi.fn(),
  apiSuccess: vi.fn(),
  apiError: vi.fn(),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkLoginRateLimit: vi.fn(() => ({ blocked: false, remainingAttempts: 5 })),
  recordFailedLogin: vi.fn(),
  clearLoginAttempts: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
  getProgressiveDelay: vi.fn(() => 0),
  sleep: vi.fn(),
  checkRegisterRateLimit: vi.fn(() => ({ blocked: false })),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(() => Promise.resolve("$2a$10$hashedpassword")),
    compare: vi.fn(),
  },
}));

vi.mock("@/lib/utils/date", () => ({
  mysqlNow: vi.fn(() => "2026-01-01 00:00:00"),
}));

vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((v: string) => `encrypted:${v}`),
  decrypt: vi.fn((v: string) => v.replace("encrypted:", "")),
}));

vi.mock("@/lib/cache", () => ({
  invalidateProductCaches: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/security/turnstile", () => ({
  verifyTurnstileToken: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/features/products/mutations", () => ({
  createProduct: vi.fn().mockResolvedValue({ id: "p1" }),
}));

// Now import the route handlers
import { POST as loginPOST } from "@/app/api/login/route";
import { POST as registerPOST } from "@/app/api/register/route";
import { POST as productPOST } from "@/app/api/products/route";
import { db } from "@/lib/db";
import { isAdmin, requirePermission } from "@/lib/auth";
import { parseBody } from "@/lib/api";
import { auditFromRequest } from "@/lib/auditLog";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown>, method = "POST"): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("API: /api/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 410 because the legacy login route is deprecated", async () => {
    const res = await loginPOST();
    const body = await res.json();
    expect(res.status).toBe(410);
    expect(body.success).toBe(false);
    expect(body.message).toBe(LEGACY_LOGIN_DEPRECATED_MESSAGE);
  });
});

describe("API: /api/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-setup mocks that clearAllMocks resets
    vi.mocked(db.insert).mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) } as any);
    vi.mocked(auditFromRequest).mockResolvedValue(undefined as any);
  });

  it("returns success on valid registration", async () => {
    vi.mocked(parseBody).mockResolvedValue({ data: { username: "newuser", email: "new@example.com", password: "pass123", confirmPassword: "pass123" } });
    vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

    const res = await registerPOST(makeRequest({ username: "newuser", email: "new@example.com", password: "pass123", confirmPassword: "pass123" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("returns 400 when username exists", async () => {
    vi.mocked(parseBody).mockResolvedValue({ data: { username: "existing", email: "existing@example.com", password: "pass123", confirmPassword: "pass123" } });
    vi.mocked(db.query.users.findFirst).mockResolvedValue({ id: "u1", username: "existing" } as any);

    const res = await registerPOST(makeRequest({ username: "existing", email: "existing@example.com", password: "pass123", confirmPassword: "pass123" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns error when parseBody fails", async () => {
    const errResponse = new Response(JSON.stringify({ success: false }), { status: 422 });
    vi.mocked(parseBody).mockResolvedValue({ error: errResponse as any });

    const res = await registerPOST(makeRequest({}));
    expect(res.status).toBe(422);
  });
});

describe("API: /api/products (POST)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-setup mocks that clearAllMocks resets
    vi.mocked(db.insert).mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) } as any);
    vi.mocked(auditFromRequest).mockResolvedValue(undefined as any);
    vi.mocked(requirePermission).mockResolvedValue({ success: true, userId: "admin1" } as any);
  });

  it("returns 401 when not admin", async () => {
    vi.mocked(requirePermission).mockResolvedValue({ success: false, error: "Unauthorized" } as any);

    const res = await productPOST(makeRequest({ title: "Game", price: 100, category: "Games" }));
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it.skip("creates product when admin (needs full request mock)", async () => {
    vi.mocked(requirePermission).mockResolvedValue({ success: true, userId: "admin1" } as any);

    const res = await productPOST(makeRequest({ title: "Game Key", price: "100", category: "Games" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("returns 400 for missing fields", async () => {
    vi.mocked(requirePermission).mockResolvedValue({ success: true, userId: "admin1" } as any);

    const res = await productPOST(makeRequest({ title: "", price: "", category: "" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 400 for invalid price", async () => {
    vi.mocked(requirePermission).mockResolvedValue({ success: true, userId: "admin1" } as any);

    const res = await productPOST(makeRequest({ title: "Game", price: "-5", category: "Games" }));
    const body = await res.json();
    expect(res.status).toBe(400);
  });

  it("validates discount price < original price", async () => {
    vi.mocked(requirePermission).mockResolvedValue({ success: true, userId: "admin1" } as any);

    const res = await productPOST(makeRequest({ title: "Game", price: "100", discountPrice: "200", category: "Games" }));
    const body = await res.json();
    expect(res.status).toBe(400);
  });
});
