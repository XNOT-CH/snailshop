import { describe, expect, it } from "vitest";
import { serializeStructuredData } from "@/components/StructuredData";

describe("StructuredData", () => {
    it("escapes script-breaking characters in JSON-LD", () => {
        const serialized = serializeStructuredData({
            text: "</script><script>globalThis.__xss=1</script>",
            ampersand: "A&B",
        });

        expect(serialized).not.toContain("</script>");
        expect(serialized).not.toContain("<script>");
        expect(serialized).toContain("\\u003c/script\\u003e");
        expect(serialized).toContain("\\u0026");
    });

    it("preserves parseable JSON content", () => {
        const serialized = serializeStructuredData({ name: "ร้านเกม", count: 2 });

        expect(JSON.parse(serialized)).toEqual({ name: "ร้านเกม", count: 2 });
    });
});
