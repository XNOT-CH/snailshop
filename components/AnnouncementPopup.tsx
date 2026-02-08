"use client";

import { useState, useEffect, useCallback } from "react";
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

export default function AnnouncementPopup() {
    const [popups, setPopups] = useState<PopupData[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Check if popup should be shown based on localStorage
    const shouldShowPopup = useCallback(() => {
        if (typeof window === "undefined") return true;

        const dismissedUntil = localStorage.getItem(DISMISS_STORAGE_KEY);
        if (dismissedUntil) {
            const dismissedTime = parseInt(dismissedUntil, 10);
            if (Date.now() < dismissedTime) {
                return false; // Still dismissed
            }
            // Dismiss period expired, remove the key
            localStorage.removeItem(DISMISS_STORAGE_KEY);
        }
        return true;
    }, []);

    // Fetch popups on mount
    useEffect(() => {
        console.log("[Popup] Component mounted, checking shouldShowPopup...");

        const fetchPopups = async () => {
            // Check localStorage first
            const canShow = shouldShowPopup();
            console.log("[Popup] shouldShowPopup result:", canShow);

            if (!canShow) {
                console.log("[Popup] Blocked by localStorage, not fetching");
                setIsLoaded(true);
                return;
            }

            try {
                console.log("[Popup] Fetching /api/popups...");
                const res = await fetch("/api/popups");
                console.log("[Popup] Response status:", res.status);

                if (res.ok) {
                    const data = await res.json();
                    console.log("[Popup] Data received:", data);

                    if (data && data.length > 0) {
                        setPopups(data);
                        // Small delay before showing for smoother UX
                        setTimeout(() => {
                            console.log("[Popup] Setting visible to true");
                            setIsVisible(true);
                        }, 500);
                    } else {
                        console.log("[Popup] No active popups in response");
                    }
                }
            } catch (error) {
                console.error("[Popup] Error fetching popups:", error);
            } finally {
                setIsLoaded(true);
            }
        };

        fetchPopups();
    }, [shouldShowPopup]);

    // Handle close with animation
    const handleClose = () => {
        // Get dismiss option from the first popup (all popups share the same setting)
        const dismissOption = popups[0]?.dismissOption || "show_always";

        // If dismiss option is "hide_1_hour", save to localStorage
        if (dismissOption === "hide_1_hour") {
            const dismissUntil = Date.now() + DISMISS_DURATION_MS;
            localStorage.setItem(DISMISS_STORAGE_KEY, dismissUntil.toString());
        }
        // "show_always" means do nothing - popup will show again next visit

        setIsVisible(false);
    };

    // Handle image click (open link)
    const handleImageClick = () => {
        const currentPopup = popups[currentIndex];
        if (currentPopup?.linkUrl) {
            window.open(currentPopup.linkUrl, "_blank", "noopener,noreferrer");
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
                            className="absolute -top-3 -right-3 z-10 w-10 h-10 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
                            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </motion.button>

                        {/* Image Container */}
                        <div
                            className={`relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-gray-800 ${currentPopup.linkUrl ? "cursor-pointer" : ""}`}
                            onClick={currentPopup.linkUrl ? handleImageClick : undefined}
                        >
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
                                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                                        aria-label="รูปก่อนหน้า"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <ChevronLeft className="w-6 h-6" />
                                    </motion.button>
                                    <motion.button
                                        onClick={goToNext}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                                        aria-label="รูปถัดไป"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <ChevronRight className="w-6 h-6" />
                                    </motion.button>

                                    {/* Dot Indicators */}
                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                                        {popups.map((_, index) => (
                                            <motion.button
                                                key={index}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCurrentIndex(index);
                                                }}
                                                className={`w-2.5 h-2.5 rounded-full transition-all ${index === currentIndex
                                                    ? "bg-white"
                                                    : "bg-white/50 hover:bg-white/75"
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
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
