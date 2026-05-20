"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChatBrandLogo } from "@/components/chat/ChatBrandLogo";

const FloatingChatButton = dynamic(
    () => import("@/components/FloatingChatButton").then((mod) => mod.FloatingChatButton),
    { ssr: false }
);

const HIDDEN_PATH_PREFIXES = ["/login", "/register", "/admin"];
const MOBILE_BOTTOM_NAV_OFFSET = "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]";
const OPEN_CHAT_EVENT = "open-customer-chat";

export function FloatingChatButtonWrapper() {
    const pathname = usePathname();
    const [shouldLoadChat, setShouldLoadChat] = useState(false);
    const [openOnLoad, setOpenOnLoad] = useState(false);
    const shouldHide = HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    useEffect(() => {
        const handleOpenChat = () => {
            setOpenOnLoad(true);
            setShouldLoadChat(true);
        };

        globalThis.addEventListener(OPEN_CHAT_EVENT, handleOpenChat);

        return () => {
            globalThis.removeEventListener(OPEN_CHAT_EVENT, handleOpenChat);
        };
    }, []);

    if (shouldHide) {
        return null;
    }

    if (shouldLoadChat) {
        return <FloatingChatButton defaultOpen={openOnLoad} />;
    }

    return (
        <button
            type="button"
            className={`fixed right-4 z-50 hidden h-[76px] w-[76px] items-center justify-center rounded-[24px] bg-transparent shadow-none ring-0 transition hover:scale-105 md:flex ${MOBILE_BOTTOM_NAV_OFFSET} sm:bottom-6 sm:right-6 sm:h-[84px] sm:w-[84px]`}
            aria-label="เปิดแชทลูกค้า"
            onClick={() => {
                setOpenOnLoad(true);
                setShouldLoadChat(true);
            }}
        >
            <ChatBrandLogo className="h-full w-full rounded-[24px] shadow-none" />
        </button>
    );
}
