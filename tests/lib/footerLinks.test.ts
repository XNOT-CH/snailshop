import { describe, expect, it } from "vitest";
import { isUnsafePublicFooterHref, sanitizePublicFooterLinks } from "@/lib/footerLinks";

describe("footer link sanitization", () => {
  it("allows relative and normal https links", () => {
    expect(isUnsafePublicFooterHref("/help")).toBe(false);
    expect(isUnsafePublicFooterHref("https://example.com/contact")).toBe(false);
  });

  it("rejects loopback and malformed links", () => {
    expect(isUnsafePublicFooterHref("http://localhost:3000/")).toBe(true);
    expect(isUnsafePublicFooterHref("http://127.0.0.1:3001/")).toBe(true);
    expect(isUnsafePublicFooterHref("notaurl")).toBe(true);
  });

  it("filters invalid public footer links out of the rendered set", () => {
    const result = sanitizePublicFooterLinks([
      { id: "1", label: "Help", href: "/help", openInNewTab: false },
      { id: "2", label: "Local", href: "http://localhost:3000/", openInNewTab: true },
      { id: "3", label: "Facebook", href: "https://facebook.com/example", openInNewTab: true },
    ]);

    expect(result).toEqual([
      { id: "1", label: "Help", href: "/help", openInNewTab: false },
      { id: "3", label: "Facebook", href: "https://facebook.com/example", openInNewTab: true },
    ]);
  });
});
