import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/encryption", () => ({
  decrypt: vi.fn((data: string) => {
    if (data === "bad-encrypted-stock") throw new Error("decrypt failed");
    return data.replace(/^encrypted_/, "");
  }),
}));

import { buildProductStockTakenUsers } from "@/lib/features/products/stockValidation";

describe("product stock taken users", () => {
  it("builds a user-to-product map from encrypted product stock", () => {
    expect(buildProductStockTakenUsers([
      {
        name: "Existing Game",
        secretData: "encrypted_user1 / pass1\nuser2 / pass2",
        stockSeparator: "newline",
      },
      {
        name: "Another Game",
        secretData: "encrypted_user3 / pass3\nuser4 / pass4",
        stockSeparator: "newline",
      },
    ])).toEqual({
      user1: "Existing Game",
      user2: "Existing Game",
      user3: "Another Game",
      user4: "Another Game",
    });
  });

  it("skips empty and undecryptable product stock", () => {
    expect(buildProductStockTakenUsers([
      { name: "Empty Game", secretData: "", stockSeparator: "newline" },
      { name: "Broken Game", secretData: "bad-encrypted-stock", stockSeparator: "newline" },
      { name: "Valid Game", secretData: "encrypted_user1 / pass1", stockSeparator: "newline" },
    ])).toEqual({ user1: "Valid Game" });
  });

  it("keeps the later product name when duplicate users appear in product scan order", () => {
    expect(buildProductStockTakenUsers([
      { name: "First Game", secretData: "encrypted_user1 / pass1", stockSeparator: "newline" },
      { name: "Second Game", secretData: "encrypted_user1 / pass2", stockSeparator: "newline" },
    ])).toEqual({ user1: "Second Game" });
  });
});
