"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface RevealOnScrollProps {
    children: ReactNode;
    index?: number;
    className?: string;
}

export function RevealOnScroll({ children, index = 0, className }: Readonly<RevealOnScrollProps>) {
    const ref = useRef<HTMLDivElement>(null);
    const [revealed, setRevealed] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }

        // prefers-reduced-motion is handled in CSS: the reveal-on-scroll rules
        // are overridden to be fully visible with no transition, so the
        // observer toggling is-revealed becomes a visual no-op there.
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setRevealed(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "0px 0px -120px 0px" },
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={`reveal-on-scroll${revealed ? " is-revealed" : ""}${className ? ` ${className}` : ""}`}
            style={{ transitionDelay: revealed ? `${Math.min(index, 8) * 0.07}s` : undefined }}
        >
            {children}
        </div>
    );
}
