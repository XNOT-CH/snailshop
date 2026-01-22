"use client";

import Image from "next/image";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";

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
    const plugin = useRef(Autoplay({ delay: 5000, stopOnInteraction: true }));

    if (banners.length === 0) {
        return null;
    }

    return (
        <Carousel
            plugins={[plugin.current]}
            className="w-full"
            opts={{ loop: true }}
        >
            <CarouselContent>
                {banners.map((banner) => (
                    <CarouselItem key={banner.id}>
                        <div className="relative w-full overflow-hidden rounded-2xl shadow-lg" style={{ aspectRatio: "4/1" }}>
                            <Image
                                src={banner.image}
                                alt={banner.title}
                                fill
                                className="object-cover"
                                priority
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://placehold.co/2000x500/1e293b/f1f5f9?text=Banner";
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
                    </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious className="left-4 bg-white/90 hover:bg-white border-0 text-slate-900 shadow-lg" />
            <CarouselNext className="right-4 bg-white/90 hover:bg-white border-0 text-slate-900 shadow-lg" />
        </Carousel>
    );
}
