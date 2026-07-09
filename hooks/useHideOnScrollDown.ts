"use client";

import { useEffect, useRef, useState } from "react";

const SCROLL_DELTA_THRESHOLD = 12;
const ALWAYS_VISIBLE_TOP = 120;

export function useHideOnScrollDown() {
    const [isHidden, setIsHidden] = useState(false);
    const lastScrollYRef = useRef(0);

    useEffect(() => {
        lastScrollYRef.current = globalThis.scrollY;

        const handleScroll = () => {
            const currentY = globalThis.scrollY;
            const delta = currentY - lastScrollYRef.current;

            if (Math.abs(delta) < SCROLL_DELTA_THRESHOLD) {
                return;
            }

            lastScrollYRef.current = currentY;

            if (currentY <= ALWAYS_VISIBLE_TOP) {
                setIsHidden(false);
                return;
            }

            setIsHidden(delta > 0);
        };

        globalThis.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            globalThis.removeEventListener("scroll", handleScroll);
        };
    }, []);

    return isHidden;
}
