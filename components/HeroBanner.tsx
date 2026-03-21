import { db } from "@/lib/db";
import { HeroBannerClient } from "./HeroBannerClient";
import ReactDOM from "react-dom";

// Next.js image optimization proxy prefix
function getNextImageUrl(src: string) {
    return `/_next/image?url=${encodeURIComponent(src)}&w=1920&q=85`;
}

export async function HeroBanner() {
    // Fetch settings from database
    const settings = await db.query.siteSettings.findFirst();

    // Default banners if no settings
    const banners = [
        {
            id: 1,
            image: settings?.bannerImage1 || "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=2000&h=500&fit=crop",
            title: settings?.bannerTitle1 ?? "",
            subtitle: settings?.bannerSubtitle1 ?? "",
        },
        {
            id: 2,
            image: settings?.bannerImage2 || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=2000&h=500&fit=crop",
            title: settings?.bannerTitle2 ?? "",
            subtitle: settings?.bannerSubtitle2 ?? "",
        },
        {
            id: 3,
            image: settings?.bannerImage3 || "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=2000&h=500&fit=crop",
            title: settings?.bannerTitle3 ?? "",
            subtitle: settings?.bannerSubtitle3 ?? "",
        },
    ].filter(b => b.image); // Only show banners with images

    // Parse extra banners from bannersJson
    if (settings?.bannersJson) {
        try {
            const extra = JSON.parse(settings.bannersJson);
            if (Array.isArray(extra)) {
                extra.forEach((b: { image?: string; title?: string; subtitle?: string }, i: number) => {
                    if (b.image) {
                        banners.push({
                            id: 4 + i,
                            image: b.image,
                            title: b.title ?? "",
                            subtitle: b.subtitle ?? "",
                        });
                    }
                });
            }
        } catch {
            // invalid JSON — ignore
        }
    }

    // Preload the first (LCP) banner image so fetchpriority=high is set in the HTML head
    // This makes the LCP image discoverable from the initial document even though
    // the carousel is a client component
    if (banners.length > 0) {
        ReactDOM.preload(getNextImageUrl(banners[0].image), {
            as: "image",
            fetchPriority: "high",
        });
    }

    return <HeroBannerClient banners={banners} />;
}

