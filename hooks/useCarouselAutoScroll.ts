"use client";

import { useEffect, useState, type RefObject } from "react";

export function useCarouselAutoScroll(
    containerRef: RefObject<HTMLElement | null>,
    itemCount: number,
) {
    const [canAutoScroll, setCanAutoScroll] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || itemCount <= 1) {
            return;
        }

        const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
        let isVisible = false;

        const updateEligibility = () => {
            setCanAutoScroll(
                isVisible
                && !reducedMotionQuery.matches
                && !coarsePointerQuery.matches
                && document.visibilityState === "visible",
            );
        };

        const observer = new IntersectionObserver(
            ([entry]) => {
                isVisible = Boolean(entry?.isIntersecting) && (entry?.intersectionRatio ?? 0) >= 0.35;
                updateEligibility();
            },
            { threshold: [0, 0.35] },
        );

        observer.observe(container);
        document.addEventListener("visibilitychange", updateEligibility);
        reducedMotionQuery.addEventListener("change", updateEligibility);
        coarsePointerQuery.addEventListener("change", updateEligibility);

        return () => {
            observer.disconnect();
            document.removeEventListener("visibilitychange", updateEligibility);
            reducedMotionQuery.removeEventListener("change", updateEligibility);
            coarsePointerQuery.removeEventListener("change", updateEligibility);
        };
    }, [containerRef, itemCount]);

    return itemCount > 1 && canAutoScroll;
}
