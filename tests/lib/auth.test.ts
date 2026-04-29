import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  getCsrfTokenFromRequest: vi.fn(),
  validateCsrfToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
      roles: {
        findFirst: vi.fn(),
      },
    },
  },
  users: { id: "id" },
  roles: { code: "code" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

import { auth } from "@/auth";
import { getCsrfTokenFromRequest, validateCsrfToken } from "@/lib/csrf";
import { db } from "@/lib/db";

describe("lib/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.query.users.findFirst).mockResolvedValue({ id: "u1", role: "ADMIN" } as never);
    vi.mocked(db.query.roles.findFirst).mockResolvedValue({ permissions: null } as never);
  });

  describe("isAdmin", () => {
    it("returns error if not logged in", async () => {
      (auth as any).mockResolvedValue(null);
      const { isAdmin } = await import("@/lib/auth");
      const result = await isAdmin();
      expect(result.success).toBe(false);
    });

    it("returns error if not admin role", async () => {
      (auth as any).mockResolvedValue({ user: { id: "u1", role: "USER" } });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({ id: "u1", role: "USER" } as never);
      const { isAdmin } = await import("@/lib/auth");
      const result = await isAdmin();
      expect(result.success).toBe(false);
    });

    it("returns success for admin", async () => {
      (auth as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
      const { isAdmin } = await import("@/lib/auth");
      const result = await isAdmin();
      expect(result.success).toBe(true);
      expect(result.userId).toBe("u1");
    });
  });

  describe("isAuthenticated", () => {
    it("returns error if not logged in", async () => {
      (auth as any).mockResolvedValue(null);
      const { isAuthenticated } = await import("@/lib/auth");
      const result = await isAuthenticated();
      expect(result.success).toBe(false);
    });

    it("returns success for any logged in user", async () => {
      (auth as any).mockResolvedValue({ user: { id: "u1", role: "USER" } });
      const { isAuthenticated } = await import("@/lib/auth");
      const result = await isAuthenticated();
      expect(result.success).toBe(true);
      expect(result.userId).toBe("u1");
    });
  });

  describe("isAdminWithCsrf", () => {
    it("returns error if not admin", async () => {
      (auth as any).mockResolvedValue(null);
      const { isAdminWithCsrf } = await import("@/lib/auth");
      const req = new Request("http://localhost");
      const result = await isAdminWithCsrf(req);
      expect(result.success).toBe(false);
    });

    it("returns error if CSRF token missing", async () => {
      (auth as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
      (getCsrfTokenFromRequest as any).mockReturnValue(null);
      const { isAdminWithCsrf } = await import("@/lib/auth");
      const req = new Request("http://localhost");
      const result = await isAdminWithCsrf(req);
      expect(result.success).toBe(false);
      expect(result.error).toContain("CSRF");
    });

    it("returns error if CSRF token invalid", async () => {
      (auth as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
      (getCsrfTokenFromRequest as any).mockReturnValue("token");
      (validateCsrfToken as any).mockResolvedValue(false);
      const { isAdminWithCsrf } = await import("@/lib/auth");
      const req = new Request("http://localhost");
      const result = await isAdminWithCsrf(req);
      expect(result.success).toBe(false);
    });

    it("returns success with valid CSRF", async () => {
      (auth as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
      (getCsrfTokenFromRequest as any).mockReturnValue("token");
      (validateCsrfToken as any).mockResolvedValue(true);
      const { isAdminWithCsrf } = await import("@/lib/auth");
      const req = new Request("http://localhost");
      const result = await isAdminWithCsrf(req);
      expect(result.success).toBe(true);
    });
  });

  describe("isAuthenticatedWithCsrf", () => {
    it("returns error if not authenticated", async () => {
      (auth as any).mockResolvedValue(null);
      const { isAuthenticatedWithCsrf } = await import("@/lib/auth");
      const req = new Request("http://localhost");
      const result = await isAuthenticatedWithCsrf(req);
      expect(result.success).toBe(false);
    });

    it("returns success with valid auth and CSRF", async () => {
      (auth as any).mockResolvedValue({ user: { id: "u1", role: "USER" } });
      (getCsrfTokenFromRequest as any).mockReturnValue("token");
      (validateCsrfToken as any).mockResolvedValue(true);
      const { isAuthenticatedWithCsrf } = await import("@/lib/auth");
      const req = new Request("http://localhost");
      const result = await isAuthenticatedWithCsrf(req);
      expect(result.success).toBe(true);
    });
  });
});
