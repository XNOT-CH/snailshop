import { NextResponse } from "next/server";
import { db, helpVideos } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requirePermissionWithCsrf } from "@/lib/auth";
import { validateBody } from "@/lib/validations/validate";
import { helpVideoSchema, type HelpVideoInput } from "@/lib/validations/content";
import { normalizeYouTubeVideo } from "@/lib/helpVideos";
import { PERMISSIONS } from "@/lib/permissions";
import { mysqlNow } from "@/lib/utils/date";
import { contentApiError } from "@/lib/features/content/apiResponse";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteParams) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.CONTENT_EDIT);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });

    try {
        const { id } = await params;
        const result = await validateBody(request, helpVideoSchema.partial());
        if ("error" in result) return result.error;

        const { title, youtubeUrl, sortOrder, isActive } = result.data as Partial<HelpVideoInput>;
        const existing = await db.query.helpVideos.findFirst({ where: eq(helpVideos.id, id) });
        if (!existing) return contentApiError("Help video not found", { status: 404 });

        const updateData: Record<string, unknown> = {};
        if (title) updateData.title = title;
        if (typeof sortOrder === "number") updateData.sortOrder = sortOrder;
        if (typeof isActive === "boolean") updateData.isActive = isActive;

        if (youtubeUrl) {
            const normalizedVideo = normalizeYouTubeVideo(youtubeUrl);
            if (!normalizedVideo) {
                return contentApiError("Invalid YouTube URL", { status: 400 });
            }

            updateData.youtubeUrl = normalizedVideo.youtubeUrl;
            updateData.videoId = normalizedVideo.videoId;
        }

        updateData.updatedAt = mysqlNow();
        await db.update(helpVideos).set(updateData).where(eq(helpVideos.id, id));
        const updated = await db.query.helpVideos.findFirst({ where: eq(helpVideos.id, id) });
        return NextResponse.json(updated);
    } catch (error) {
        console.error("[HELP_VIDEOS_PUT]", error);
        return contentApiError("Failed to update help video", { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: RouteParams) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.CONTENT_EDIT);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });

    try {
        const { id } = await params;
        const existing = await db.query.helpVideos.findFirst({ where: eq(helpVideos.id, id) });
        if (!existing) return contentApiError("Help video not found", { status: 404 });

        await db.delete(helpVideos).where(eq(helpVideos.id, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[HELP_VIDEOS_DELETE]", error);
        return contentApiError("Failed to delete help video", { status: 500 });
    }
}
