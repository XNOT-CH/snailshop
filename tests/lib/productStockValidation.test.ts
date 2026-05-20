import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/encryption", () => ({
  decrypt: vi.fn((data: string) => {
    if (data === "bad-encrypted-stock") throw new Error("decrypt failed");
    return data.replace(/^encrypted_/, "");
  }),
}));

import {
  findProductStockUserConflict,
  productStockUserConflictResponseMessage,
} from "@/lib/features/products/stockValidation";

describe("product stock validation", () => {
  it("returns duplicate conflict without loading other products", async () => {
    const loadProducts = vi.fn().mockResolvedValue([]);

    const conflict = await findProductStockUserConflict(
      "user1 / pass1\nuser2 / pass2\nuser1 / pass3",
      "newline",
      loadProducts
    );

    expect(conflict).toEqual({ type: "duplicate", user: "user1" });
    expect(loadProducts).not.toHaveBeenCalled();
  });

  it("returns null for empty submitted stock without loading other products", async () => {
    const loadProducts = vi.fn().mockResolvedValue([]);

    await expect(findProductStockUserConflict("", "newline", loadProducts)).resolves.toBeNull();
    expect(loadProducts).not.toHaveBeenCalled();
  });

  it("returns cross-product conflict for an existing stock user", async () => {
    const conflict = await findProductStockUserConflict(
      "user1 / pass1",
      "newline",
      async () => [
        {
          name: "Existing Game",
          secretData: "encrypted_user1 / old-pass",
          stockSeparator: "newline",
        },
      ]
    );

    expect(conflict).toEqual({
      type: "crossProduct",
      user: "user1",
      productName: "Existing Game",
    });
  });

  it("skips undecryptable product stock when checking cross-product conflicts", async () => {
    const conflict = await findProductStockUserConflict(
      "user1 / pass1",
      "newline",
      async () => [
        { name: "Broken Product", secretData: "bad-encrypted-stock", stockSeparator: "newline" },
        { name: "Other Game", secretData: "encrypted_user2 / pass2", stockSeparator: "newline" },
      ]
    );

    expect(conflict).toBeNull();
  });

  it("formats route response messages for both conflict types", () => {
    expect(productStockUserConflictResponseMessage({ type: "duplicate", user: "user1" }))
      .toBe('User "user1" มีในสต็อกอยู่แล้ว');
    expect(productStockUserConflictResponseMessage({
      type: "crossProduct",
      user: "user1",
      productName: "Existing Game",
    })).toBe('User "user1" มีอยู่ในสต็อกของสินค้า "Existing Game" แล้ว');
  });
});
