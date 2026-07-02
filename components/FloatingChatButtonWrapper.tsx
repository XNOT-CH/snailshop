"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Headset } from "lucide-react";

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
            className={`fixed right-4 z-50 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/35 ring-0 transition hover:scale-105 hover:bg-emerald-600 ${MOBILE_BOTTOM_NAV_OFFSET} md:bottom-6 md:right-6 md:h-16 md:w-16`}
            aria-label="เปิดแชทลูกค้า"
            onClick={() => {
                setOpenOnLoad(true);
                setShouldLoadChat(true);
            }}
        >
            <Headset className="h-7 w-7 md:h-8 md:w-8" />
        </button>
    );
}
