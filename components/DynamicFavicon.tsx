"use client";

import { useEffect, useState } from "react";

export function DynamicFavicon() {
    const [faviconUrl, setFaviconUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchFavicon = async () => {
            try {
                const res = await fetch("/api/admin/settings");
                const data = await res.json();
                if (data.success && data.data?.logoUrl) {
                    setFaviconUrl(data.data.logoUrl);
                }
            } catch (error) {
                console.error("Failed to fetch favicon:", error);
            }
        };

        fetchFavicon();
    }, []);

    useEffect(() => {
        if (!faviconUrl) return;

        // Update existing favicon links or create new ones
        const updateFavicon = (selector: string, href: string) => {
            let link = document.querySelector(selector) as HTMLLinkElement;
            if (link) {
                link.href = href;
            } else {
                link = document.createElement("link");
                link.rel = selector.includes("apple") ? "apple-touch-icon" : "icon";
                link.href = href;
                document.head.appendChild(link);
            }
        };

        // Update standard favicon
        updateFavicon('link[rel="icon"]', faviconUrl);
        updateFavicon('link[rel="shortcut icon"]', faviconUrl);

        // Update apple touch icon
        updateFavicon('link[rel="apple-touch-icon"]', faviconUrl);

    }, [faviconUrl]);

    return null; // This component doesn't render anything
}
