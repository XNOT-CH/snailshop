import { describe, expect, it } from "vitest";
import {
  hasValidImageSignature,
  validateImageFile,
} from "@/lib/serverImageUpload";

describe("serverImageUpload", () => {
  it("rejects oversized uploads at validation time", () => {
    const file = new File(["x"], "huge.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", {
      value: 5 * 1024 * 1024 + 1,
    });

    expect(() =>
      validateImageFile(file, {
        allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        maxInputBytes: 5 * 1024 * 1024,
      }),
    ).toThrow("File size exceeds 5MB limit");
  });

  it("rejects fake jpg content that does not match the JPEG signature", () => {
    const fakeMp4Header = Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32,
    ]);

    expect(hasValidImageSignature("image/jpeg", fakeMp4Header)).toBe(false);
  });
});
