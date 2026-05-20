"use client";

import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Banner {
    id: number;
    image: string;
    title: string;
    subtitle: string;
}

interface HeroBannerCarouselProps {
    banners: Banner[];
}

export function HeroBannerCarousel({ banners }: Readonly<HeroBannerCarouselProps>) {
    const autoplayPlugin = useRef(
        Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })
    );

    const [emblaRef, emblaApi] = useEmblaCarousel(
        { loop: true, align: "start" },
        [autoplayPlugin.current]
    );

    const [isHovered, setIsHovered] = useState(false);
    const [loadedBannerIndexes, setLoadedBannerIndexes] = useState<Set<number>>(() => new Set([0]));

    const markNearbyBannersLoaded = useCallback((index: number) => {
        if (banners.length <= 1) return;

        setLoadedBannerIndexes((current) => {
            const next = new Set(current);
            next.add(index);
            next.add((index + 1) % banners.length);
            next.add((index - 1 + banners.length) % banners.length);
            return next;
        });
    }, [banners.length]);

    const scrollPrev = useCallback(() => {
        emblaApi?.scrollPrev();
    }, [emblaApi]);

    const scrollNext = useCallback(() => {
        emblaApi?.scrollNext();
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;

        const onSelect = () => markNearbyBannersLoaded(emblaApi.selectedScrollSnap());
        const preloadTimer = window.setTimeout(onSelect, 2400);
        emblaApi.on("select", onSelect);

        return () => {
            window.clearTimeout(preloadTimer);
            emblaApi.off("select", onSelect);
        };
    }, [emblaApi, markNearbyBannersLoaded]);

    if (banners.length === 0) {
        return null;
    }

    return (
        <section
            aria-label="Featured Banners Carosuel"
            className="relative w-full max-w-[2000px] mx-auto group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
            /* NOSONAR */ tabIndex={0}
        >
            <div
                className="overflow-hidden rounded-md [backface-visibility:hidden] [transform:translateZ(0)]"
                ref={emblaRef}
            >
                <div className="flex">
                    {banners.map((banner, index) => (
                        <div
                            key={banner.id}
                            className="flex-[0_0_100%] min-w-0"
                        >
                            <div className="progressive-image-placeholder relative aspect-[4/1] w-full overflow-hidden rounded-md [backface-visibility:hidden] [clip-path:inset(0_round_0.375rem)] [transform:translateZ(0)]">
                                {loadedBannerIndexes.has(index) && (
                                    <Image
                                        src={banner.image}
                                        alt={banner.title}
                                        fill
                                        sizes="100vw"
                                        className="object-cover [backface-visibility:hidden] [transform:translateZ(0)]"
                                        priority={index === 0}
                                        fetchPriority={index === 0 ? "high" : "low"}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src =
                                                "https://placehold.co/2000x500/1e293b/f1f5f9?text=Banner";
                                        }}
                                    />
                                )}
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
                    ))}
                </div>
            </div>

            {banners.length > 1 && (
                <>
                    <button
                        onClick={scrollPrev}
                        className={`
                            absolute left-2 sm:left-4 top-1/2 z-10
                            hidden h-9 w-9 -translate-y-1/2 items-center justify-center sm:flex sm:h-12 sm:w-12
                            bg-white/30 hover:bg-white/50 active:bg-white/60
                            rounded-full
                            text-white
                            transition-[opacity,transform,background-color,backdrop-filter] duration-300 ease-out
                            group-hover:backdrop-blur-sm
                            opacity-0 group-hover:opacity-100
                            sm:${isHovered ? "opacity-100 translate-x-0" : "-translate-x-4"}
                            focus:outline-none focus:ring-2 focus:ring-white/50
                            shadow-lg touch-manipulation
                        `}
                        aria-label="Previous slide"
                    >
                        <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
                    </button>

                    <button
                        onClick={scrollNext}
                        className={`
                            absolute right-2 sm:right-4 top-1/2 z-10
                            hidden h-9 w-9 -translate-y-1/2 items-center justify-center sm:flex sm:h-12 sm:w-12
                            bg-white/30 hover:bg-white/50 active:bg-white/60
                            rounded-full
                            text-white
                            transition-[opacity,transform,background-color,backdrop-filter] duration-300 ease-out
                            group-hover:backdrop-blur-sm
                            opacity-0 group-hover:opacity-100
                            sm:${isHovered ? "opacity-100 translate-x-0" : "translate-x-4"}
                            focus:outline-none focus:ring-2 focus:ring-white/50
                            shadow-lg touch-manipulation
                        `}
                        aria-label="Next slide"
                    >
                        <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" />
                    </button>
                </>
            )}
        </section>
    );
}
