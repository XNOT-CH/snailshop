"use client";

import dynamic from "next/dynamic";

// Dynamically import GlobalLoading with ssr:false inside a Client Component
// This avoids the hydration mismatch from useSearchParams() during SSR streaming
const GlobalLoadingClient = dynamic(
    () => import("@/components/GlobalLoading").then((m) => ({ default: m.GlobalLoading })),
    { ssr: false }
);

export function GlobalLoadingWrapper() {
    return <GlobalLoadingClient />;
}
