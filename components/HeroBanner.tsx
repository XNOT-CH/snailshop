import { HeroBannerClient } from "./HeroBannerClient";
import ReactDOM from "react-dom";
import { getImageProps } from "next/image";
import { getSiteSettings } from "@/lib/getSiteSettings";

export async function HeroBanner() {
    const settings = await getSiteSettings();

    // No placeholder image per slot: a slot the admin cleared has to fall out of
    // the list, and a hardcoded fallback made `filter` below unreachable — every
    // slot always had an image, so the hero was permanently three slides wide
    // whatever the admin did. A fresh install still gets three demo banners;
    // they are seeded into the settings row on first read, not invented here.
    const banners = [
        {
            id: 1,
            image: settings?.bannerImage1 ?? "",
            title: settings?.bannerTitle1 ?? "",
            subtitle: settings?.bannerSubtitle1 ?? "",
        },
        {
            id: 2,
            image: settings?.bannerImage2 ?? "",
            title: settings?.bannerTitle2 ?? "",
            subtitle: settings?.bannerSubtitle2 ?? "",
        },
        {
            id: 3,
            image: settings?.bannerImage3 ?? "",
            title: settings?.bannerTitle3 ?? "",
            subtitle: settings?.bannerSubtitle3 ?? "",
        },
    ].filter(b => b.image.trim() !== "");

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
    // the carousel is a client component. getImageProps mirrors the exact
    // srcset/sizes the <Image> in HeroBannerClient renders — keep the two in
    // sync, otherwise the browser downloads the hero twice.
    if (banners.length > 0) {
        const { props: heroImageProps } = getImageProps({
            src: banners[0].image,
            alt: "",
            fill: true,
            sizes: "(max-width: 1024px) 100vw, 1200px",
            quality: 65,
        });

        ReactDOM.preload(heroImageProps.src, {
            as: "image",
            imageSrcSet: heroImageProps.srcSet,
            imageSizes: heroImageProps.sizes,
            fetchPriority: "high",
        });
    }

    // Nothing to show at all: render no element rather than an empty 4:1 strip,
    // which would leave a bar of blank space at the top of the homepage.
    if (banners.length === 0) {
        return null;
    }

    // The hero is a 4:1 strip whichever component fills it, so the space is
    // reserved here — no child swap can change the page height.
    return (
        <div className="w-full max-w-[2000px] mx-auto aspect-[4/1]">
            <HeroBannerClient banners={banners} />
        </div>
    );
}

