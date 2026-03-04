import { NextResponse } from "next/server";
import { db, newsArticles } from "@/lib/db";
import { eq, asc, desc } from "drizzle-orm";
import { invalidateNewsCaches } from "@/lib/cache";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get("active") === "true";
        const articles = await db.query.newsArticles.findMany({
            where: activeOnly ? eq(newsArticles.isActive, true) : undefined,
            orderBy: (t, { asc, desc }) => [asc(t.sortOrder), desc(t.createdAt)],
        });
        return NextResponse.json(articles);
    } catch {
        return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, description, imageUrl, link, sortOrder, isActive } = body;
        if (!title || !description) return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
        const newId = crypto.randomUUID();
        await db.insert(newsArticles).values({ id: newId, title, description, imageUrl: imageUrl || null, link: link || null, sortOrder: sortOrder ?? 0, isActive: isActive !== undefined ? isActive : true });
        const news = await db.query.newsArticles.findFirst({ where: eq(newsArticles.id, newId) });
        await invalidateNewsCaches();
        await auditFromRequest(request, { action: AUDIT_ACTIONS.NEWS_CREATE, resource: "NewsArticle", resourceId: newId, details: { title } });
        return NextResponse.json(news, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create news" }, { status: 500 });
    }
}
