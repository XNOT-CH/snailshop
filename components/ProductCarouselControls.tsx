"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCarouselAutoScroll } from "@/hooks/useCarouselAutoScroll";

interface ProductCarouselControlsProps {
    children: ReactNode;
    header: ReactNode;
    itemCount: number;
    intervalMs: number;
    scrollLabel: string;
    containerClassName: string;
}

export function ProductCarouselControls({
    children,
    header,
    itemCount,
    intervalMs,
    scrollLabel,
    containerClassName,
}: Readonly<ProductCarouselControlsProps>) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const canAutoScroll = useCarouselAutoScroll(scrollContainerRef, itemCount);

    const scroll = useCallback((direction: "left" | "right") => {
        if (!scrollContainerRef.current) {
            return;
        }

        const container = scrollContainerRef.current;
        const firstCard = container.querySelector<HTMLElement>(":scope > div");
        const scrollAmount = firstCard ? firstCard.offsetWidth + 16 : 200;

        if (direction === "right") {
            const maxScroll = container.scrollWidth - container.clientWidth;
            if (container.scrollLeft >= maxScroll - 10) {
                container.scrollTo({ left: 0, behavior: "smooth" });
                return;
            }
        }

        container.scrollBy({
            left: direction === "left" ? -scrollAmount : scrollAmount,
            behavior: "smooth",
        });
    }, []);

    useEffect(() => {
        if (!canAutoScroll) {
            return;
        }

        const interval = window.setInterval(() => {
            scroll("right");
        }, intervalMs);

        return () => window.clearInterval(interval);
    }, [canAutoScroll, intervalMs, scroll]);

    return (
        <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                {header}
                <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="icon" className="rounded-full" onClick={() => scroll("left")} aria-label={`เลื่อน${scrollLabel}ไปทางซ้าย`}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full" onClick={() => scroll("right")} aria-label={`เลื่อน${scrollLabel}ไปทางขวา`}>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                className={containerClassName}
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {children}
            </div>
        </>
    );
}
