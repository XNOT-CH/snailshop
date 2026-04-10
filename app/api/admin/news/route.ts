import { mysqlNow } from "@/lib/utils/date";
import { NextResponse } from "next/server";
import { db, newsArticles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";
import { invalidateNewsCaches } from "@/lib/cache";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { validateBody } from "@/lib/validations/validate";
import { newsItemSchema } from "@/lib/validations/content";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(request: Request) {
    const authCheck = await requirePermission(PERMISSIONS.CONTENT_VIEW);
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get("active") === "true";
        const articles = await db.query.newsArticles.findMany({
            where: activeOnly ? eq(newsArticles.isActive, true) : undefined,
            orderBy: (t, { asc, desc }) => [asc(t.sortOrder), desc(t.createdAt)],
        });
        return NextResponse.json(articles);
    } catch (error) {
        console.error("[NEWS_GET]", error);
        return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authCheck = await requirePermission(PERMISSIONS.CONTENT_EDIT);
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
            createdAt: mysqlNow(),
            updatedAt: mysqlNow(),
        });
        const news = await db.query.newsArticles.findFirst({ where: eq(newsArticles.id, newId) });
        await invalidateNewsCaches();
        await auditFromRequest(request, { action: AUDIT_ACTIONS.NEWS_CREATE, resource: "NewsArticle", resourceId: newId, details: { title } });
        return NextResponse.json(news, { status: 201 });
    } catch (error) {
        console.error("[NEWS_POST]", error);
        return NextResponse.json({ error: "Failed to create news" }, { status: 500 });
    }
}
