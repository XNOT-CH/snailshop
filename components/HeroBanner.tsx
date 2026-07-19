import { HeroBannerClient } from "./HeroBannerClient";
import ReactDOM from "react-dom";
import { getImageProps } from "next/image";
import { getSiteSettings } from "@/lib/getSiteSettings";

export async function HeroBanner() {
    const settings = await getSiteSettings();

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

    return <HeroBannerClient banners={banners} />;
}

