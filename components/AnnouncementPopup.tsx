"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PopupData {
    id: string;
    title: string | null;
    imageUrl: string;
    linkUrl: string | null;
    dismissOption: string;
}

const DISMISS_STORAGE_KEY = "popup_dismissed_until";
const DISMISS_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface PopupDismissState {
    dismissUntil: number;
    popupIds: string[];
}

function readDismissState(): PopupDismissState | null {
    if (typeof globalThis.window === "undefined") return null;

    const rawValue = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!rawValue) return null;

    try {
        const parsed = JSON.parse(rawValue) as Partial<PopupDismissState>;
        if (
            typeof parsed.dismissUntil !== "number" ||
            !Array.isArray(parsed.popupIds) ||
            parsed.popupIds.some((id) => typeof id !== "string")
        ) {
            localStorage.removeItem(DISMISS_STORAGE_KEY);
            return null;
        }

        return {
            dismissUntil: parsed.dismissUntil,
            popupIds: parsed.popupIds,
        };
    } catch {
        const legacyDismissUntil = Number.parseInt(rawValue, 10);
        if (Number.isNaN(legacyDismissUntil)) {
            localStorage.removeItem(DISMISS_STORAGE_KEY);
            return null;
        }

        return {
            dismissUntil: legacyDismissUntil,
            popupIds: [],
        };
    }
}

function shouldShowPopup(popups: PopupData[]) {
    if (popups.length === 0 || typeof globalThis.window === "undefined") return false;

    const dismissOption = popups[0]?.dismissOption || "show_always";
    if (dismissOption !== "hide_1_hour") {
        localStorage.removeItem(DISMISS_STORAGE_KEY);
        return true;
    }

    const dismissState = readDismissState();
    if (!dismissState) return true;

    if (Date.now() >= dismissState.dismissUntil) {
        localStorage.removeItem(DISMISS_STORAGE_KEY);
        return true;
    }

    const activePopupIds = popups.map((popup) => popup.id).sort((a, b) => a.localeCompare(b));
    const dismissedPopupIds = [...dismissState.popupIds].sort((a, b) => a.localeCompare(b));

    if (
        dismissedPopupIds.length === activePopupIds.length &&
        dismissedPopupIds.every((id, index) => id === activePopupIds[index])
    ) {
        return false;
    }

    localStorage.removeItem(DISMISS_STORAGE_KEY);
    return true;
}

export default function AnnouncementPopup() {
    const [popups, setPopups] = useState<PopupData[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Fetch popups on mount
    useEffect(() => {
        const fetchPopups = async () => {
            try {
                const res = await fetch("/api/popups");

                if (res.ok) {
                    const data = await res.json() as PopupData[];

                    if (data && data.length > 0) {
                        setPopups(data);

                        if (shouldShowPopup(data)) {
                            // Small delay before showing for smoother UX
                            setTimeout(() => {
                                setIsVisible(true);
                            }, 500);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching popups:", error);
            } finally {
                setIsLoaded(true);
            }
        };

        void fetchPopups();
    }, []);

    // Handle close with animation
    const handleClose = () => {
        // Get dismiss option from the first popup (all popups share the same setting)
        const dismissOption = popups[0]?.dismissOption || "show_always";

        // If dismiss option is "hide_1_hour", save to localStorage
        if (dismissOption === "hide_1_hour") {
            const dismissUntil = Date.now() + DISMISS_DURATION_MS;
            localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify({
                dismissUntil,
                popupIds: popups.map((popup) => popup.id),
            }));
        } else {
            localStorage.removeItem(DISMISS_STORAGE_KEY);
        }

        setIsVisible(false);
    };

    // Handle image click (open link)
    const handleImageClick = () => {
        const currentPopup = popups[currentIndex];
        if (currentPopup?.linkUrl) {
            globalThis.open(currentPopup.linkUrl, "_blank", "noopener,noreferrer");
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
    if (!isLoaded || popups.length === 0) {
        return null;
    }

    const currentPopup = popups[currentIndex];
    const hasMultiple = popups.length > 1;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onClick={handleClose}
                >
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    {/* Popup Content with Bounce Animation */}
                    <motion.div
                        className="relative max-w-[90vw] max-h-[90vh] w-full max-w-lg"
                        initial={{ opacity: 0, scale: 0.3, y: 100 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                        }}
                        exit={{ opacity: 0, scale: 0.5, y: 50 }}
                        transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 15,
                            mass: 1,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <motion.button
                            onClick={handleClose}
                            className="absolute -top-3 -right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-card/95 text-foreground shadow-xl shadow-black/25 backdrop-blur-md transition-colors hover:bg-accent"
                            aria-label="ปิด"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 20,
                                delay: 0.2
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <X className="h-5 w-5" />
                        </motion.button>

                        {/* Image Container */}
                        {currentPopup.linkUrl ? (
                            <div className="relative w-full aspect-square overflow-hidden rounded-[1.75rem] border border-white/10 bg-card/95 shadow-[0_28px_60px_-26px_rgba(0,0,0,0.75)] backdrop-blur-md">
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
                                    priority
                                />

                                {/* Carousel Navigation */}
                                {hasMultiple && (
                                    <>
                                        <motion.button
                                            onClick={goToPrevious}
                                            className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition-colors hover:bg-black/65"
                                            aria-label="รูปก่อนหน้า"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            <ChevronLeft className="w-6 h-6" />
                                        </motion.button>
                                        <motion.button
                                            onClick={goToNext}
                                            className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition-colors hover:bg-black/65"
                                            aria-label="รูปถัดไป"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            <ChevronRight className="w-6 h-6" />
                                        </motion.button>

                                        {/* Dot Indicators */}
                                        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                                            {popups.map((popup, index) => (
                                                <motion.button
                                                    key={popup.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCurrentIndex(index);
                                                    }}
                                                    className={`w-2.5 h-2.5 rounded-full transition-all ${index === currentIndex
                                                        ? "bg-primary shadow-[0_0_0_4px_rgba(88,166,255,0.18)]"
                                                        : "bg-white/35 hover:bg-primary/75"
                                                        }`}
                                                    aria-label={`ไปที่รูปที่ ${index + 1}`}
                                                    animate={{ scale: index === currentIndex ? 1.2 : 1 }}
                                                    whileHover={{ scale: 1.3 }}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="relative w-full aspect-square overflow-hidden rounded-[1.75rem] border border-white/10 bg-card/95 shadow-[0_28px_60px_-26px_rgba(0,0,0,0.75)] backdrop-blur-md">
                                <Image
                                    src={currentPopup.imageUrl}
                                    alt={currentPopup.title || "ประชาสัมพันธ์"}
                                    fill
                                    sizes="(max-width: 768px) 90vw, 500px"
                                    className="object-cover"
                                    priority
                                />
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
