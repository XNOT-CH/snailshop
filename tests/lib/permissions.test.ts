import { describe, it, expect } from "vitest";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  roleHasPermission,
  getUserPermissions,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  addCustomPermission,
  removeCustomPermission,
} from "@/lib/permissions";

describe("permissions system", () => {
  describe("PERMISSIONS constant", () => {
    it("has product permissions", () => {
      expect(PERMISSIONS.PRODUCT_VIEW).toBe("product:view");
      expect(PERMISSIONS.PRODUCT_CREATE).toBe("product:create");
    });

    it("has admin permissions", () => {
      expect(PERMISSIONS.ADMIN_PANEL).toBe("admin:panel");
    });
  });

  describe("ROLE_PERMISSIONS", () => {
    it("USER has product:view", () => {
      expect(ROLE_PERMISSIONS.USER).toContain(PERMISSIONS.PRODUCT_VIEW);
    });

    it("USER does not have admin:panel", () => {
      expect(ROLE_PERMISSIONS.USER).not.toContain(PERMISSIONS.ADMIN_PANEL);
    });

    it("ADMIN has all permissions", () => {
      const allPerms = Object.values(PERMISSIONS);
      for (const perm of allPerms) {
        expect(ROLE_PERMISSIONS.ADMIN).toContain(perm);
      }
    });

    it("SELLER has admin:panel", () => {
      expect(ROLE_PERMISSIONS.SELLER).toContain(PERMISSIONS.ADMIN_PANEL);
    });
  });

  describe("roleHasPermission", () => {
    it("returns true for valid role permission", () => {
      expect(roleHasPermission("USER", PERMISSIONS.PRODUCT_VIEW)).toBe(true);
    });

    it("returns false for invalid role permission", () => {
      expect(roleHasPermission("USER", PERMISSIONS.ADMIN_PANEL)).toBe(false);
    });

    it("returns false for unknown role", () => {
      expect(roleHasPermission("UNKNOWN", PERMISSIONS.PRODUCT_VIEW)).toBe(false);
    });
  });

  describe("getUserPermissions", () => {
    it("returns role permissions without custom", () => {
      const perms = getUserPermissions("USER");
      expect(perms).toContain(PERMISSIONS.PRODUCT_VIEW);
      expect(perms).toContain(PERMISSIONS.ORDER_VIEW);
    });

    it("merges custom permissions with role permissions", () => {
      const perms = getUserPermissions("USER", [PERMISSIONS.ADMIN_PANEL]);
      expect(perms).toContain(PERMISSIONS.PRODUCT_VIEW);
      expect(perms).toContain(PERMISSIONS.ADMIN_PANEL);
    });

    it("deduplicates overlapping custom permissions", () => {
      const perms = getUserPermissions("USER", [PERMISSIONS.PRODUCT_VIEW]);
      const viewCount = perms.filter((p) => p === PERMISSIONS.PRODUCT_VIEW).length;
      expect(viewCount).toBe(1);
    });

    it("handles null custom permissions", () => {
      const perms = getUserPermissions("USER", null);
      expect(perms.length).toBeGreaterThan(0);
    });

    it("handles legacy JSON string permissions", () => {
      const perms = getUserPermissions("USER", JSON.stringify([PERMISSIONS.ADMIN_PANEL]));
      expect(perms).toContain(PERMISSIONS.ADMIN_PANEL);
    });
  });

  describe("hasPermission", () => {
    it("ADMIN always returns true", () => {
      expect(hasPermission("ADMIN", PERMISSIONS.PRODUCT_VIEW)).toBe(true);
      expect(hasPermission("ADMIN", PERMISSIONS.SETTINGS_EDIT)).toBe(true);
    });

    it("USER has product:view", () => {
      expect(hasPermission("USER", PERMISSIONS.PRODUCT_VIEW)).toBe(true);
    });

    it("USER does not have admin:panel", () => {
      expect(hasPermission("USER", PERMISSIONS.ADMIN_PANEL)).toBe(false);
    });

    it("USER with custom admin:panel has it", () => {
      expect(hasPermission("USER", PERMISSIONS.ADMIN_PANEL, [PERMISSIONS.ADMIN_PANEL])).toBe(true);
    });
  });

  describe("hasAllPermissions", () => {
    it("returns true when user has all permissions", () => {
      expect(hasAllPermissions("USER", [PERMISSIONS.PRODUCT_VIEW, PERMISSIONS.ORDER_VIEW])).toBe(true);
    });

    it("returns false when user lacks one permission", () => {
      expect(hasAllPermissions("USER", [PERMISSIONS.PRODUCT_VIEW, PERMISSIONS.ADMIN_PANEL])).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("returns true when user has at least one permission", () => {
      expect(hasAnyPermission("USER", [PERMISSIONS.ADMIN_PANEL, PERMISSIONS.PRODUCT_VIEW])).toBe(true);
    });

    it("returns false when user has none", () => {
      expect(hasAnyPermission("USER", [PERMISSIONS.ADMIN_PANEL, PERMISSIONS.SETTINGS_EDIT])).toBe(false);
    });
  });

  describe("addCustomPermission", () => {
    it("adds a new permission", () => {
      const result = addCustomPermission(null, PERMISSIONS.ADMIN_PANEL);
      expect(result).toContain(PERMISSIONS.ADMIN_PANEL);
    });

    it("does not duplicate existing permission", () => {
      const result = addCustomPermission([PERMISSIONS.ADMIN_PANEL], PERMISSIONS.ADMIN_PANEL);
      expect(result.filter((p) => p === PERMISSIONS.ADMIN_PANEL).length).toBe(1);
    });
  });

  describe("removeCustomPermission", () => {
    it("removes an existing permission", () => {
      const result = removeCustomPermission([PERMISSIONS.ADMIN_PANEL, PERMISSIONS.PRODUCT_VIEW], PERMISSIONS.ADMIN_PANEL);
      expect(result).not.toContain(PERMISSIONS.ADMIN_PANEL);
      expect(result).toContain(PERMISSIONS.PRODUCT_VIEW);
    });

    it("returns empty array when removing from null", () => {
      const result = removeCustomPermission(null, PERMISSIONS.ADMIN_PANEL);
      expect(result).toEqual([]);
    });
  });
});
