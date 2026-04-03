import { describe, expect, it } from "vitest";
import { optimizeImageUpload, validateImageFile } from "@/lib/serverImageUpload";

const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aR0YAAAAASUVORK5CYII=";
const GIF_BASE64 = "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function fileFromBase64(base64: string, name: string, type: string) {
    return new File([Buffer.from(base64, "base64")], name, { type });
}

describe("lib/serverImageUpload", () => {
    it("rejects unsupported file types", () => {
        const file = new File(["hello"], "note.txt", { type: "text/plain" });

        expect(() =>
            validateImageFile(file, {
                allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
                maxInputBytes: 5 * 1024 * 1024,
            })
        ).toThrow(/Invalid file type/);
    });

    it("optimizes PNG uploads into WebP output", async () => {
        const file = fileFromBase64(PNG_BASE64, "tiny.png", "image/png");

        const result = await optimizeImageUpload(file, {
            allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
            maxInputBytes: 5 * 1024 * 1024,
            maxDimension: 1080,
        });

        expect(result.mimeType).toBe("image/webp");
        expect(result.filename.endsWith(".webp")).toBe(true);
        expect(result.buffer.length).toBeGreaterThan(0);
    });

    it("keeps GIF uploads in their original format", async () => {
        const file = fileFromBase64(GIF_BASE64, "tiny.gif", "image/gif");

        const result = await optimizeImageUpload(file, {
            allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
            maxInputBytes: 5 * 1024 * 1024,
            preserveAnimation: true,
        });

        expect(result.mimeType).toBe("image/gif");
        expect(result.filename.endsWith(".gif")).toBe(true);
        expect(result.buffer.equals(Buffer.from(GIF_BASE64, "base64"))).toBe(true);
    });
});
