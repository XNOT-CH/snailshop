import { describe, expect, it } from "vitest";
import { deleteManagedUpload, isManagedUploadPath, optimizeImageUpload, resolveManagedUploadPath, resolveManagedUploadPaths, validateImageFile } from "@/lib/serverImageUpload";

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

    it("accepts only managed upload paths inside the public profile directory", () => {
        expect(isManagedUploadPath("/uploads/profiles/avatar.webp", "/uploads/profiles")).toBe(true);
        expect(isManagedUploadPath("https://example.com/avatar.webp", "/uploads/profiles")).toBe(false);
        expect(isManagedUploadPath("/uploads/profiles/../avatar.webp", "/uploads/profiles")).toBe(false);
    });

    it("resolves managed upload paths into local files", () => {
        const resolved = resolveManagedUploadPath(
            "/uploads/profiles/avatar.webp",
            "C:/repo/public/uploads/profiles",
            "/uploads/profiles"
        );

        expect(resolved).toContain("avatar.webp");
        expect(resolveManagedUploadPath("https://example.com/avatar.webp", "C:/repo/public/uploads/profiles", "/uploads/profiles")).toBeNull();
    });

    it("returns false when deleting a missing managed upload", async () => {
        await expect(
            deleteManagedUpload("/uploads/profiles/missing.webp", "C:/repo/public/uploads/profiles", "/uploads/profiles")
        ).resolves.toBe(false);
    });

    it("includes legacy public upload paths as a fallback candidate", () => {
        const resolved = resolveManagedUploadPaths(
            "/uploads/profiles/avatar.webp",
            "C:/repo/storage/uploads/profiles",
            "/uploads/profiles"
        );

        expect(resolved.some((item) => item.endsWith("storage\\uploads\\profiles\\avatar.webp"))).toBe(true);
        expect(resolved.some((item) => item.endsWith("public\\uploads\\profiles\\avatar.webp"))).toBe(true);
    });
});
