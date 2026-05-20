import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    query: { apiKeys: { findFirst: vi.fn() } },
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
    insert: vi.fn().mockReturnValue({ values: vi.fn() }),
  },
  apiKeys: { key: "key", keyPrefix: "keyPrefix", isActive: "isActive", id: "id" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn() }));
vi.mock("@/lib/permissions", () => ({ hasPermission: vi.fn(() => true), Permission: {} }));
vi.mock("@/lib/utils/date", () => ({ mysqlNow: vi.fn(() => "2026-01-01 00:00:00") }));

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

// ── apiKey ──────────────────────────────────────────────
import { generateApiKey, hashApiKey, apiKeyHasPermission } from "@/lib/apiKey";
import { db } from "@/lib/db";

describe("lib/apiKey", () => {
  describe("generateApiKey", () => {
    it("returns rawKey, hashedKey, prefix", () => {
      const { rawKey, hashedKey, prefix } = generateApiKey();
      expect(rawKey).toHaveLength(64);
      expect(hashedKey).toHaveLength(64);
      expect(prefix).toBe(rawKey.substring(0, 8));
    });
    it("generates unique keys each call", () => {
      const a = generateApiKey();
      const b = generateApiKey();
      expect(a.rawKey).not.toBe(b.rawKey);
    });
  });

  describe("hashApiKey", () => {
    it("returns sha256 hex string", () => {
      const hash = hashApiKey("test-key");
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
    it("is deterministic", () => {
      expect(hashApiKey("abc")).toBe(hashApiKey("abc"));
    });
  });

  describe("apiKeyHasPermission", () => {
    it("returns true when permission list is empty (no restriction)", () => {
      const result = apiKeyHasPermission([], "ADMIN", null, "READ_PRODUCTS" as any);
      expect(result).toBe(true);
    });
    it("returns false when required permission not in key permissions", () => {
      // When key has specific permissions that don't include the required one
      const result = apiKeyHasPermission(["WRITE_PRODUCTS"], "USER", null, "READ_PRODUCTS" as any);
      expect(result).toBe(false);
    });
  });
});
