import type { MetadataRoute } from "next";
import { absoluteUrl, getBaseUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/admin/", "/dashboard/", "/profile/", "/api/", "/login", "/register"],
            },
        ],
        sitemap: absoluteUrl("/sitemap.xml"),
        host: getBaseUrl(),
    };
}
