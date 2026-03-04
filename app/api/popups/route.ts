import { NextResponse } from "next/server";
import { db, announcementPopups } from "@/lib/db";
import { eq, asc, desc } from "drizzle-orm";
import { cacheOrFetch, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export async function GET() {
    try {
        const popups = await cacheOrFetch(
            CACHE_KEYS.ANNOUNCEMENT_POPUPS,
            async () => db.select({
                id: announcementPopups.id,
                title: announcementPopups.title,
                imageUrl: announcementPopups.imageUrl,
                linkUrl: announcementPopups.linkUrl,
                dismissOption: announcementPopups.dismissOption,
            }).from(announcementPopups)
                .where(eq(announcementPopups.isActive, true))
                .orderBy(asc(announcementPopups.sortOrder), desc(announcementPopups.createdAt)),
            CACHE_TTL.MEDIUM
        );
        return NextResponse.json(popups);
    } catch (error) {
        console.error("Error fetching popups:", error);
        return NextResponse.json({ error: "Failed to fetch popups" }, { status: 500 });
    }
}
