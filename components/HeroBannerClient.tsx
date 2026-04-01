"use client";

import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback, useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Banner {
    id: number;
    image: string;
    title: string;
    subtitle: string;
}

interface HeroBannerClientProps {
    banners: Banner[];
}

export function HeroBannerClient({ banners }: Readonly<HeroBannerClientProps>) {
    const autoplayPlugin = useRef(
        Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })
    );

    const [emblaRef, emblaApi] = useEmblaCarousel(
        { loop: true, align: "start" },
        [autoplayPlugin.current]
    );

    const [isHovered, setIsHovered] = useState(false);

    // Scroll to previous slide
    const scrollPrev = useCallback(() => {
        emblaApi?.scrollPrev();
    }, [emblaApi]);

    // Scroll to next slide
    const scrollNext = useCallback(() => {
        emblaApi?.scrollNext();
    }, [emblaApi]);

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
            {/* Embla Carousel Container */}
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex">
                    {banners.map((banner) => (
                        <div
                            key={banner.id}
                            className="flex-[0_0_100%] min-w-0"
                        >
                            {/* Natural responsive image: scales with page width, maintains original aspect ratio */}
                            <div className="relative w-full overflow-hidden rounded-xl">
                                <Image
                                    src={banner.image}
                                    alt={banner.title}
                                    width={2000}
                                    height={500}
                                    sizes="100vw"
                                    className="w-full h-auto block rounded-xl"
                                    priority
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                            "https://placehold.co/2000x500/1e293b/f1f5f9?text=Banner";
                                    }}
                                />
                                {/* Gradient Overlay */}
                                {(banner.title || banner.subtitle) && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
                                )}
                                {/* Text Content */}
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

            {/* Navigation Arrows - Always visible on mobile, hover-reveal on desktop */}
            {banners.length > 1 && (
                <>
                    {/* Previous Button */}
                    <button
                        onClick={scrollPrev}
                        className={`
                            absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10
                            w-9 h-9 sm:w-12 sm:h-12 
                            flex items-center justify-center
                            bg-white/30 hover:bg-white/50 active:bg-white/60
                            backdrop-blur-sm
                            rounded-full
                            text-white
                            transition-all duration-300 ease-out
                            opacity-100 sm:opacity-0 sm:group-hover:opacity-100
                            sm:${isHovered ? "opacity-100 translate-x-0" : "-translate-x-4"}
                            focus:outline-none focus:ring-2 focus:ring-white/50
                            shadow-lg touch-manipulation
                        `}
                        aria-label="Previous slide"
                    >
                        <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
                    </button>

                    {/* Next Button */}
                    <button
                        onClick={scrollNext}
                        className={`
                            absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10
                            w-9 h-9 sm:w-12 sm:h-12 
                            flex items-center justify-center
                            bg-white/30 hover:bg-white/50 active:bg-white/60
                            backdrop-blur-sm
                            rounded-full
                            text-white
                            transition-all duration-300 ease-out
                            opacity-100 sm:opacity-0 sm:group-hover:opacity-100
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
