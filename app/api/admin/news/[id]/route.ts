import { NextResponse } from "next/server";
import { db, newsArticles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { invalidateNewsCaches } from "@/lib/cache";
import { auditFromRequest, auditUpdate, AUDIT_ACTIONS } from "@/lib/auditLog";
import { validateBody } from "@/lib/validations/validate";
import { newsItemSchema } from "@/lib/validations/content";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const { id } = await params;
        const news = await db.query.newsArticles.findFirst({ where: eq(newsArticles.id, id) });
        if (!news) return NextResponse.json({ error: "News not found" }, { status: 404 });
        return NextResponse.json(news);
    } catch { return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 }); }
}

export async function PUT(request: Request, { params }: RouteParams) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const { id } = await params;
        const result = await validateBody(request, newsItemSchema.partial());
        if ("error" in result) return result.error;
        const { title, description, imageUrl, link, sortOrder, isActive } = result.data;

        const oldNews = await db.query.newsArticles.findFirst({ where: eq(newsArticles.id, id) });
        if (!oldNews) return NextResponse.json({ error: "News not found" }, { status: 404 });
        await db.update(newsArticles).set({ title, description, imageUrl, link, sortOrder, isActive }).where(eq(newsArticles.id, id));
        await invalidateNewsCaches();
        await auditUpdate(request, { action: AUDIT_ACTIONS.NEWS_UPDATE, resource: "NewsArticle", resourceId: id, resourceName: oldNews.title, oldData: oldNews as Record<string, unknown>, newData: { title, description, imageUrl, link, sortOrder, isActive }, fieldsToTrack: ["title", "description", "imageUrl", "link", "sortOrder", "isActive"] });
        const updated = await db.query.newsArticles.findFirst({ where: eq(newsArticles.id, id) });
        return NextResponse.json(updated);
    } catch { return NextResponse.json({ error: "Failed to update news" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: RouteParams) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const { id } = await params;
        const news = await db.query.newsArticles.findFirst({ where: eq(newsArticles.id, id) });
        if (!news) return NextResponse.json({ error: "News not found" }, { status: 404 });
        await db.delete(newsArticles).where(eq(newsArticles.id, id));
        await invalidateNewsCaches();
        await auditFromRequest(request, { action: AUDIT_ACTIONS.NEWS_DELETE, resource: "NewsArticle", resourceId: id, resourceName: news.title, details: { deletedData: { title: news.title, isActive: news.isActive } } });
        return NextResponse.json({ success: true });
    } catch { return NextResponse.json({ error: "Failed to delete news" }, { status: 500 }); }
}
