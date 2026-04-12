import { mysqlNow } from "@/lib/utils/date";
import { NextResponse } from "next/server";
import { db, helpVideos } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";
import { validateBody } from "@/lib/validations/validate";
import { helpVideoSchema } from "@/lib/validations/content";
import { normalizeYouTubeVideo } from "@/lib/helpVideos";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(request: Request) {
    const authCheck = await requirePermission(PERMISSIONS.CONTENT_VIEW);
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get("active") === "true";

        const videos = await db.query.helpVideos.findMany({
            where: activeOnly ? eq(helpVideos.isActive, true) : undefined,
            orderBy: (table, { asc, desc }) => [asc(table.sortOrder), desc(table.createdAt)],
        });

        return NextResponse.json(videos);
    } catch (error) {
        console.error("[HELP_VIDEOS_GET]", error);
        return NextResponse.json({ error: "Failed to fetch help videos" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authCheck = await requirePermission(PERMISSIONS.CONTENT_EDIT);
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const result = await validateBody(request, helpVideoSchema);
        if ("error" in result) return result.error;

        const { title, youtubeUrl, sortOrder, isActive } = result.data;
        const normalizedVideo = normalizeYouTubeVideo(youtubeUrl);

        if (!normalizedVideo) {
            return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
        }

        const newId = crypto.randomUUID();
        await db.insert(helpVideos).values({
            id: newId,
            title,
            youtubeUrl: normalizedVideo.youtubeUrl,
            videoId: normalizedVideo.videoId,
            sortOrder,
            isActive,
            createdAt: mysqlNow(),
            updatedAt: mysqlNow(),
        });

        const video = await db.query.helpVideos.findFirst({ where: eq(helpVideos.id, newId) });
        return NextResponse.json(video, { status: 201 });
    } catch (error) {
        console.error("[HELP_VIDEOS_POST]", error);
        return NextResponse.json({ error: "Failed to create help video" }, { status: 500 });
    }
}
