"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { ChatHeadsetIcon } from "@/components/chat/ChatHeadsetIcon";
import { useHideOnScrollDown } from "@/hooks/useHideOnScrollDown";

const MOBILE_BOTTOM_NAV_OFFSET = "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]";

export const ChatFabTrigger = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
    function ChatFabTrigger({ className, ...props }, ref) {
        const isHidden = useHideOnScrollDown();

        return (
            <button
                ref={ref}
                type="button"
                aria-label="เปิดแชทลูกค้า"
                className={[
                    "fixed right-4 z-50 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#1c9751] text-white ring-0 transition hover:scale-105 hover:bg-[#167c42]",
                    MOBILE_BOTTOM_NAV_OFFSET,
                    "md:bottom-6 md:right-6 md:h-16 md:w-16",
                    isHidden ? "max-md:pointer-events-none max-md:translate-y-4 max-md:opacity-0" : "",
                    className ?? "",
                ].join(" ")}
                {...props}
            >
                <ChatHeadsetIcon className="h-7 w-7 md:h-8 md:w-8" />
            </button>
        );
    }
);
