import { describe, it, expect } from "vitest";
import {
  PERMISSIONS,
  roleHasPermission,
  getUserPermissions,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  addCustomPermission,
  removeCustomPermission,
  normalizePermissionSelection,
} from "@/lib/permissions";

describe("lib/permissions", () => {
  describe("roleHasPermission", () => {
    it("returns true for valid role permission", () => {
      expect(roleHasPermission("USER", PERMISSIONS.PRODUCT_VIEW)).toBe(true);
      expect(roleHasPermission("ADMIN", PERMISSIONS.ADMIN_PANEL)).toBe(true);
    });

    it("returns false for invalid role permission", () => {
      expect(roleHasPermission("USER", PERMISSIONS.ADMIN_PANEL)).toBe(false);
      expect(roleHasPermission("UNKNOWN", PERMISSIONS.PRODUCT_VIEW)).toBe(false);
    });
  });

  describe("getUserPermissions", () => {
    it("returns role permissions + custom permissions", () => {
      const perms = getUserPermissions("USER", [PERMISSIONS.PRODUCT_CREATE]);
      expect(perms).toContain(PERMISSIONS.PRODUCT_VIEW);
      expect(perms).toContain(PERMISSIONS.PRODUCT_CREATE);
    });

    it("handles null/undefined custom permissions", () => {
      const perms = getUserPermissions("USER", null);
      expect(perms).toContain(PERMISSIONS.PRODUCT_VIEW);
      
      const perms2 = getUserPermissions("USER", undefined);
      expect(perms2).toContain(PERMISSIONS.PRODUCT_VIEW);
    });

    it("handles legacy JSON string custom permissions", () => {
      const perms = getUserPermissions("USER", JSON.stringify([PERMISSIONS.PRODUCT_CREATE]));
      expect(perms).toContain(PERMISSIONS.PRODUCT_VIEW);
      expect(perms).toContain(PERMISSIONS.PRODUCT_CREATE);
    });

    it("handles invalid JSON gracefully", () => {
      const perms = getUserPermissions("USER", "invalid-json");
      expect(perms).toEqual(expect.arrayContaining([PERMISSIONS.PRODUCT_VIEW]));
    });
  });

  describe("hasPermission", () => {
    it("always returns true for ADMIN", () => {
      expect(hasPermission("ADMIN", PERMISSIONS.PRODUCT_VIEW)).toBe(true);
      expect(hasPermission("ADMIN", "some:fake:perm" as any)).toBe(true);
    });

    it("checks role permissions", () => {
      expect(hasPermission("USER", PERMISSIONS.PRODUCT_VIEW)).toBe(true);
      expect(hasPermission("USER", PERMISSIONS.ADMIN_PANEL)).toBe(false);
    });

    it("checks custom permissions", () => {
      expect(hasPermission("USER", PERMISSIONS.PRODUCT_CREATE, [PERMISSIONS.PRODUCT_CREATE])).toBe(true);
    });
  });

  describe("hasAllPermissions", () => {
    it("returns true if user has all listed permissions", () => {
      expect(hasAllPermissions("SELLER", [PERMISSIONS.PRODUCT_VIEW, PERMISSIONS.PRODUCT_CREATE])).toBe(true);
    });

    it("returns false if user is missing one or more", () => {
      expect(hasAllPermissions("SELLER", [PERMISSIONS.PRODUCT_VIEW, PERMISSIONS.USER_VIEW])).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("returns true if user has at least one permission", () => {
      expect(hasAnyPermission("USER", [PERMISSIONS.PRODUCT_VIEW, PERMISSIONS.ADMIN_PANEL])).toBe(true);
    });

    it("returns false if user has none", () => {
      expect(hasAnyPermission("USER", [PERMISSIONS.ADMIN_PANEL, PERMISSIONS.USER_VIEW])).toBe(false);
    });
  });

  describe("addCustomPermission", () => {
    it("adds a new permission", () => {
      const result = addCustomPermission([PERMISSIONS.PRODUCT_VIEW], PERMISSIONS.PRODUCT_CREATE);
      expect(result).toHaveLength(2);
      expect(result).toContain(PERMISSIONS.PRODUCT_CREATE);
    });

    it("does not duplicate permissions", () => {
      const result = addCustomPermission([PERMISSIONS.PRODUCT_VIEW], PERMISSIONS.PRODUCT_VIEW);
      expect(result).toHaveLength(1);
    });
    
    it("handles null", () => {
      const result = addCustomPermission(null, PERMISSIONS.PRODUCT_VIEW);
      expect(result).toContain(PERMISSIONS.PRODUCT_VIEW);
    });
  });

  describe("removeCustomPermission", () => {
    it("removes a permission", () => {
      const result = removeCustomPermission([PERMISSIONS.PRODUCT_VIEW, PERMISSIONS.PRODUCT_CREATE], PERMISSIONS.PRODUCT_CREATE);
      expect(result).toHaveLength(1);
      expect(result).not.toContain(PERMISSIONS.PRODUCT_CREATE);
    });

    it("does nothing if permission not found", () => {
      const result = removeCustomPermission([PERMISSIONS.PRODUCT_VIEW], PERMISSIONS.PRODUCT_CREATE);
      expect(result).toHaveLength(1);
    });
  });

  describe("normalizePermissionSelection", () => {
    it("adds view and admin panel dependencies for product edit", () => {
      const result = normalizePermissionSelection([PERMISSIONS.PRODUCT_EDIT]);
      expect(result).toContain(PERMISSIONS.PRODUCT_EDIT);
      expect(result).toContain(PERMISSIONS.PRODUCT_VIEW);
      expect(result).toContain(PERMISSIONS.ADMIN_PANEL);
    });

    it("adds own-order view when order:view_all is selected", () => {
      const result = normalizePermissionSelection([PERMISSIONS.ORDER_VIEW_ALL]);
      expect(result).toContain(PERMISSIONS.ORDER_VIEW_ALL);
      expect(result).toContain(PERMISSIONS.ORDER_VIEW);
    });

    it("preserves storefront product:view without forcing admin panel", () => {
      const result = normalizePermissionSelection([PERMISSIONS.PRODUCT_VIEW]);
      expect(result).toContain(PERMISSIONS.PRODUCT_VIEW);
      expect(result).not.toContain(PERMISSIONS.ADMIN_PANEL);
    });
  });
});
