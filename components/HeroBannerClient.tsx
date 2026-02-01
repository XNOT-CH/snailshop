"use client";

import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback, useEffect, useState, useRef } from "react";
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

export function HeroBannerClient({ banners }: HeroBannerClientProps) {
    const autoplayPlugin = useRef(
        Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })
    );

    const [emblaRef, emblaApi] = useEmblaCarousel(
        { loop: true, align: "start" },
        [autoplayPlugin.current]
    );

    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
    const [isHovered, setIsHovered] = useState(false);

    // Scroll to specific slide
    const scrollTo = useCallback(
        (index: number) => emblaApi && emblaApi.scrollTo(index),
        [emblaApi]
    );

    // Scroll to previous slide
    const scrollPrev = useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev();
    }, [emblaApi]);

    // Scroll to next slide
    const scrollNext = useCallback(() => {
        if (emblaApi) emblaApi.scrollNext();
    }, [emblaApi]);

    // Handle selection change
    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi]);

    // Initialize and setup listeners
    useEffect(() => {
        if (!emblaApi) return;

        setScrollSnaps(emblaApi.scrollSnapList());
        onSelect();

        emblaApi.on("select", onSelect);
        emblaApi.on("reInit", onSelect);

        return () => {
            emblaApi.off("select", onSelect);
            emblaApi.off("reInit", onSelect);
        };
    }, [emblaApi, onSelect]);

    if (banners.length === 0) {
        return null;
    }

    return (
        <div
            className="relative w-full group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Embla Carousel Container */}
            <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
                <div className="flex">
                    {banners.map((banner) => (
                        <div
                            key={banner.id}
                            className="flex-[0_0_100%] min-w-0"
                        >
                            <div
                                className="relative w-full overflow-hidden"
                                style={{ aspectRatio: "4/1" }}
                            >
                                <Image
                                    src={banner.image}
                                    alt={banner.title}
                                    fill
                                    className="object-cover"
                                    priority
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                            "https://placehold.co/2000x500/1e293b/f1f5f9?text=Banner";
                                    }}
                                />
                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

                                {/* Text Content */}
                                <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 lg:px-16">
                                    <h2 className="text-xl sm:text-3xl lg:text-5xl font-bold text-white mb-2 sm:mb-3">
                                        {banner.title}
                                    </h2>
                                    <p className="text-sm sm:text-lg lg:text-xl text-white/90 max-w-lg font-medium">
                                        {banner.subtitle}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation Arrows - Show on Hover */}
            {banners.length > 1 && (
                <>
                    {/* Previous Button */}
                    <button
                        onClick={scrollPrev}
                        className={`
                            absolute left-4 top-1/2 -translate-y-1/2 z-10
                            w-10 h-10 sm:w-12 sm:h-12 
                            flex items-center justify-center
                            bg-white/20 hover:bg-white/40 
                            backdrop-blur-sm
                            rounded-full
                            text-white
                            transition-all duration-300 ease-out
                            ${isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}
                            focus:outline-none focus:ring-2 focus:ring-white/50
                            shadow-lg
                        `}
                        aria-label="Previous slide"
                    >
                        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>

                    {/* Next Button */}
                    <button
                        onClick={scrollNext}
                        className={`
                            absolute right-4 top-1/2 -translate-y-1/2 z-10
                            w-10 h-10 sm:w-12 sm:h-12 
                            flex items-center justify-center
                            bg-white/20 hover:bg-white/40 
                            backdrop-blur-sm
                            rounded-full
                            text-white
                            transition-all duration-300 ease-out
                            ${isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}
                            focus:outline-none focus:ring-2 focus:ring-white/50
                            shadow-lg
                        `}
                        aria-label="Next slide"
                    >
                        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </>
            )}

            {/* Pagination Dots */}
            {banners.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                    {scrollSnaps.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => scrollTo(index)}
                            className={`
                                w-2.5 h-2.5 sm:w-3 sm:h-3 
                                rounded-full 
                                transition-all duration-300 ease-out
                                focus:outline-none focus:ring-2 focus:ring-white/50
                                ${index === selectedIndex
                                    ? "bg-white w-6 sm:w-8"
                                    : "bg-white/50 hover:bg-white/80"
                                }
                            `}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
