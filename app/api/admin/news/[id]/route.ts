import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invalidateNewsCaches } from "@/lib/cache";
import { auditFromRequest, auditUpdate, AUDIT_ACTIONS } from "@/lib/auditLog";

// GET - ดึงข่าวสารตาม ID
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const news = await db.newsArticle.findUnique({
            where: { id },
        });

        if (!news) {
            return NextResponse.json(
                { error: "News not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(news);
    } catch (error) {
        console.error("Error fetching news:", error);
        return NextResponse.json(
            { error: "Failed to fetch news" },
            { status: 500 }
        );
    }
}

// PUT - อัพเดทข่าวสาร
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { title, description, imageUrl, link, sortOrder, isActive } = body;

        // Get old data for change tracking
        const oldNews = await db.newsArticle.findUnique({
            where: { id },
        });

        if (!oldNews) {
            return NextResponse.json(
                { error: "News not found" },
                { status: 404 }
            );
        }

        const news = await db.newsArticle.update({
            where: { id },
            data: {
                title,
                description,
                imageUrl,
                link,
                sortOrder,
                isActive,
            },
        });

        // Invalidate cache
        await invalidateNewsCaches();

        // Audit log with change tracking
        await auditUpdate(request, {
            action: AUDIT_ACTIONS.NEWS_UPDATE,
            resource: "NewsArticle",
            resourceId: id,
            resourceName: oldNews.title,
            oldData: oldNews as Record<string, unknown>,
            newData: { title, description, imageUrl, link, sortOrder, isActive },
            fieldsToTrack: ["title", "description", "imageUrl", "link", "sortOrder", "isActive"],
        });

        return NextResponse.json(news);
    } catch (error) {
        console.error("Error updating news:", error);
        return NextResponse.json(
            { error: "Failed to update news" },
            { status: 500 }
        );
    }
}

// DELETE - ลบข่าวสาร
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Get news data before delete for audit
        const news = await db.newsArticle.findUnique({
            where: { id },
        });

        if (!news) {
            return NextResponse.json(
                { error: "News not found" },
                { status: 404 }
            );
        }

        await db.newsArticle.delete({
            where: { id },
        });

        // Invalidate cache
        await invalidateNewsCaches();

        // Audit log with deleted data
        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.NEWS_DELETE,
            resource: "NewsArticle",
            resourceId: id,
            resourceName: news.title,
            details: {
                deletedData: {
                    title: news.title,
                    isActive: news.isActive,
                },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting news:", error);
        return NextResponse.json(
            { error: "Failed to delete news" },
            { status: 500 }
        );
    }
}
