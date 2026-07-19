"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import {
    markPopupSeen,
    shouldShowPopup,
} from "@/lib/client/popupDismissal";
import { toSafePublicHref } from "@/lib/sanitize";

export interface PopupData {
    id: string;
    title: string | null;
    imageUrl: string;
    linkUrl: string | null;
    dismissOption: string;
}

interface AnnouncementPopupProps {
    initialPopups?: PopupData[];
    defaultVisible?: boolean;
}

const CLOSE_ANIMATION_MS = 220;

export default function AnnouncementPopup({
    initialPopups,
    defaultVisible = false,
}: Readonly<AnnouncementPopupProps> = {}) {
    const [popups, setPopups] = useState<PopupData[]>(() => initialPopups ?? []);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(defaultVisible);
    const [isClosing, setIsClosing] = useState(false);
    const [isLoaded, setIsLoaded] = useState(Boolean(initialPopups));
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch popups on mount
    useEffect(() => {
        if (initialPopups) {
            return;
        }

        let isMounted = true;

        const fetchPopups = async () => {
            try {
                const res = await fetch("/api/popups");

                if (res.ok) {
                    const data = await res.json() as PopupData[];

                    if (isMounted && data && data.length > 0) {
                        setPopups(data);

                        if (shouldShowPopup(data)) {
                            // Small delay before showing for smoother UX
                            setTimeout(() => {
                                if (isMounted) {
                                    setIsVisible(true);
                                }
                            }, 500);
                        }
                    }
                }
            } catch (error) {
                if (process.env.NODE_ENV === "development") {
                    const message = error instanceof Error ? error.message : "unknown error";
                    console.warn(`Announcement popup fetch skipped: ${message}`);
                }
            } finally {
                if (isMounted) {
                    setIsLoaded(true);
                }
            }
        };

        void fetchPopups();

        return () => {
            isMounted = false;
        };
    }, [initialPopups]);

    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);

    // Lock background scroll while the popup is open (matches NavigationDrawer).
    // Released as soon as the close fade-out starts, not when it finishes.
    useEffect(() => {
        if (!isVisible || isClosing) {
            return;
        }
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isVisible, isClosing]);

    // Handle close: play the fade-out, then unmount
    const handleClose = () => {
        if (isClosing) {
            return;
        }
        // Persist the "seen" state per the popup's dismiss option (no-op for
        // show_always). Marking also happens at display time in the wrapper, so
        // this mainly covers the standalone-mount path.
        markPopupSeen(popups);
        setIsClosing(true);
        closeTimeoutRef.current = setTimeout(() => {
            setIsVisible(false);
            setIsClosing(false);
        }, CLOSE_ANIMATION_MS);
    };

    // Handle image click (open link)
    const handleImageClick = () => {
        const currentPopup = popups[currentIndex];
        const safeLinkUrl = toSafePublicHref(currentPopup?.linkUrl, "");
        if (safeLinkUrl) {
            globalThis.open(safeLinkUrl, "_blank", "noopener,noreferrer");
        }
    };

    // Navigate carousel
    const goToPrevious = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === 0 ? popups.length - 1 : prev - 1));
    };

    const goToNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === popups.length - 1 ? 0 : prev + 1));
    };

    // Don't render anything if not loaded or no popups
    if (!isLoaded || popups.length === 0 || !isVisible) {
        return null;
    }

    const currentPopup = popups[currentIndex];
    const currentPopupLinkUrl = toSafePublicHref(currentPopup.linkUrl, "");
    const hasMultiple = popups.length > 1;

    return (
        <div
            className={`announcement-overlay fixed inset-0 z-[9999] flex items-center justify-center p-4${isClosing ? " is-closing" : ""}`}
            onClick={handleClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/62" />

            {/* Popup Content with Bounce Animation */}
            <div
                className="announcement-card relative max-w-[90vw] max-h-[90vh] w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="announcement-close absolute -top-3 -right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-card/95 text-foreground shadow-xl shadow-black/25 transition-[background-color,scale] hover:bg-accent hover:scale-110 active:scale-90"
                    aria-label="ปิด"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Image Container */}
                {currentPopupLinkUrl ? (
                    <div className="relative w-full aspect-square overflow-hidden rounded-3xl border border-white/10 bg-card/95 shadow-[0_28px_60px_-26px_rgba(0,0,0,0.75)]">
                        <button
                            type="button"
                            className="absolute inset-0 z-0 cursor-pointer"
                            onClick={handleImageClick}
                            aria-label={currentPopup.title ? `เปิดลิงก์ ${currentPopup.title}` : "เปิดลิงก์ประชาสัมพันธ์"}
                        />
                        <Image
                            src={currentPopup.imageUrl}
                            alt={currentPopup.title || "ประชาสัมพันธ์"}
                            fill
                            sizes="(max-width: 768px) 90vw, 500px"
                            className="object-cover"
                            loading="lazy"
                            fetchPriority="low"
                        />

                        {/* Carousel Navigation */}
                        {hasMultiple && (
                            <>
                                <button
                                    onClick={goToPrevious}
                                    className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition-[background-color,scale] hover:bg-black/65 hover:scale-110 active:scale-90"
                                    aria-label="รูปก่อนหน้า"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={goToNext}
                                    className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition-[background-color,scale] hover:bg-black/65 hover:scale-110 active:scale-90"
                                    aria-label="รูปถัดไป"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>

                                {/* Dot Indicators */}
                                <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                                    {popups.map((popup, index) => (
                                        <button
                                            key={popup.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCurrentIndex(index);
                                            }}
                                            className={`w-2.5 h-2.5 rounded-full transition-all hover:scale-[1.3] ${index === currentIndex
                                                ? "scale-[1.2] bg-primary shadow-[0_0_0_4px_rgba(88,166,255,0.18)]"
                                                : "bg-white/35 hover:bg-primary/75"
                                                }`}
                                            aria-label={`ไปที่รูปที่ ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="relative w-full aspect-square overflow-hidden rounded-3xl border border-white/10 bg-card/95 shadow-[0_28px_60px_-26px_rgba(0,0,0,0.75)]">
                        <Image
                            src={currentPopup.imageUrl}
                            alt={currentPopup.title || "ประชาสัมพันธ์"}
                            fill
                            sizes="(max-width: 768px) 90vw, 500px"
                            className="object-cover"
                            loading="lazy"
                            fetchPriority="low"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
