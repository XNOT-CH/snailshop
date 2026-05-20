"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Dynamically import GlobalLoading with ssr:false inside a Client Component
// This avoids the hydration mismatch from useSearchParams() during SSR streaming
const GlobalLoadingClient = dynamic(
    () => import("@/components/GlobalLoading").then((m) => ({ default: m.GlobalLoading })),
    { ssr: false }
);

export function GlobalLoadingWrapper() {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        let idleCallbackId: number | null = null;
        const timeoutId = window.setTimeout(() => {
            if ("requestIdleCallback" in window) {
                idleCallbackId = window.requestIdleCallback(() => setIsReady(true), { timeout: 3000 });
                return;
            }

            setIsReady(true);
        }, 2500);

        return () => {
            window.clearTimeout(timeoutId);
            if (idleCallbackId !== null) {
                window.cancelIdleCallback(idleCallbackId);
            }
        };
    }, []);

    return isReady ? <GlobalLoadingClient /> : null;
}
