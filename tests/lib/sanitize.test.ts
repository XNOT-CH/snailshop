import { describe, it, expect } from "vitest";
import {
  sanitize,
  escapeHtml,
  sanitizeObject,
  isValidUrl,
  sanitizeUrl,
} from "@/lib/sanitize";

describe("sanitize utilities", () => {
  describe("sanitize", () => {
    it("returns empty string for empty input", () => {
      expect(sanitize("")).toBe("");
    });

    it("returns empty string for non-string input", () => {
      expect(sanitize(null as unknown as string)).toBe("");
      expect(sanitize(undefined as unknown as string)).toBe("");
      expect(sanitize(123 as unknown as string)).toBe("");
    });

    it("keeps normal text unchanged", () => {
      expect(sanitize("hello world")).toBe("hello world");
    });

    it("removes script tags including content", () => {
      expect(sanitize('<script>alert("xss")</script>')).toBe("");
    });

    it("removes iframe tags", () => {
      expect(sanitize('<iframe src="evil.com"></iframe>')).toBe("");
    });

    it("removes javascript: protocol", () => {
      expect(sanitize("javascript:alert(1)")).toBe("alert(1)");
    });

    it("removes event handlers", () => {
      expect(sanitize('onerror= "alert(1)"')).toBe('"alert(1)"');
    });

    it("removes object tags", () => {
      expect(sanitize("<object data='evil.swf'></object>")).toBe("");
    });

    it("removes embed tags", () => {
      expect(sanitize("<embed src='evil.swf'></embed>")).toBe("");
    });

    it("removes vbscript: protocol", () => {
      expect(sanitize("vbscript:msgbox")).toBe("msgbox");
    });

    it("removes data: URIs", () => {
      expect(sanitize("data:text/html,<h1>XSS</h1>")).toBe("text/html,<h1>XSS</h1>");
    });

    it("trims result", () => {
      expect(sanitize("  hello  ")).toBe("hello");
    });
  });

  describe("escapeHtml", () => {
    it("returns empty string for empty input", () => {
      expect(escapeHtml("")).toBe("");
    });

    it("returns empty string for non-string", () => {
      expect(escapeHtml(null as unknown as string)).toBe("");
    });

    it("escapes HTML special characters", () => {
      expect(escapeHtml("<div>")).toBe("&lt;div&gt;");
      expect(escapeHtml('a & "b"')).toBe("a &amp; &quot;b&quot;");
    });

    it("escapes single quotes and backticks", () => {
      const result = escapeHtml("it's `code`");
      expect(result).toContain("&#x27;");
      expect(result).toContain("&#x60;");
    });
  });

  describe("sanitizeObject", () => {
    it("sanitizes all string values in object", () => {
      const result = sanitizeObject({
        name: '<script>alert("x")</script>',
        count: 42,
      });
      expect(result.name).toBe("");
      expect(result.count).toBe(42);
    });

    it("does not modify non-string values", () => {
      const result = sanitizeObject({ flag: true, num: 123 });
      expect(result.flag).toBe(true);
      expect(result.num).toBe(123);
    });
  });

  describe("isValidUrl", () => {
    it("returns true for http URLs", () => {
      expect(isValidUrl("http://example.com")).toBe(true);
    });

    it("returns true for https URLs", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
    });

    it("returns false for javascript: URLs", () => {
      expect(isValidUrl("javascript:alert(1)")).toBe(false);
    });

    it("returns false for data: URLs", () => {
      expect(isValidUrl("data:text/html,<h1>x</h1>")).toBe(false);
    });

    it("returns false for invalid URLs", () => {
      expect(isValidUrl("not a url")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidUrl("")).toBe(false);
    });

    it("returns false for non-string", () => {
      expect(isValidUrl(null as unknown as string)).toBe(false);
    });
  });

  describe("sanitizeUrl", () => {
    it("returns valid https URL unchanged", () => {
      expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
    });

    it("strips javascript: and returns empty for invalid result", () => {
      expect(sanitizeUrl("javascript:alert(1)")).toBe("");
    });

    it("returns empty for empty input", () => {
      expect(sanitizeUrl("")).toBe("");
    });

    it("strips data: protocol", () => {
      expect(sanitizeUrl("data:text/html,<h1>x</h1>")).toBe("");
    });
  });
});
