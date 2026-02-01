import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invalidateNewsCaches } from "@/lib/cache";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

// GET - ดึงข่าวสารทั้งหมด
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get("active") === "true";

        const news = await db.newsArticle.findMany({
            where: activeOnly ? { isActive: true } : undefined,
            orderBy: [
                { sortOrder: "asc" },
                { createdAt: "desc" },
            ],
        });

        return NextResponse.json(news);
    } catch (error) {
        console.error("Error fetching news:", error);
        return NextResponse.json(
            { error: "Failed to fetch news" },
            { status: 500 }
        );
    }
}

// POST - สร้างข่าวสารใหม่
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, description, imageUrl, link, sortOrder, isActive } = body;

        if (!title || !description) {
            return NextResponse.json(
                { error: "Title and description are required" },
                { status: 400 }
            );
        }

        const news = await db.newsArticle.create({
            data: {
                title,
                description,
                imageUrl: imageUrl || null,
                link: link || null,
                sortOrder: sortOrder || 0,
                isActive: isActive !== undefined ? isActive : true,
            },
        });

        // Invalidate cache
        await invalidateNewsCaches();

        // Audit log
        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.NEWS_CREATE,
            resource: "NewsArticle",
            resourceId: news.id,
            details: { title },
        });

        return NextResponse.json(news, { status: 201 });
    } catch (error) {
        console.error("Error creating news:", error);
        return NextResponse.json(
            { error: "Failed to create news" },
            { status: 500 }
        );
    }
}
