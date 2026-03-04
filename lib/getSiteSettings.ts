import { cache } from "react";
import { db, siteSettings } from "@/lib/db";

// React cache for siteSettings - deduplicates calls within a single request
export const getSiteSettings = cache(async () => {
    try {
        const settings = await db.query.siteSettings.findFirst();
        return settings ?? null;
    } catch (error) {
        console.error("Error fetching site settings:", error);
        return null;
    }
});
