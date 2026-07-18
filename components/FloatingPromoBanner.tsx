"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const HIDDEN_PATH_PREFIXES = ["/login", "/register", "/admin"];

// Clears the mobile bottom nav; nothing else floats in this corner since
// the chat FAB was removed (chat now opens from the navbar icon).
const MOBILE_STACK_OFFSET = "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]";

const ROTATE_INTERVAL_MS = 4000;

// Bump the ?v= querystring whenever the artwork file is replaced in-place —
// the image optimizer caches per-URL, so a same-name swap keeps serving the
// old pixels until the URL changes.
const PROMO_BANNERS = [
    {
        src: "/promo/daily-quest.png?v=2",
        alt: "ภารกิจรายวัน ทำง่าย ได้รางวัลทุกวัน คลิกเลย",
        href: "/quests",
        width: 530,
        height: 470,
    },
    {
        src: "/promo/free-rewards.png?v=2",
        alt: "ของฟรี แจกไม่อั้น รับได้ทุกวัน คลิกเลย",
        href: "/gachapons",
        width: 1112,
        height: 819,
    },
] as const;

// Module-level so the dismissal survives layout remounts within the same
// browsing session; a full page reload brings the banner back.
let dismissedThisSession = false;

export function FloatingPromoBanner() {
    const pathname = usePathname();
    const [dismissed, setDismissed] = useState(() => dismissedThisSession);
    const [activeIndex, setActiveIndex] = useState(0);
    const shouldHide = HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    useEffect(() => {
        if (dismissed || shouldHide) {
            return;
        }

        let timer: ReturnType<typeof setInterval> | undefined;
        const start = () => {
            if (timer === undefined) {
                timer = setInterval(
                    () => setActiveIndex((index) => (index + 1) % PROMO_BANNERS.length),
                    ROTATE_INTERVAL_MS
                );
            }
        };
        const stop = () => {
            clearInterval(timer);
            timer = undefined;
        };
        // Pause while the tab is hidden so the banner doesn't churn through
        // frames (or burn timers) in the background.
        const handleVisibility = () => (document.hidden ? stop() : start());

        start();
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            stop();
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [dismissed, shouldHide]);

    if (dismissed || shouldHide) {
        return null;
    }

    return (
        <div
            className={`fixed right-3 z-40 w-28 md:hidden ${MOBILE_STACK_OFFSET}`}
            role="complementary"
            aria-label="โปรโมชันแนะนำ"
        >
            <div className="animate-promo-banner-in relative aspect-square w-full">
                <button
                    type="button"
                    aria-label="ปิดแบนเนอร์โปรโมชัน"
                    onClick={() => {
                        dismissedThisSession = true;
                        setDismissed(true);
                    }}
                    className="absolute -right-1.5 -top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-white shadow-md transition hover:bg-black active:scale-90"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
                {PROMO_BANNERS.map((banner, index) => {
                    const isActive = index === activeIndex;

                    return (
                        <Link
                            key={banner.src}
                            href={banner.href}
                            prefetch={false}
                            aria-hidden={!isActive}
                            tabIndex={isActive ? 0 : -1}
                            className={cn(
                                "absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-500 active:scale-95 motion-reduce:transition-none",
                                isActive ? "opacity-100" : "pointer-events-none opacity-0"
                            )}
                        >
                            <Image
                                src={banner.src}
                                alt={banner.alt}
                                width={banner.width}
                                height={banner.height}
                                sizes="112px"
                                className="max-h-full w-auto max-w-full drop-shadow-lg"
                            />
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
