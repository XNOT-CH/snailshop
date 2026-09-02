import { describe, it, expect } from "vitest";

import {
  getDelimiter, splitStock, getStockCount, takeFirstStock, joinStock, getStockUser, findDuplicateStockUser
} from "@/lib/stock";

describe("lib/stock", () => {
  describe("getDelimiter", () => {
    it("returns newline for 'newline'", () => {
      expect(getDelimiter("newline")).toBe("\n");
    });
    it("returns newline for unknown type (fallback)", () => {
      expect(getDelimiter("unknown")).toBe("\n");
    });
  });

  describe("splitStock", () => {
    it("returns empty array for empty string", () => {
      expect(splitStock("", "newline")).toEqual([]);
    });
    it("returns empty array for whitespace-only", () => {
      expect(splitStock("   ", "newline")).toEqual([]);
    });
    it("splits by newline", () => {
      expect(splitStock("item1\nitem2\nitem3", "newline")).toEqual(["item1", "item2", "item3"]);
    });
    it("filters out blank lines", () => {
      expect(splitStock("item1\n\nitem2", "newline")).toEqual(["item1", "item2"]);
    });
  });

  describe("getStockCount", () => {
    it("returns 0 for empty", () => {
      expect(getStockCount("", "newline")).toBe(0);
    });
    it("returns correct count", () => {
      expect(getStockCount("a\nb\nc", "newline")).toBe(3);
    });
  });

  describe("getStockUser", () => {
    it("extracts the username before the stock delimiter", () => {
      expect(getStockUser(" user1 / pass1 ")).toBe("user1");
    });

    it("returns the whole trimmed item when no password delimiter exists", () => {
      expect(getStockUser(" user-only ")).toBe("user-only");
    });
  });

  describe("findDuplicateStockUser", () => {
    it("returns the first duplicate stock username", () => {
      expect(findDuplicateStockUser("user1 / pass1\nuser2 / pass2\nuser1 / pass3", "newline")).toBe("user1");
    });

    it("returns null when all stock usernames are unique", () => {
      expect(findDuplicateStockUser("user1 / pass1\nuser2 / pass2", "newline")).toBeNull();
    });
  });

  describe("takeFirstStock", () => {
    it("returns [null, ''] for empty stock", () => {
      const [item, remaining] = takeFirstStock("", "newline");
      expect(item).toBeNull();
      expect(remaining).toBe("");
    });
    it("takes first item and returns remaining", () => {
      const [item, remaining] = takeFirstStock("a\nb\nc", "newline");
      expect(item).toBe("a");
      expect(remaining).toBe("b\nc");
    });
    it("returns empty remaining when only one item", () => {
      const [item, remaining] = takeFirstStock("only", "newline");
      expect(item).toBe("only");
      expect(remaining).toBe("");
    });
  });

  describe("joinStock", () => {
    it("joins with newline", () => {
      expect(joinStock(["a", "b", "c"], "newline")).toBe("a\nb\nc");
    });
    it("returns empty string for empty array", () => {
      expect(joinStock([], "newline")).toBe("");
    });
  });
});
