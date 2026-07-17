"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

const HIDDEN_PATH_PREFIXES = ["/login", "/register", "/admin"];

// Stacks above the chat FAB (52px tall at bottom offset 5.5rem) so the two
// floating elements never overlap on mobile.
const MOBILE_STACK_OFFSET = "bottom-[calc(env(safe-area-inset-bottom)+9.75rem)]";

const PROMO_BANNERS = [
    {
        src: "/promo/daily-quest.png",
        alt: "ภารกิจรายวัน ทำง่าย ได้รางวัลทุกวัน คลิกเลย",
        href: "/season-pass",
        width: 512,
        height: 472,
    },
    {
        src: "/promo/free-rewards.png",
        alt: "ของฟรี แจกไม่อั้น รับได้ทุกวัน คลิกเลย",
        href: "/gachapons",
        width: 760,
        height: 540,
    },
] as const;

// Module-level so the dismissal survives layout remounts within the same
// browsing session; a full page reload brings the banner back.
let dismissedThisSession = false;

export function FloatingPromoBanner() {
    const pathname = usePathname();
    const [dismissed, setDismissed] = useState(() => dismissedThisSession);
    const shouldHide = HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    if (dismissed || shouldHide) {
        return null;
    }

    return (
        <div
            className={`fixed right-3 z-40 flex w-28 flex-col gap-2 md:hidden ${MOBILE_STACK_OFFSET}`}
            role="complementary"
            aria-label="โปรโมชันแนะนำ"
        >
            <button
                type="button"
                aria-label="ปิดแบนเนอร์โปรโมชัน"
                onClick={() => {
                    dismissedThisSession = true;
                    setDismissed(true);
                }}
                className="animate-promo-banner-in absolute -right-1.5 -top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-white shadow-md transition hover:bg-black active:scale-90"
            >
                <X className="h-3.5 w-3.5" />
            </button>
            {PROMO_BANNERS.map((banner, index) => (
                <Link
                    key={banner.src}
                    href={banner.href}
                    prefetch={false}
                    className="animate-promo-banner-in block drop-shadow-lg transition-transform active:scale-95"
                    style={{ animationDelay: `${index * 120}ms` }}
                >
                    <Image
                        src={banner.src}
                        alt={banner.alt}
                        width={banner.width}
                        height={banner.height}
                        className="h-auto w-full"
                    />
                </Link>
            ))}
        </div>
    );
}
