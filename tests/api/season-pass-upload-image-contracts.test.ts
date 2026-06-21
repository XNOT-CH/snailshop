import { beforeEach, describe, expect, it, vi } from "vitest";

const { getRuntimeUploadDirMock, requirePermissionMock, saveOptimizedImageUploadMock } = vi.hoisted(() => ({
    getRuntimeUploadDirMock: vi.fn((publicPath: string) => `runtime:${publicPath}`),
    requirePermissionMock: vi.fn(),
    saveOptimizedImageUploadMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    requirePermission: requirePermissionMock,
    requirePermissionWithCsrf: requirePermissionMock,
}));

vi.mock("@/lib/runtimeUploads", () => ({
    getRuntimeUploadDir: getRuntimeUploadDirMock,
}));

vi.mock("@/lib/serverImageUpload", () => ({
    saveOptimizedImageUpload: saveOptimizedImageUploadMock,
}));

function uploadRequest(file?: File) {
    const formData = new FormData();
    if (file) {
        formData.append("file", file);
    }

    return {
        formData: vi.fn().mockResolvedValue(formData),
    } as any;
}

describe("API: /api/admin/season-pass/upload-image", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it("preserves the existing unauthorized contract", async () => {
        requirePermissionMock.mockResolvedValue({ success: false, error: "Unauthorized" });
        const { POST } = await import("@/app/api/admin/season-pass/upload-image/route");

        const response = await POST(uploadRequest());

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            success: false,
            message: "Unauthorized",
        });
    });

    it("preserves the missing file contract", async () => {
        requirePermissionMock.mockResolvedValue({ success: true });
        const { POST } = await import("@/app/api/admin/season-pass/upload-image/route");

        const response = await POST(uploadRequest());

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            success: false,
            message: "ไม่พบไฟล์รูปที่อัปโหลด",
        });
    });

    it("preserves the upload success contract and options", async () => {
        requirePermissionMock.mockResolvedValue({ success: true });
        saveOptimizedImageUploadMock.mockResolvedValue({
            url: "/uploads/season-pass/reward.webp",
            filename: "reward.webp",
        });
        const file = new File(["image"], "reward.png", { type: "image/png" });
        const { POST } = await import("@/app/api/admin/season-pass/upload-image/route");

        const response = await POST(uploadRequest(file));

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            success: true,
            url: "/uploads/season-pass/reward.webp",
            filename: "reward.webp",
        });
        expect(saveOptimizedImageUploadMock).toHaveBeenCalledWith(file, {
            allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
            maxInputBytes: 5 * 1024 * 1024,
            maxDimension: 1080,
            outputQuality: 82,
            uploadDir: "runtime:/uploads/season-pass",
            publicPath: "/uploads/season-pass",
        });
    });

    it("preserves upload error status selection", async () => {
        requirePermissionMock.mockResolvedValue({ success: true });
        saveOptimizedImageUploadMock.mockRejectedValue(new Error("Invalid image file"));
        const file = new File(["bad"], "reward.txt", { type: "text/plain" });
        const { POST } = await import("@/app/api/admin/season-pass/upload-image/route");

        const response = await POST(uploadRequest(file));

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            success: false,
            message: "Invalid image file",
        });
    });

    it("preserves non-file upload errors as status 500", async () => {
        requirePermissionMock.mockResolvedValue({ success: true });
        saveOptimizedImageUploadMock.mockRejectedValue(new Error("Storage unavailable"));
        const file = new File(["image"], "reward.png", { type: "image/png" });
        const { POST } = await import("@/app/api/admin/season-pass/upload-image/route");

        const response = await POST(uploadRequest(file));

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({
            success: false,
            message: "Storage unavailable",
        });
    });
});
