import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    auditFromRequestMock,
    dbMock,
    deleteWhereMock,
    insertValuesMock,
    normalizeYouTubeVideoMock,
    requirePermissionMock,
    updateSetMock,
    updateWhereMock,
    validateBodyMock,
} = vi.hoisted(() => {
    const auditFromRequestMock = vi.fn();
    const deleteWhereMock = vi.fn();
    const insertValuesMock = vi.fn();
    const updateWhereMock = vi.fn();
    const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));

    const dbMock = {
        insert: vi.fn(() => ({ values: insertValuesMock })),
        update: vi.fn(() => ({ set: updateSetMock })),
        delete: vi.fn(() => ({ where: deleteWhereMock })),
        query: {
            helpArticles: {
                findFirst: vi.fn(),
                findMany: vi.fn(),
            },
            helpVideos: {
                findFirst: vi.fn(),
                findMany: vi.fn(),
            },
        },
    };

    return {
        auditFromRequestMock,
        dbMock,
        deleteWhereMock,
        insertValuesMock,
        normalizeYouTubeVideoMock: vi.fn(),
        requirePermissionMock: vi.fn(),
        updateSetMock,
        updateWhereMock,
        validateBodyMock: vi.fn(),
    };
});

vi.mock("@/lib/auth", () => ({
    requirePermission: requirePermissionMock,
}));

vi.mock("@/lib/db", () => ({
    db: dbMock,
    helpArticles: {
        category: "category",
        id: "id",
        sortOrder: "sortOrder",
    },
    helpVideos: {
        createdAt: "createdAt",
        id: "id",
        isActive: "isActive",
        sortOrder: "sortOrder",
    },
}));

vi.mock("drizzle-orm", () => ({
    asc: vi.fn((value) => value),
    desc: vi.fn((value) => value),
    eq: vi.fn(),
}));

vi.mock("@/lib/auditLog", () => ({
    AUDIT_ACTIONS: {
        HELP_CREATE: "HELP_CREATE",
        HELP_DELETE: "HELP_DELETE",
        HELP_UPDATE: "HELP_UPDATE",
    },
    auditFromRequest: auditFromRequestMock,
}));

vi.mock("@/lib/helpVideos", () => ({
    normalizeYouTubeVideo: normalizeYouTubeVideoMock,
}));

vi.mock("@/lib/utils/date", () => ({
    mysqlNow: vi.fn(() => "2026-05-14 00:00:00"),
}));

vi.mock("@/lib/validations/content", () => ({
    helpItemSchema: {
        partial: vi.fn(() => ({})),
    },
    helpVideoSchema: {
        partial: vi.fn(() => ({})),
    },
}));

vi.mock("@/lib/validations/validate", () => ({
    validateBody: validateBodyMock,
}));

const ADMIN_OK = { success: true, userId: "admin-1" };
const UNAUTHORIZED = { success: false, error: "Unauthorized" };

const routeParams = (id: string) => ({ params: Promise.resolve({ id }) });
const request = (url: string, method = "GET") => new Request(url, { method });

describe("admin help/help-videos API response contracts", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        requirePermissionMock.mockResolvedValue(ADMIN_OK);
        validateBodyMock.mockResolvedValue({
            data: {
                title: "คู่มือ",
                content: "คำตอบ",
                category: "general",
                youtubeUrl: "https://youtu.be/demo1234567",
                sortOrder: 1,
                isActive: true,
            },
        });
        normalizeYouTubeVideoMock.mockReturnValue({
            youtubeUrl: "https://www.youtube.com/watch?v=demo1234567",
            videoId: "demo1234567",
        });
    });

    it("preserves admin help list raw success and fallback error contracts", async () => {
        const article = { id: "help-1", question: "FAQ" };
        dbMock.query.helpArticles.findMany.mockResolvedValue([article]);
        const { GET } = await import("@/app/api/admin/help/route");

        const response = await GET();

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual([article]);

        vi.resetModules();
        dbMock.query.helpArticles.findMany.mockRejectedValueOnce(new Error("help db offline"));
        const { GET: getWithError } = await import("@/app/api/admin/help/route");
        const errorResponse = await getWithError();

        expect(errorResponse.status).toBe(500);
        await expect(errorResponse.json()).resolves.toEqual([]);
    });

    it("preserves admin help create and detail error contracts", async () => {
        requirePermissionMock.mockResolvedValueOnce(UNAUTHORIZED);
        const { POST } = await import("@/app/api/admin/help/route");
        const unauthorizedResponse = await POST(request("http://localhost/api/admin/help", "POST"));

        expect(unauthorizedResponse.status).toBe(401);
        await expect(unauthorizedResponse.json()).resolves.toEqual({ error: "Unauthorized" });

        vi.resetModules();
        insertValuesMock.mockRejectedValueOnce(new Error("help insert offline"));
        const { POST: postWithError } = await import("@/app/api/admin/help/route");
        const createErrorResponse = await postWithError(request("http://localhost/api/admin/help", "POST"));

        expect(createErrorResponse.status).toBe(500);
        await expect(createErrorResponse.json()).resolves.toEqual({ error: "Failed to create article" });

        vi.resetModules();
        dbMock.query.helpArticles.findFirst.mockResolvedValueOnce(null);
        const { PUT } = await import("@/app/api/admin/help/[id]/route");
        const notFoundResponse = await PUT(request("http://localhost/api/admin/help/help-1", "PUT"), routeParams("help-1"));

        expect(notFoundResponse.status).toBe(404);
        await expect(notFoundResponse.json()).resolves.toEqual({ error: "Article not found" });

        vi.resetModules();
        dbMock.query.helpArticles.findFirst.mockResolvedValueOnce({ id: "help-1", question: "FAQ", category: "general" });
        const { DELETE } = await import("@/app/api/admin/help/[id]/route");
        const deleteResponse = await DELETE(request("http://localhost/api/admin/help/help-1", "DELETE"), routeParams("help-1"));

        expect(deleteResponse.status).toBe(200);
        await expect(deleteResponse.json()).resolves.toEqual({ success: true });
    });

    it("preserves admin help-videos raw success and error contracts", async () => {
        const video = { id: "video-1", title: "How to top up" };
        dbMock.query.helpVideos.findMany.mockResolvedValue([video]);
        const { GET } = await import("@/app/api/admin/help-videos/route");

        const response = await GET(request("http://localhost/api/admin/help-videos"));

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual([video]);

        vi.resetModules();
        dbMock.query.helpVideos.findMany.mockRejectedValueOnce(new Error("video db offline"));
        const { GET: getWithError } = await import("@/app/api/admin/help-videos/route");
        const errorResponse = await getWithError(request("http://localhost/api/admin/help-videos"));

        expect(errorResponse.status).toBe(500);
        await expect(errorResponse.json()).resolves.toEqual({ error: "Failed to fetch help videos" });

        vi.resetModules();
        normalizeYouTubeVideoMock.mockReturnValueOnce(null);
        const { POST } = await import("@/app/api/admin/help-videos/route");
        const invalidResponse = await POST(request("http://localhost/api/admin/help-videos", "POST"));

        expect(invalidResponse.status).toBe(400);
        await expect(invalidResponse.json()).resolves.toEqual({ error: "Invalid YouTube URL" });
    });

    it("preserves admin help-videos detail error and delete success contracts", async () => {
        dbMock.query.helpVideos.findFirst.mockResolvedValueOnce(null);
        const { PUT } = await import("@/app/api/admin/help-videos/[id]/route");
        const notFoundResponse = await PUT(request("http://localhost/api/admin/help-videos/video-1", "PUT"), routeParams("video-1"));

        expect(notFoundResponse.status).toBe(404);
        await expect(notFoundResponse.json()).resolves.toEqual({ error: "Help video not found" });

        vi.resetModules();
        dbMock.query.helpVideos.findFirst.mockResolvedValueOnce({ id: "video-1", title: "Old video" });
        normalizeYouTubeVideoMock.mockReturnValueOnce(null);
        const { PUT: putInvalidUrl } = await import("@/app/api/admin/help-videos/[id]/route");
        const invalidUrlResponse = await putInvalidUrl(
            request("http://localhost/api/admin/help-videos/video-1", "PUT"),
            routeParams("video-1"),
        );

        expect(invalidUrlResponse.status).toBe(400);
        await expect(invalidUrlResponse.json()).resolves.toEqual({ error: "Invalid YouTube URL" });

        vi.resetModules();
        dbMock.query.helpVideos.findFirst.mockResolvedValueOnce({ id: "video-1", title: "Old video" });
        const { DELETE } = await import("@/app/api/admin/help-videos/[id]/route");
        const deleteResponse = await DELETE(request("http://localhost/api/admin/help-videos/video-1", "DELETE"), routeParams("video-1"));

        expect(deleteResponse.status).toBe(200);
        await expect(deleteResponse.json()).resolves.toEqual({ success: true });

        vi.resetModules();
        dbMock.query.helpVideos.findFirst.mockRejectedValueOnce(new Error("video delete offline"));
        const { DELETE: deleteWithError } = await import("@/app/api/admin/help-videos/[id]/route");
        const deleteErrorResponse = await deleteWithError(
            request("http://localhost/api/admin/help-videos/video-1", "DELETE"),
            routeParams("video-1"),
        );

        expect(deleteErrorResponse.status).toBe(500);
        await expect(deleteErrorResponse.json()).resolves.toEqual({ error: "Failed to delete help video" });
    });
});
