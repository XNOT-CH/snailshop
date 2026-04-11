import { describe, expect, it } from "vitest";
import { newsItemSchema } from "@/lib/validations/content";
import {
  NEWS_DESCRIPTION_MAX_LENGTH,
  NEWS_MAX_UPLOAD_BYTES,
  NEWS_TITLE_MAX_LENGTH,
  validateNewsImageDimensions,
  normalizeNewsTextInput,
  validateNewsUploadFile,
  validateNewsUrlInput,
  validateNewsTextInput,
} from "@/lib/newsValidation";

describe("news validation", () => {
  it("normalizes repeated whitespace into a clean string", () => {
    expect(normalizeNewsTextInput("  โปร   โมชัน   ใหม่  ")).toBe("โปร โมชัน ใหม่");
  });

  it("rejects title values that are only whitespace", () => {
    const result = newsItemSchema.safeParse({
      title: "     ",
      description: "รายละเอียดปกติ",
      imageUrl: "",
      link: "",
      sortOrder: 0,
      isActive: true,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("กรุณากรอกหัวข้อข่าว");
  });

  it("accepts emoji and special characters after normalization", () => {
    const result = newsItemSchema.safeParse({
      title: "โปร 😎 ' \" < >",
      description: "ข่าวใหม่ ✨ ' \" < >",
      imageUrl: "  /banners/promo.webp  ",
      link: "  https://example.com/promo  ",
      sortOrder: 3,
      isActive: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.link).toBe("https://example.com/promo");
      expect(result.data.imageUrl).toBe("/banners/promo.webp");
    }
  });

  it("rejects overly long descriptions", () => {
    const result = newsItemSchema.safeParse({
      title: "หัวข้อปกติ",
      description: "ก".repeat(NEWS_DESCRIPTION_MAX_LENGTH + 1),
      imageUrl: "",
      link: "",
      sortOrder: 0,
      isActive: true,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      `รายละเอียดต้องไม่เกิน ${NEWS_DESCRIPTION_MAX_LENGTH} ตัวอักษร`,
    );
  });

  it("returns a UI-friendly error when title exceeds the limit", () => {
    expect(
      validateNewsTextInput("ก".repeat(NEWS_TITLE_MAX_LENGTH + 1), {
        label: "หัวข้อข่าว",
        maxLength: NEWS_TITLE_MAX_LENGTH,
      }),
    ).toBe(`หัวข้อข่าวต้องไม่เกิน ${NEWS_TITLE_MAX_LENGTH} ตัวอักษร`);
  });

  it("rejects malformed news links without a scheme", () => {
    expect(validateNewsUrlInput("www.example.com/promo")).toBe(
      "URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย / หรือ http:// หรือ https://)",
    );
  });

  it("rejects uploads over 5MB before sending them", () => {
    const file = new File(["x"], "banner.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", {
      value: NEWS_MAX_UPLOAD_BYTES + 1,
    });

    expect(validateNewsUploadFile(file)).toBe("ไฟล์รูปต้องมีขนาดไม่เกิน 5MB");
  });

  it("rejects images with an extreme aspect ratio", () => {
    expect(validateNewsImageDimensions(5000, 500)).toBe(
      "สัดส่วนรูปภาพยาวเกินไป กรุณาใช้รูปที่สมดุลกว่านี้",
    );
  });
});
