/**
 * Comprehensive tests for lib/permissions.ts and lib/validations/validate.ts
 * Covers: all exported permission functions, normalisePermissions paths,
 *         validateBody error/success paths
 */
import { describe, it, expect } from "vitest";
import {
  hasPermission, hasAllPermissions, hasAnyPermission,
  getUserPermissions, roleHasPermission,
  addCustomPermission, removeCustomPermission,
  PERMISSIONS, ROLE_PERMISSIONS, normalizePermissionSelection,
} from "@/lib/permissions";

// ─── permissions.ts ───────────────────────────────────────────────────────────
describe("lib/permissions", () => {
  describe("roleHasPermission", () => {
    it("returns true for USER with PRODUCT_VIEW", () => {
      expect(roleHasPermission("USER", PERMISSIONS.PRODUCT_VIEW)).toBe(true);
    });
    it("returns false for USER with ADMIN_PANEL", () => {
      expect(roleHasPermission("USER", PERMISSIONS.ADMIN_PANEL)).toBe(false);
    });
    it("returns false for unknown role", () => {
      expect(roleHasPermission("GHOST", PERMISSIONS.PRODUCT_VIEW)).toBe(false);
    });
    it("ADMIN role has all permissions", () => {
      Object.values(PERMISSIONS).forEach((p) => {
        expect(roleHasPermission("ADMIN", p as any)).toBe(true);
      });
    });
  });

  describe("getUserPermissions", () => {
    it("returns USER role permissions", () => {
      const perms = getUserPermissions("USER");
      expect(perms).toContain(PERMISSIONS.PRODUCT_VIEW);
    });
    it("merges custom permissions with role permissions", () => {
      const perms = getUserPermissions("USER", [PERMISSIONS.SLIP_VIEW]);
      expect(perms).toContain(PERMISSIONS.SLIP_VIEW);
      expect(perms).toContain(PERMISSIONS.PRODUCT_VIEW);
    });
    it("accepts custom permissions as JSON string (legacy)", () => {
      const perms = getUserPermissions("USER", JSON.stringify([PERMISSIONS.SETTINGS_VIEW]));
      expect(perms).toContain(PERMISSIONS.SETTINGS_VIEW);
    });
    it("handles null custom permissions", () => {
      const perms = getUserPermissions("SELLER", null);
      expect(perms).toContain(PERMISSIONS.PRODUCT_CREATE);
    });
    it("uses empty array for unknown role", () => {
      const perms = getUserPermissions("GHOST");
      expect(perms).toHaveLength(0);
    });
    it("deduplicates permissions", () => {
      // Custom adds same permission that role already has
      const perms = getUserPermissions("USER", [PERMISSIONS.PRODUCT_VIEW]);
      const count = perms.filter((p) => p === PERMISSIONS.PRODUCT_VIEW).length;
      expect(count).toBe(1);
    });
  });

  describe("hasPermission", () => {
    it("ADMIN always has all permissions", () => {
      expect(hasPermission("ADMIN", PERMISSIONS.AUDIT_LOG_VIEW)).toBe(true);
    });
    it("USER has PRODUCT_VIEW", () => {
      expect(hasPermission("USER", PERMISSIONS.PRODUCT_VIEW)).toBe(true);
    });
    it("USER does not have SLIP_APPROVE without custom", () => {
      expect(hasPermission("USER", PERMISSIONS.SLIP_APPROVE)).toBe(false);
    });
    it("USER has SLIP_APPROVE with custom permission", () => {
      expect(hasPermission("USER", PERMISSIONS.SLIP_APPROVE, [PERMISSIONS.SLIP_APPROVE])).toBe(true);
    });
    it("handles malformed JSON custom permissions", () => {
      expect(hasPermission("USER", PERMISSIONS.PRODUCT_VIEW, "not-json")).toBe(true);
    });
  });

  describe("hasAllPermissions", () => {
    it("returns true when user has ALL listed permissions", () => {
      expect(hasAllPermissions("ADMIN", [PERMISSIONS.PRODUCT_VIEW, PERMISSIONS.SETTINGS_EDIT])).toBe(true);
    });
    it("returns false when user is missing one permission", () => {
      expect(hasAllPermissions("USER", [PERMISSIONS.PRODUCT_VIEW, PERMISSIONS.SLIP_APPROVE])).toBe(false);
    });
    it("returns true for empty permissions list", () => {
      expect(hasAllPermissions("USER", [])).toBe(true);
    });
    it("MODERATOR has all its designated permissions", () => {
      const modPerms = ROLE_PERMISSIONS["MODERATOR"];
      expect(hasAllPermissions("MODERATOR", modPerms)).toBe(true);
    });
  });

  describe("hasAnyPermission", () => {
    it("returns true when user has at least one listed permission", () => {
      expect(hasAnyPermission("USER", [PERMISSIONS.SLIP_APPROVE, PERMISSIONS.PRODUCT_VIEW])).toBe(true);
    });
    it("returns false when user has none of the listed permissions", () => {
      expect(hasAnyPermission("USER", [PERMISSIONS.SLIP_APPROVE, PERMISSIONS.AUDIT_LOG_VIEW])).toBe(false);
    });
    it("returns false for empty permissions list", () => {
      expect(hasAnyPermission("USER", [])).toBe(false);
    });
    it("ADMIN returns true for any permission", () => {
      expect(hasAnyPermission("ADMIN", [PERMISSIONS.API_KEY_MANAGE])).toBe(true);
    });
  });

  describe("addCustomPermission", () => {
    it("adds a new permission", () => {
      const result = addCustomPermission([], PERMISSIONS.SLIP_VIEW);
      expect(result).toContain(PERMISSIONS.SLIP_VIEW);
    });
    it("does not duplicate existing permission", () => {
      const result = addCustomPermission([PERMISSIONS.SLIP_VIEW], PERMISSIONS.SLIP_VIEW);
      expect(result.filter((p) => p === PERMISSIONS.SLIP_VIEW)).toHaveLength(1);
    });
    it("accepts null input", () => {
      const result = addCustomPermission(null, PERMISSIONS.SETTINGS_EDIT);
      expect(result).toContain(PERMISSIONS.SETTINGS_EDIT);
    });
    it("accepts JSON string input", () => {
      const result = addCustomPermission(JSON.stringify([PERMISSIONS.SLIP_VIEW]), PERMISSIONS.ORDER_VIEW_ALL);
      expect(result).toContain(PERMISSIONS.SLIP_VIEW);
      expect(result).toContain(PERMISSIONS.ORDER_VIEW_ALL);
    });
  });

  describe("removeCustomPermission", () => {
    it("removes an existing permission", () => {
      const result = removeCustomPermission([PERMISSIONS.SLIP_VIEW, PERMISSIONS.SETTINGS_VIEW], PERMISSIONS.SLIP_VIEW);
      expect(result).not.toContain(PERMISSIONS.SLIP_VIEW);
      expect(result).toContain(PERMISSIONS.SETTINGS_VIEW);
    });
    it("is a no-op when permission not present", () => {
      const result = removeCustomPermission([PERMISSIONS.SETTINGS_VIEW], PERMISSIONS.SLIP_VIEW);
      expect(result).toEqual([PERMISSIONS.SETTINGS_VIEW]);
    });
    it("accepts null input (returns empty)", () => {
      const result = removeCustomPermission(null, PERMISSIONS.SLIP_VIEW);
      expect(result).toEqual([]);
    });
    it("accepts JSON string input", () => {
      const result = removeCustomPermission(
        JSON.stringify([PERMISSIONS.SLIP_VIEW, PERMISSIONS.SETTINGS_VIEW]),
        PERMISSIONS.SLIP_VIEW
      );
      expect(result).not.toContain(PERMISSIONS.SLIP_VIEW);
    });
  });

  describe("normalizePermissionSelection", () => {
    it("applies nested permission dependencies", () => {
      const result = normalizePermissionSelection([PERMISSIONS.SLIP_APPROVE]);
      expect(result).toContain(PERMISSIONS.SLIP_APPROVE);
      expect(result).toContain(PERMISSIONS.SLIP_VIEW);
      expect(result).toContain(PERMISSIONS.ADMIN_PANEL);
    });
  });
});

// ─── validate.ts ─────────────────────────────────────────────────────────────
import { validateBody } from "@/lib/validations/validate";
import { z } from "zod";

const testSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().int().positive("Age must be positive"),
});

describe("lib/validations/validate — validateBody", () => {
  it("returns error when request body is invalid JSON", async () => {
    const req = new Request("http://test", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const result = await validateBody(req, testSchema);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(400);
      const body = await result.error.json();
      expect(body.message).toContain("invalid JSON");
    }
  });

  it("returns error when schema validation fails", async () => {
    const req = new Request("http://test", {
      method: "POST",
      body: JSON.stringify({ name: "", age: -5 }),
      headers: { "Content-Type": "application/json" },
    });
    const result = await validateBody(req, testSchema);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(400);
      const body = await result.error.json();
      expect(body.errors).toBeDefined();
      expect(body.message).toBeDefined();
    }
  });

  it("returns data when validation succeeds", async () => {
    const req = new Request("http://test", {
      method: "POST",
      body: JSON.stringify({ name: "Alice", age: 30 }),
      headers: { "Content-Type": "application/json" },
    });
    const result = await validateBody(req, testSchema);
    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data.name).toBe("Alice");
      expect(result.data.age).toBe(30);
    }
  });

  it("includes all field errors in errors map", async () => {
    const req = new Request("http://test", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
      headers: { "Content-Type": "application/json" },
    });
    const result = await validateBody(req, testSchema);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      const body = await result.error.json();
      expect(Object.keys(body.errors).length).toBeGreaterThan(0);
    }
  });
});
