"use client";

import { useEffect, useRef, useState } from "react";

export function GameLoadingScreen() {
    const [width, setWidth] = useState(0);
    const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        // Quickly jump to ~20%, then crawl to 90% to fake "in-progress"
        setWidth(20);

        const steps = [40, 60, 75, 85, 90];
        let i = 0;

        animRef.current = setInterval(() => {
            if (i < steps.length) {
                setWidth(steps[i]);
                i++;
            } else {
                if (animRef.current) clearInterval(animRef.current);
            }
        }, 200);

        return () => {
            if (animRef.current) clearInterval(animRef.current);
        };
    }, []);

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
            aria-hidden="true"
        >
            <div
                className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.8)] transition-all duration-300 ease-out rounded-r-full"
                style={{ width: `${width}%` }}
            />
        </div>
    );
}
