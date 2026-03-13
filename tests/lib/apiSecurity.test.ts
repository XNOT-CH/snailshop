import { describe, it, expect } from "vitest";
import {
  isValidString,
  isValidNumber,
  isValidEmail,
  isValidUuid,
  validateRequired,
} from "@/lib/apiSecurity";

describe("apiSecurity - validation helpers", () => {
  describe("isValidString", () => {
    it("returns true for non-empty string", () => {
      expect(isValidString("hello")).toBe(true);
    });

    it("returns false for empty string", () => {
      expect(isValidString("")).toBe(false);
    });

    it("returns false for whitespace-only string", () => {
      expect(isValidString("   ")).toBe(false);
    });

    it("returns false for non-string", () => {
      expect(isValidString(123)).toBe(false);
      expect(isValidString(null)).toBe(false);
      expect(isValidString(undefined)).toBe(false);
    });

    it("respects minLength parameter", () => {
      expect(isValidString("ab", 3)).toBe(false);
      expect(isValidString("abc", 3)).toBe(true);
    });
  });

  describe("isValidNumber", () => {
    it("returns true for positive number", () => {
      expect(isValidNumber(42)).toBe(true);
    });

    it("returns true for zero with default min", () => {
      expect(isValidNumber(0)).toBe(true);
    });

    it("returns false for negative with default min", () => {
      expect(isValidNumber(-1)).toBe(false);
    });

    it("returns true for string number", () => {
      expect(isValidNumber("42")).toBe(true);
    });

    it("returns false for NaN", () => {
      expect(isValidNumber("abc")).toBe(false);
    });

    it("respects custom min", () => {
      expect(isValidNumber(5, 10)).toBe(false);
      expect(isValidNumber(10, 10)).toBe(true);
    });
  });

  describe("isValidEmail", () => {
    it("returns true for valid email", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
    });

    it("returns true for email with subdomain", () => {
      expect(isValidEmail("user@mail.example.co.th")).toBe(true);
    });

    it("returns false for missing @", () => {
      expect(isValidEmail("userexample.com")).toBe(false);
    });

    it("returns false for non-string", () => {
      expect(isValidEmail(123)).toBe(false);
      expect(isValidEmail(null)).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidEmail("")).toBe(false);
    });
  });

  describe("isValidUuid", () => {
    it("returns true for valid UUID", () => {
      expect(isValidUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    });

    it("returns false for invalid format", () => {
      expect(isValidUuid("not-a-uuid")).toBe(false);
    });

    it("returns false for non-string", () => {
      expect(isValidUuid(123)).toBe(false);
    });
  });

  describe("validateRequired", () => {
    it("returns valid when all fields present", () => {
      const result = validateRequired({ name: "test", email: "a@b.com" }, ["name", "email"]);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it("returns missing fields", () => {
      const result = validateRequired({ name: "test" }, ["name", "email", "phone"]);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(["email", "phone"]);
    });

    it("treats null and empty string as missing", () => {
      const result = validateRequired({ a: null, b: "", c: "ok" }, ["a", "b", "c"]);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(["a", "b"]);
    });
  });
});
