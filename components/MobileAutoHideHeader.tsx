"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface MobileAutoHideHeaderProps {
    children: React.ReactNode;
}

const MOBILE_BREAKPOINT = 768;
const SCROLL_DELTA_THRESHOLD = 8;
const TOP_REVEAL_OFFSET = 24;

export function MobileAutoHideHeader({ children }: Readonly<MobileAutoHideHeaderProps>) {
    const pathname = usePathname();
    const [isHidden, setIsHidden] = useState(false);
    const forceVisible =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/profile");

    useEffect(() => {
        if (forceVisible) {
            setIsHidden(false);
            return;
        }

        let lastScrollY = window.scrollY;

        const handleScroll = () => {
            if (window.innerWidth >= MOBILE_BREAKPOINT) {
                setIsHidden(false);
                lastScrollY = window.scrollY;
                return;
            }

            const currentScrollY = window.scrollY;
            const scrollDelta = currentScrollY - lastScrollY;

            if (currentScrollY <= TOP_REVEAL_OFFSET) {
                setIsHidden(false);
            } else if (scrollDelta > SCROLL_DELTA_THRESHOLD) {
                setIsHidden(true);
            } else if (scrollDelta < -SCROLL_DELTA_THRESHOLD) {
                setIsHidden(false);
            }

            lastScrollY = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        window.addEventListener("resize", handleScroll);
        handleScroll();

        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", handleScroll);
        };
    }, [forceVisible]);

    return (
        <div
            className={`sticky top-0 z-50 w-full transition-transform duration-300 ease-out md:translate-y-0 ${isHidden ? "-translate-y-full" : "translate-y-0"}`}
        >
            {children}
        </div>
    );
}
