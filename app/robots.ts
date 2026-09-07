import type { MetadataRoute } from "next";
import { absoluteUrl, getBaseUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                // "/r/" is the invite-link handler: no content of its own, just a
                // redirect that sets an attribution cookie. Nothing to index.
                disallow: ["/admin/", "/dashboard/", "/profile/", "/api/", "/login", "/register", "/r/"],
            },
        ],
        sitemap: absoluteUrl("/sitemap.xml"),
        host: getBaseUrl(),
    };
}
