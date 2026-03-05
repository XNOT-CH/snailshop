import { NextResponse } from "next/server";
import { db, newsArticles } from "@/lib/db";
import { eq, asc, desc } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { invalidateNewsCaches } from "@/lib/cache";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { validateBody } from "@/lib/validations/validate";
import { newsItemSchema } from "@/lib/validations/content";

export async function GET(request: Request) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const result = await validateBody(request, newsItemSchema);
        if ("error" in result) return result.error;
        const { title, description, imageUrl, link, sortOrder, isActive } = result.data;

        const newId = crypto.randomUUID();
        await db.insert(newsArticles).values({
            id: newId, title, description,
            imageUrl: imageUrl || null, link: link || null,
            sortOrder, isActive,
        });
        const news = await db.query.newsArticles.findFirst({ where: eq(newsArticles.id, newId) });
        await invalidateNewsCaches();
        await auditFromRequest(request, { action: AUDIT_ACTIONS.NEWS_CREATE, resource: "NewsArticle", resourceId: newId, details: { title } });
        return NextResponse.json(news, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create news" }, { status: 500 });
    }
}
