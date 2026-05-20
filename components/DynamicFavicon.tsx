"use client";

import { useEffect } from "react";

interface DynamicFaviconProps {
    faviconUrl?: string | null;
}

export function DynamicFavicon({ faviconUrl }: Readonly<DynamicFaviconProps>) {
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
