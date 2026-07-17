"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const FloatingChatButton = dynamic(
    () => import("@/components/FloatingChatButton").then((mod) => mod.FloatingChatButton),
    { ssr: false }
);

const HIDDEN_PATH_PREFIXES = ["/login", "/register", "/admin"];
export const OPEN_CHAT_EVENT = "open-customer-chat";

// The chat widget has no floating trigger of its own anymore — the navbar
// chat button is the entry point. This wrapper just lazy-loads the widget
// the first time an open event fires; after that the widget listens for
// the event itself and reopens directly.
export function FloatingChatButtonWrapper() {
    const pathname = usePathname();
    const [shouldLoadChat, setShouldLoadChat] = useState(false);
    const shouldHide = HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    useEffect(() => {
        const handleOpenChat = () => setShouldLoadChat(true);

        globalThis.addEventListener(OPEN_CHAT_EVENT, handleOpenChat);

        return () => {
            globalThis.removeEventListener(OPEN_CHAT_EVENT, handleOpenChat);
        };
    }, []);

    if (shouldHide || !shouldLoadChat) {
        return null;
    }

    return <FloatingChatButton defaultOpen />;
}
