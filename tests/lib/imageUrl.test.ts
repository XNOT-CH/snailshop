import { describe, expect, it } from "vitest";
import { withImageVersion } from "@/lib/imageUrl";

describe("lib/imageUrl", () => {
    it("keeps local upload paths unchanged", () => {
        expect(withImageVersion("/uploads/profiles/avatar.webp", 123)).toBe("/uploads/profiles/avatar.webp");
    });

    it("adds a version query string to external urls", () => {
        expect(withImageVersion("https://example.com/avatar.webp", 123)).toBe("https://example.com/avatar.webp?v=123");
    });

    it("preserves existing query strings for external urls", () => {
        expect(withImageVersion("https://example.com/avatar.webp?size=small", 123)).toBe(
            "https://example.com/avatar.webp?size=small&v=123"
        );
    });
});
