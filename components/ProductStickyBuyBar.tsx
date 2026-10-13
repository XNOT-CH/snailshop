"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ShoppingCart } from "lucide-react";

interface ProductStickyBuyBarProps {
    readonly priceLabel: string;
    /** id of the purchase section the bar stands in for. */
    readonly targetId: string;
}

// Phones only: while the purchase section is off-screen, a slim bar above the
// bottom nav shows the price and a button that scrolls to that section. It does
// not buy by itself — quantity, discount code and the required checkboxes all
// live in the section, so the button takes the buyer there instead of past them.
const subscribeNoop = () => () => {};

export function ProductStickyBuyBar({ priceLabel, targetId }: ProductStickyBuyBarProps) {
    const [visible, setVisible] = useState(false);
    // true on the client, false during SSR, without a mount-time state update.
    const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

    useEffect(() => {
        const target = document.getElementById(targetId);
        if (!target) return;

        // Shrink the viewport by the bottom nav plus the bar, so the section only
        // counts as seen once it clears them.
        const observer = new IntersectionObserver(
            ([entry]) => setVisible(!entry.isIntersecting),
            { rootMargin: "0px 0px -160px 0px" },
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, [targetId]);

    // Portalled to <body>: the page wrappers animate with a transform, which would
    // pin a fixed element to them instead of the screen.
    if (!mounted) return null;
    return createPortal(
        <div
            aria-hidden={!visible}
            className={`fixed inset-x-0 bottom-[var(--mobile-bottom-nav-height)] z-40 border-t border-border bg-card/95 px-4 py-2.5 backdrop-blur-xl transition-[translate,opacity] duration-300 ease-out motion-reduce:transition-none md:hidden ${
                visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
            }`}
        >
            <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-lg font-bold text-primary">{priceLabel}</span>
                <button
                    type="button"
                    tabIndex={visible ? 0 : -1}
                    onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity duration-300 ease-out hover:opacity-90"
                >
                    <ShoppingCart className="h-4 w-4" />
                    ซื้อเลย
                </button>
            </div>
        </div>,
        document.body,
    );
}
