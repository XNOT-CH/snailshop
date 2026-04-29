import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { updateSetSpy } = vi.hoisted(() => ({
    updateSetSpy: vi.fn().mockReturnValue({ where: vi.fn() }),
}));

vi.mock("@/lib/auth", () => ({
    requirePermission: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
    db: {
        update: vi.fn().mockReturnValue({
            set: updateSetSpy,
        }),
        delete: vi.fn().mockReturnValue({
            where: vi.fn(),
        }),
        query: {
            helpArticles: { findFirst: vi.fn() },
            helpVideos: { findFirst: vi.fn() },
        },
    },
    helpArticles: { id: "id" },
    helpVideos: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
    eq: vi.fn(),
}));

vi.mock("@/lib/auditLog", () => ({
    auditFromRequest: vi.fn(),
    AUDIT_ACTIONS: {
        HELP_UPDATE: "HELP_UPDATE",
        HELP_DELETE: "HELP_DELETE",
    },
}));

vi.mock("@/lib/validations/validate", () => ({
    validateBody: vi.fn(),
}));

vi.mock("@/lib/validations/content", () => ({
    helpItemSchema: { partial: vi.fn().mockReturnValue({}) },
    helpVideoSchema: { partial: vi.fn().mockReturnValue({}) },
}));

vi.mock("@/lib/helpVideos", () => ({
    normalizeYouTubeVideo: vi.fn((url: string) => ({
        youtubeUrl: url,
        videoId: "video1234567",
    })),
}));

vi.mock("@/lib/utils/date", () => ({
    mysqlNow: vi.fn(() => "2026-04-26 12:34:56"),
}));

import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBody } from "@/lib/validations/validate";

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("help route regressions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        updateSetSpy.mockReturnValue({ where: vi.fn() });
        (requirePermission as any).mockResolvedValue({ success: true });
    });

    it("updates help article timestamps on PUT", async () => {
        (validateBody as any).mockResolvedValue({
            data: { title: "Updated", content: "Answer", sortOrder: 2, isActive: false },
        });
        (db.query.helpArticles.findFirst as any)
            .mockResolvedValueOnce({
                id: "h1",
                question: "Old",
                answer: "Old answer",
                category: "general",
                sortOrder: 0,
                isActive: true,
            })
            .mockResolvedValueOnce({ id: "h1", question: "Updated" });

        const { PUT } = await import("@/app/api/admin/help/[id]/route");
        const response = await PUT(new NextRequest("http://localhost/api/admin/help/h1", { method: "PUT" }), params("h1"));

        expect(response.status).toBe(200);
        expect(updateSetSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                question: "Updated",
                answer: "Answer",
                sortOrder: 2,
                isActive: false,
                updatedAt: "2026-04-26 12:34:56",
            }),
        );
    });

    it("updates help video timestamps on PUT", async () => {
        (validateBody as any).mockResolvedValue({
            data: { title: "New clip", youtubeUrl: "https://youtu.be/demo1234567", isActive: true },
        });
        (db.query.helpVideos.findFirst as any)
            .mockResolvedValueOnce({ id: "v1", title: "Old clip" })
            .mockResolvedValueOnce({ id: "v1", title: "New clip" });

        const { PUT } = await import("@/app/api/admin/help-videos/[id]/route");
        const response = await PUT(new Request("http://localhost/api/admin/help-videos/v1", { method: "PUT" }), params("v1"));

        expect(response.status).toBe(200);
        expect(updateSetSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "New clip",
                youtubeUrl: "https://youtu.be/demo1234567",
                videoId: "video1234567",
                isActive: true,
                updatedAt: "2026-04-26 12:34:56",
            }),
        );
    });
});
