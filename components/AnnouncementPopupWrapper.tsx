"use client";

import dynamic from "next/dynamic";

// Dynamic import with no SSR to ensure client-side only rendering
const AnnouncementPopup = dynamic(
    () => import("@/components/AnnouncementPopup"),
    { ssr: false }
);

export function AnnouncementPopupWrapper() {
    return <AnnouncementPopup />;
}

