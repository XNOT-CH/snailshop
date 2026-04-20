"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { themeClasses } from "@/lib/theme";

interface ShareButtonsProps {
    title: string;
    className?: string;
}

export function ShareButtons({ title, className }: Readonly<ShareButtonsProps>) {
    const [copied, setCopied] = useState(false);

    const getUrl = () => globalThis.window === undefined ? "" : globalThis.window.location.href;

    const shareToLine = () => {
        window.open(
            `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(getUrl())}`,
            "_blank",
            "width=600,height=500"
        );
    };

    const shareToFacebook = () => {
        window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getUrl())}`,
            "_blank",
            "width=600,height=500"
        );
    };

    const shareToTwitter = () => {
        window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(getUrl())}`,
            "_blank",
            "width=600,height=500"
        );
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(getUrl());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
            console.error("Failed to copy link");
        }
    };

    return (
        <div className={className}>
            <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">แชร์ :</span>

                {/* LINE */}
                <Button
                    variant="ghost"
                    size="icon"
                    className={`${themeClasses.actionMuted} h-9 w-9 rounded-full transition-all duration-200 hover:scale-110 hover:bg-primary hover:text-primary-foreground shadow-sm`}
                    onClick={shareToLine}
                    aria-label="แชร์ไปยัง LINE"
                >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                    </svg>
                </Button>

                {/* Facebook */}
                <Button
                    variant="ghost"
                    size="icon"
                    className={`${themeClasses.actionMuted} h-9 w-9 rounded-full transition-all duration-200 hover:scale-110 hover:bg-primary hover:text-primary-foreground shadow-sm`}
                    onClick={shareToFacebook}
                    aria-label="แชร์ไปยัง Facebook"
                >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                </Button>

                {/* Twitter/X */}
                <Button
                    variant="ghost"
                    size="icon"
                    className={`${themeClasses.actionMuted} h-9 w-9 rounded-full transition-all duration-200 hover:scale-110 hover:bg-primary hover:text-primary-foreground shadow-sm`}
                    onClick={shareToTwitter}
                    aria-label="แชร์ไปยัง Twitter"
                >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                    </svg>
                </Button>

                {/* Copy Link */}
                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 rounded-full transition-all duration-200 hover:scale-110 shadow-sm ${copied
                            ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                            : `${themeClasses.actionMuted} hover:bg-primary hover:text-primary-foreground`
                        }`}
                    onClick={copyLink}
                    aria-label="คัดลอกลิงก์"
                >
                    {copied ? (
                        <Check className="h-4 w-4" />
                    ) : (
                        <Link2 className="h-4 w-4" />
                    )}
                </Button>
            </div>
        </div>
    );
}
