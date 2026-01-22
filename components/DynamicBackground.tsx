"use client";

import { useEffect, useState } from "react";

export function DynamicBackground() {
    const [backgroundImage, setBackgroundImage] = useState<string>("");
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Check sessionStorage first for cached value
        const cached = sessionStorage.getItem("backgroundImage");
        if (cached) {
            setBackgroundImage(cached);
            setIsLoaded(true);
            return;
        }

        const fetchBackground = async () => {
            try {
                const res = await fetch("/api/admin/settings", {
                    next: { revalidate: 3600 } // Cache for 1 hour
                });
                const data = await res.json();
                if (data.success && data.data?.backgroundImage) {
                    setBackgroundImage(data.data.backgroundImage);
                    sessionStorage.setItem("backgroundImage", data.data.backgroundImage);
                }
            } catch (error) {
                console.error("Failed to fetch background:", error);
            } finally {
                setIsLoaded(true);
            }
        };

        fetchBackground();
    }, []);

    if (!backgroundImage || !isLoaded) return null;

    return (
        <div
            className="fixed inset-0 -z-10 pointer-events-none"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundAttachment: "fixed",
            }}
        >
            {/* Light overlay without blur for better performance */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/70 to-white/50" />
        </div>
    );
}
