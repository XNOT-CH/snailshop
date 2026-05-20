import { describe, expect, it, vi, beforeEach } from "vitest";

const { requirePermissionMock, saveOptimizedImageUploadMock, getRuntimeUploadDirMock } = vi.hoisted(() => ({
    requirePermissionMock: vi.fn(),
    saveOptimizedImageUploadMock: vi.fn(),
    getRuntimeUploadDirMock: vi.fn((publicPath: string) => `runtime:${publicPath}`),
}));

vi.mock("@/lib/auth", () => ({
    requirePermission: requirePermissionMock,
}));

vi.mock("@/lib/serverImageUpload", () => ({
    saveOptimizedImageUpload: saveOptimizedImageUploadMock,
}));

vi.mock("@/lib/runtimeUploads", () => ({
    getRuntimeUploadDir: getRuntimeUploadDirMock,
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

describe("API: /api/admin/gacha-machines/upload-image", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns the existing unauthorized contract", async () => {
        requirePermissionMock.mockResolvedValue({ success: false, error: "Unauthorized" });
        const { POST } = await import("@/app/api/admin/gacha-machines/upload-image/route");

        const response = await POST(uploadRequest());

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            success: false,
            message: "Unauthorized",
        });
    });

    it("returns the existing missing file contract", async () => {
        requirePermissionMock.mockResolvedValue({ success: true });
        const { POST } = await import("@/app/api/admin/gacha-machines/upload-image/route");

        const response = await POST(uploadRequest());

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            success: false,
            message: "ไม่พบไฟล์ที่อัปโหลด",
        });
    });

    it("preserves the machine upload success contract and options", async () => {
        requirePermissionMock.mockResolvedValue({ success: true });
        saveOptimizedImageUploadMock.mockResolvedValue({
            url: "/uploads/gacha-machines/machine.webp",
            filename: "machine.webp",
        });
        const file = new File(["image"], "machine.png", { type: "image/png" });
        const { POST } = await import("@/app/api/admin/gacha-machines/upload-image/route");

        const response = await POST(uploadRequest(file));

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            success: true,
            url: "/uploads/gacha-machines/machine.webp",
            filename: "machine.webp",
        });
        expect(saveOptimizedImageUploadMock).toHaveBeenCalledWith(file, {
            allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
            maxInputBytes: 5 * 1024 * 1024,
            maxDimension: 1080,
            outputQuality: 82,
            uploadDir: "runtime:/uploads/gacha-machines",
            publicPath: "/uploads/gacha-machines",
        });
    });
});

describe("API: /api/admin/gacha-rewards/upload-image", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("preserves the reward upload success contract and options", async () => {
        requirePermissionMock.mockResolvedValue({ success: true });
        saveOptimizedImageUploadMock.mockResolvedValue({
            url: "/uploads/gacha/reward.webp",
            filename: "reward.webp",
        });
        const file = new File(["image"], "reward.png", { type: "image/png" });
        const { POST } = await import("@/app/api/admin/gacha-rewards/upload-image/route");

        const response = await POST(uploadRequest(file));

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            success: true,
            url: "/uploads/gacha/reward.webp",
            filename: "reward.webp",
        });
        expect(saveOptimizedImageUploadMock).toHaveBeenCalledWith(file, {
            allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
            maxInputBytes: 5 * 1024 * 1024,
            maxDimension: 1080,
            outputQuality: 82,
            uploadDir: "runtime:/uploads/gacha",
            publicPath: "/uploads/gacha",
        });
    });

    it("preserves upload error status selection", async () => {
        requirePermissionMock.mockResolvedValue({ success: true });
        saveOptimizedImageUploadMock.mockRejectedValue(new Error("Invalid image file"));
        const { POST } = await import("@/app/api/admin/gacha-rewards/upload-image/route");

        const response = await POST(uploadRequest(new File(["bad"], "reward.txt", { type: "text/plain" })));

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            success: false,
            message: "Invalid image file",
        });
    });
});
