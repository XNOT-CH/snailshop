import { describe, it, expect } from "vitest";
import {
  getDelimiter,
  splitStock,
  getStockCount,
  takeFirstStock,
  joinStock,
  SEPARATOR_OPTIONS,
} from "@/lib/stock";

describe("stock utilities", () => {
  describe("SEPARATOR_OPTIONS", () => {
    it("should have at least one option", () => {
      expect(SEPARATOR_OPTIONS.length).toBeGreaterThan(0);
    });

    it("newline option should have correct delimiter", () => {
      const nl = SEPARATOR_OPTIONS.find((o) => o.value === "newline");
      expect(nl).toBeDefined();
      expect(nl!.delimiter).toBe("\n");
    });
  });

  describe("getDelimiter", () => {
    it("returns newline delimiter for 'newline' type", () => {
      expect(getDelimiter("newline")).toBe("\n");
    });

    it("returns newline as default for unknown type", () => {
      expect(getDelimiter("unknown")).toBe("\n");
    });
  });

  describe("splitStock", () => {
    it("splits data by newline", () => {
      expect(splitStock("a\nb\nc", "newline")).toEqual(["a", "b", "c"]);
    });

    it("filters out empty lines", () => {
      expect(splitStock("a\n\nb\n\n", "newline")).toEqual(["a", "b"]);
    });

    it("returns empty array for empty string", () => {
      expect(splitStock("", "newline")).toEqual([]);
    });

    it("returns empty array for whitespace-only", () => {
      expect(splitStock("   ", "newline")).toEqual([]);
    });

    it("returns empty array for null-ish input", () => {
      expect(splitStock(null as unknown as string, "newline")).toEqual([]);
      expect(splitStock(undefined as unknown as string, "newline")).toEqual([]);
    });
  });

  describe("getStockCount", () => {
    it("returns correct count", () => {
      expect(getStockCount("a\nb\nc", "newline")).toBe(3);
    });

    it("returns 0 for empty data", () => {
      expect(getStockCount("", "newline")).toBe(0);
    });
  });

  describe("takeFirstStock", () => {
    it("takes the first item and returns remaining", () => {
      const [taken, remaining] = takeFirstStock("a\nb\nc", "newline");
      expect(taken).toBe("a");
      expect(remaining).toBe("b\nc");
    });

    it("handles single item", () => {
      const [taken, remaining] = takeFirstStock("only-one", "newline");
      expect(taken).toBe("only-one");
      expect(remaining).toBe("");
    });

    it("returns [null, ''] for empty data", () => {
      const [taken, remaining] = takeFirstStock("", "newline");
      expect(taken).toBeNull();
      expect(remaining).toBe("");
    });
  });

  describe("joinStock", () => {
    it("joins items with newline", () => {
      expect(joinStock(["a", "b", "c"], "newline")).toBe("a\nb\nc");
    });

    it("returns empty string for empty array", () => {
      expect(joinStock([], "newline")).toBe("");
    });
  });
});
