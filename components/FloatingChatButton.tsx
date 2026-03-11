"use client";

import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface FloatingChatButtonProps {
    href?: string;
}

export function FloatingChatButton({
    href = "https://www.facebook.com/profile.php?id=61571169820803",
}: Readonly<FloatingChatButtonProps>) {
    const [isVisible, setIsVisible] = useState(false);

    // Entrance animation - show after mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`
                            fixed bottom-6 right-6 z-50
                            flex items-center justify-center
                            w-[60px] h-[60px]
                            rounded-full
                            bg-gradient-to-br from-blue-500 to-blue-600
                            shadow-xl shadow-blue-500/30
                            transition-all duration-300 ease-out
                            hover:scale-110 hover:shadow-2xl hover:shadow-blue-500/40
                            active:scale-95
                            ${isVisible
                                ? "translate-y-0 opacity-100"
                                : "translate-y-16 opacity-0"
                            }
                        `}
                        aria-label="ติดต่อเรา"
                    >
                        {/* Pulse Ring Animation */}
                        <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-25" />

                        {/* Icon */}
                        <MessageCircle className="h-7 w-7 text-white relative z-10" />
                    </a>
                </TooltipTrigger>
                <TooltipContent
                    side="left"
                    className="bg-foreground text-background px-3 py-2 rounded-lg font-medium"
                >
                    ติดต่อเรา
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
