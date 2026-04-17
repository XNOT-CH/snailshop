"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

// Dynamic import with no SSR to ensure client-side only rendering
const AnnouncementPopup = dynamic(
    () => import("@/components/AnnouncementPopup"),
    { ssr: false }
);

interface AnnouncementPopupWrapperProps {
    readonly enabled?: boolean;
}

const HIDDEN_PATH_PREFIXES = ["/login", "/register"];

export function AnnouncementPopupWrapper({
    enabled = true,
}: Readonly<AnnouncementPopupWrapperProps>) {
    const pathname = usePathname();

    if (!enabled || HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        return null;
    }

    return <AnnouncementPopup />;
}

