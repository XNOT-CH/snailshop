"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { shouldShowPopup } from "@/lib/client/popupDismissal";
import type { PopupData } from "@/components/AnnouncementPopup";

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
    const [visiblePopupState, setVisiblePopupState] = useState<{
        pathname: string;
        popups: PopupData[];
    } | null>(null);
    const isHiddenPath = HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    const canLoadPopup = enabled && !isHiddenPath;
    const visiblePopups = canLoadPopup && visiblePopupState?.pathname === pathname
        ? visiblePopupState.popups
        : null;

    useEffect(() => {
        let cancelled = false;
        let idleCallbackId: number | null = null;

        if (!canLoadPopup) {
            return;
        }

        async function fetchVisiblePopups() {
            try {
                const response = await fetch("/api/popups");
                if (!response.ok) {
                    return;
                }

                const data = await response.json() as PopupData[];
                if (!cancelled && Array.isArray(data) && shouldShowPopup(data)) {
                    setVisiblePopupState({ pathname, popups: data });
                    return;
                }

                if (!cancelled) {
                    setVisiblePopupState((current) => current?.pathname === pathname ? null : current);
                }
            } catch (error) {
                if (process.env.NODE_ENV === "development") {
                    const message = error instanceof Error ? error.message : "unknown error";
                    console.warn(`Announcement popup prefetch skipped: ${message}`);
                }
            }
        }

        const timeoutId = window.setTimeout(() => {
            if ("requestIdleCallback" in window) {
                idleCallbackId = window.requestIdleCallback(() => {
                    void fetchVisiblePopups();
                }, { timeout: 1200 });
                return;
            }

            void fetchVisiblePopups();
        }, 1800);

        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
            if (idleCallbackId !== null) {
                window.cancelIdleCallback(idleCallbackId);
            }
        };
    }, [canLoadPopup, pathname]);

    if (!visiblePopups) {
        return null;
    }

    return <AnnouncementPopup initialPopups={visiblePopups} defaultVisible />;
}

