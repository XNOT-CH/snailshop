import { cache } from "react";
import { db } from "@/lib/db";
import { SITE_SETTINGS_SINGLETON_ID } from "@/lib/db/singletons";
import { cacheOrFetch, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

// React `cache()` dedupes calls within a single request; the Redis layer
// (cacheOrFetch) caches across requests so the shared (site) layout — which
// calls this on every page load — doesn't hit MySQL each time. The cache is
// cleared by invalidateSettingsCaches() in the admin settings PUT handler, so
// edits show up immediately; the long TTL is just a safety backstop.
export const getSiteSettings = cache(async () => {
    return cacheOrFetch(
        CACHE_KEYS.SITE_SETTINGS,
        async () => {
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
        },
        CACHE_TTL.LONG,
    );
});
