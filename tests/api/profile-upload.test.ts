import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
    isAuthenticatedWithCsrf: vi.fn(),
}));

vi.mock("@/lib/serverImageUpload", () => ({
    saveOptimizedImageUpload: vi.fn(),
    deleteManagedUpload: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
    db: {
        query: {
            users: {
                findFirst: vi.fn(),
            },
        },
        update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue({}),
            }),
        }),
    },
    users: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
    eq: vi.fn(),
}));

import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { deleteManagedUpload, saveOptimizedImageUpload } from "@/lib/serverImageUpload";
import { db } from "@/lib/db";

describe("API: /api/profile/upload-image (POST)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (db.query.users.findFirst as any).mockResolvedValue({ image: "/uploads/profiles/old-avatar.webp" });
    });

    it("returns 401 when not authenticated", async () => {
        (isAuthenticatedWithCsrf as any).mockResolvedValue({ success: false, error: "Unauthorized" });
        const { POST } = await import("@/app/api/profile/upload-image/route");
        const request = new NextRequest("http://localhost/api/profile/upload-image", { method: "POST" });
        const response = await POST(request);

        expect(response.status).toBe(401);
    });

    it("returns 400 when no file is uploaded", async () => {
        (isAuthenticatedWithCsrf as any).mockResolvedValue({ success: true, userId: "u1" });
        const { POST } = await import("@/app/api/profile/upload-image/route");
        const formData = new FormData();
        const request = new NextRequest("http://localhost/api/profile/upload-image", {
            method: "POST",
            body: formData,
        });
        const response = await POST(request);

        expect(response.status).toBe(400);
    });

    it("uploads a profile image successfully", async () => {
        (isAuthenticatedWithCsrf as any).mockResolvedValue({ success: true, userId: "u1" });
        (saveOptimizedImageUpload as any).mockResolvedValue({
            url: "/uploads/profiles/avatar.webp",
            filename: "avatar.webp",
        });

        const { POST } = await import("@/app/api/profile/upload-image/route");
        const formData = new FormData();
        formData.append("file", new File(["image"], "avatar.png", { type: "image/png" }));
        const request = {
            formData: vi.fn().mockResolvedValue(formData),
            headers: new Headers({ "X-CSRF-Token": "token" }),
        } as any;
        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(body.success).toBe(true);
        expect(body.url).toBe("/uploads/profiles/avatar.webp");
        expect(db.update).toHaveBeenCalled();
        expect(deleteManagedUpload).toHaveBeenCalledWith(
            "/uploads/profiles/old-avatar.webp",
            expect.stringContaining("public"),
            "/uploads/profiles"
        );
    });

    it("returns 400 when optimizer rejects the file", async () => {
        (isAuthenticatedWithCsrf as any).mockResolvedValue({ success: true, userId: "u1" });
        (saveOptimizedImageUpload as any).mockRejectedValue(new Error("Invalid image file"));

        const { POST } = await import("@/app/api/profile/upload-image/route");
        const formData = new FormData();
        formData.append("file", new File(["oops"], "avatar.txt", { type: "text/plain" }));
        const request = {
            formData: vi.fn().mockResolvedValue(formData),
            headers: new Headers({ "X-CSRF-Token": "token" }),
        } as any;
        const response = await POST(request);

        expect(response.status).toBe(400);
    });

    it("clears the profile image successfully", async () => {
        (isAuthenticatedWithCsrf as any).mockResolvedValue({ success: true, userId: "u1" });

        const { DELETE } = await import("@/app/api/profile/upload-image/route");
        const request = {
            headers: new Headers({ "X-CSRF-Token": "token" }),
        } as any;
        const response = await DELETE(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(db.update).toHaveBeenCalled();
        expect(deleteManagedUpload).toHaveBeenCalled();
    });
});
