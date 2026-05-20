"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";

interface Banner {
    id: number;
    image: string;
    title: string;
    subtitle: string;
}

interface HeroBannerClientProps {
    banners: Banner[];
}

const HeroBannerCarousel = dynamic(
    () => import("@/components/HeroBannerCarousel").then((mod) => mod.HeroBannerCarousel),
    { ssr: false },
);

function StaticHeroBanner({
    banner,
    onActivate,
}: Readonly<{
    banner: Banner;
    onActivate: () => void;
}>) {
    return (
        <section
            aria-label="Featured Banners Carosuel"
            className="relative w-full max-w-[2000px] mx-auto group"
            onPointerEnter={onActivate}
            onFocus={onActivate}
        >
            <div className="overflow-hidden rounded-md [backface-visibility:hidden] [transform:translateZ(0)]">
                <div className="progressive-image-placeholder relative aspect-[4/1] w-full overflow-hidden rounded-md [backface-visibility:hidden] [clip-path:inset(0_round_0.375rem)] [transform:translateZ(0)]">
                    <Image
                        src={banner.image}
                        alt={banner.title}
                        fill
                        sizes="100vw"
                        className="object-cover [backface-visibility:hidden] [transform:translateZ(0)]"
                        priority
                        fetchPriority="high"
                    />
                    {(banner.title || banner.subtitle) && (
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
                    )}
                    {(banner.title || banner.subtitle) && (
                        <div className="absolute inset-0 flex flex-col justify-center px-4 sm:px-12 lg:px-16">
                            {banner.title && (
                                <h2 className="mb-1 max-w-[70%] text-sm font-bold text-white drop-shadow-lg sm:mb-3 sm:max-w-[60%] sm:text-3xl lg:max-w-none lg:text-5xl">
                                    {banner.title}
                                </h2>
                            )}
                            {banner.subtitle && (
                                <p className="max-w-[75%] text-xs font-medium text-white/90 drop-shadow sm:max-w-lg sm:text-lg lg:text-xl">
                                    {banner.subtitle}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

export function HeroBannerClient({ banners }: Readonly<HeroBannerClientProps>) {
    const [shouldLoadCarousel, setShouldLoadCarousel] = useState(false);
    const firstBanner = banners[0];

    useEffect(() => {
        if (banners.length <= 1) {
            return;
        }

        let idleCallbackId: number | null = null;
        const timeoutId = window.setTimeout(() => {
            if ("requestIdleCallback" in window) {
                idleCallbackId = window.requestIdleCallback(() => setShouldLoadCarousel(true), { timeout: 3000 });
                return;
            }

            setShouldLoadCarousel(true);
        }, 2500);

        return () => {
            window.clearTimeout(timeoutId);
            if (idleCallbackId !== null) {
                window.cancelIdleCallback(idleCallbackId);
            }
        };
    }, [banners.length]);

    if (!firstBanner) {
        return null;
    }

    if (shouldLoadCarousel) {
        return <HeroBannerCarousel banners={banners} />;
    }

    return <StaticHeroBanner banner={firstBanner} onActivate={() => setShouldLoadCarousel(true)} />;
}
