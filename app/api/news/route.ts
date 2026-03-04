import { NextResponse } from "next/server";
import { db, newsArticles } from "@/lib/db";
import { eq, asc, desc } from "drizzle-orm";
import { cacheOrFetch, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export async function GET() {
    try {
        const news = await cacheOrFetch(
            CACHE_KEYS.NEWS_ARTICLES,
            async () => db.query.newsArticles.findMany({
                where: eq(newsArticles.isActive, true),
                orderBy: (t, { asc, desc }) => [asc(t.sortOrder), desc(t.createdAt)],
                limit: 6,
            }),
            CACHE_TTL.MEDIUM
        );
        return NextResponse.json(news);
    } catch (error) {
        console.error("Error fetching news:", error);
        return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
    }
}
