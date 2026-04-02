import { cache } from "react";
import { db } from "@/lib/db";
import { SITE_SETTINGS_SINGLETON_ID } from "@/lib/db/singletons";

// React cache for siteSettings - deduplicates calls within a single request
export const getSiteSettings = cache(async () => {
    try {
        const settings =
            await db.query.siteSettings.findFirst({
                where: (t, { eq }) => eq(t.id, SITE_SETTINGS_SINGLETON_ID),
            })
            ?? await db.query.siteSettings.findFirst();

        return settings ?? null;
    } catch (error) {
        console.error("Error fetching site settings:", error);
        return null;
    }
});
