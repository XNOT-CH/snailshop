import { cache } from "react";
import { db } from "@/lib/db";

// React cache for siteSettings - deduplicates calls within a single request
export const getSiteSettings = cache(async () => {
    try {
        const settings = await db.siteSettings.findFirst();
        return settings;
    } catch (error) {
        console.error("Error fetching site settings:", error);
        return null;
    }
});
