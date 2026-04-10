import { describe, expect, it, vi } from "vitest";
import {
  buildFallbackRoleCode,
  normalizeRoleCode,
  resolveUniqueRoleCode,
} from "@/lib/roleCode";

describe("lib/roleCode", () => {
  it("normalizes latin role codes", () => {
    expect(normalizeRoleCode(" staff manager ")).toBe("STAFF_MANAGER");
  });

  it("returns empty string for Thai-only names", () => {
    expect(normalizeRoleCode("ผู้ดูอย่างเดียว")).toBe("");
  });

  it("builds a fallback code when name cannot be normalized", () => {
    expect(buildFallbackRoleCode("abc-123")).toBe("ROLE_ABC123");
  });

  it("creates a fallback code for Thai names", async () => {
    const isTaken = vi.fn().mockResolvedValue(false);

    await expect(
      resolveUniqueRoleCode({
        name: "ผู้ดูอย่างเดียว",
        fallbackSeed: "12345678-abcd",
        isTaken,
      })
    ).resolves.toBe("ROLE_12345678ABCD");
  });

  it("adds a suffix when a generated code is already taken", async () => {
    const isTaken = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await expect(
      resolveUniqueRoleCode({
        name: "Test Products",
        fallbackSeed: "seed",
        isTaken,
      })
    ).resolves.toBe("TEST_PRODUCTS_1");
  });

  it("keeps the current code during updates", async () => {
    const isTaken = vi.fn().mockResolvedValue(false);

    await expect(
      resolveUniqueRoleCode({
        name: "ชื่อใหม่ภาษาไทย",
        requestedCode: "",
        currentCode: "ROLE_PRODUCTS",
        fallbackSeed: "seed",
        isTaken,
      })
    ).resolves.toBe("ROLE_PRODUCTS");
  });
});
