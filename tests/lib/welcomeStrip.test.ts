import { describe, expect, it } from "vitest";
import {
  isValidWelcomeStripImagesJson,
  normalizeWelcomeStripImages,
  serializeWelcomeStripImages,
  WELCOME_STRIP_MAX_SLOT_COUNT,
  WELCOME_STRIP_SLOT_COUNT,
} from "@/lib/welcomeStrip";

describe("welcomeStrip", () => {
  it("normalizes missing settings into 12 empty slots", () => {
    expect(normalizeWelcomeStripImages(null)).toEqual(Array.from({ length: WELCOME_STRIP_SLOT_COUNT }, () => ""));
  });

  it("keeps valid local paths and https URLs", () => {
    const result = normalizeWelcomeStripImages(JSON.stringify(["/uploads/a.png", "https://example.com/b.webp"]));

    expect(result[0]).toBe("/uploads/a.png");
    expect(result[1]).toBe("https://example.com/b.webp");
    expect(result).toHaveLength(WELCOME_STRIP_SLOT_COUNT);
  });

  it("drops invalid URLs while preserving slot count", () => {
    const result = normalizeWelcomeStripImages(JSON.stringify(["javascript:alert(1)", "not-a-url"]));

    expect(result[0]).toBe("");
    expect(result[1]).toBe("");
    expect(result).toHaveLength(WELCOME_STRIP_SLOT_COUNT);
  });

  it("serializes to exactly 12 validated slots", () => {
    const serialized = serializeWelcomeStripImages(["/uploads/a.png", "not-a-url"]);

    expect(JSON.parse(serialized)).toEqual(["/uploads/a.png", ...Array.from({ length: 11 }, () => "")]);
  });

  it("preserves added slots up to the welcome strip limit", () => {
    const images = Array.from({ length: WELCOME_STRIP_SLOT_COUNT + 2 }, (_, index) => `/uploads/welcome-${index}.png`);
    const serialized = serializeWelcomeStripImages(images);
    const normalized = normalizeWelcomeStripImages(serialized);

    expect(JSON.parse(serialized)).toHaveLength(WELCOME_STRIP_SLOT_COUNT + 2);
    expect(normalized).toHaveLength(WELCOME_STRIP_SLOT_COUNT + 2);
    expect(normalized.at(-1)).toBe(`/uploads/welcome-${WELCOME_STRIP_SLOT_COUNT + 1}.png`);
  });

  it("validates welcome strip JSON payloads", () => {
    expect(isValidWelcomeStripImagesJson(JSON.stringify(["/uploads/a.png"]))).toBe(true);
    expect(isValidWelcomeStripImagesJson(JSON.stringify(Array.from({ length: 13 }, () => "/uploads/a.png")))).toBe(true);
    expect(isValidWelcomeStripImagesJson(JSON.stringify(Array.from({ length: WELCOME_STRIP_MAX_SLOT_COUNT + 1 }, () => "/uploads/a.png")))).toBe(false);
    expect(isValidWelcomeStripImagesJson(JSON.stringify(["not-a-url"]))).toBe(false);
  });
});
