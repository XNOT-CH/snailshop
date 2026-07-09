"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChatFabTrigger } from "@/components/chat/ChatFabTrigger";

const FloatingChatButton = dynamic(
    () => import("@/components/FloatingChatButton").then((mod) => mod.FloatingChatButton),
    { ssr: false }
);

const HIDDEN_PATH_PREFIXES = ["/login", "/register", "/admin"];
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
        <ChatFabTrigger
            onClick={() => {
                setOpenOnLoad(true);
                setShouldLoadChat(true);
            }}
        />
    );
}
