"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
    getAdminChatUnreadServerSnapshot,
    getAdminChatUnreadSnapshot,
    isChatNotifyEnabled,
    playChatPing,
    subscribeAdminChatUnread,
} from "@/components/admin/chat/adminChatUnreadStore";

function useAdminChatUnread() {
    return useSyncExternalStore(
        subscribeAdminChatUnread,
        getAdminChatUnreadSnapshot,
        getAdminChatUnreadServerSnapshot
    );
}

/** Sidebar badge: live unread-conversation count for the chat nav item. */
export function ChatUnreadBadge({ active }: Readonly<{ active: boolean }>) {
    const unread = useAdminChatUnread();

    if (!unread.loaded || unread.unreadConversations === 0) {
        return null;
    }

    return (
        <span
            className={[
                "relative z-10 min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold",
                active
                    ? "bg-white/90 text-[#145de7] dark:bg-[#0f2035] dark:text-[#8ec9ff]"
                    : "bg-rose-500 text-white",
            ].join(" ")}
            aria-label={`มีแชทยังไม่อ่าน ${unread.unreadConversations} รายการ`}
        >
            {unread.unreadConversations > 99 ? "99+" : unread.unreadConversations}
        </span>
    );
}

const TITLE_PREFIX_PATTERN = /^\(\d+\+?\)\s/;

/**
 * Invisible effects runner (rendered once in the admin sidebar):
 * tab-title unread prefix + opt-in sound/desktop notification when the
 * unread count rises.
 */
export function ChatUnreadEffects() {
    const unread = useAdminChatUnread();
    const pathname = usePathname();
    const previousTotalRef = useRef<number | null>(null);

    useEffect(() => {
        const baseTitle = document.title.replace(TITLE_PREFIX_PATTERN, "");

        document.title = unread.loaded && unread.totalUnread > 0
            ? `(${unread.totalUnread > 99 ? "99+" : unread.totalUnread}) ${baseTitle}`
            : baseTitle;
    }, [unread]);

    useEffect(() => {
        if (!unread.loaded) {
            return;
        }

        const previousTotal = previousTotalRef.current;

        previousTotalRef.current = unread.totalUnread;

        // First sample after mount is baseline only — never alert on it.
        if (previousTotal === null || unread.totalUnread <= previousTotal || !isChatNotifyEnabled()) {
            return;
        }

        playChatPing();

        const isViewingInbox = pathname === "/admin/chat" && document.visibilityState === "visible";

        if (!isViewingInbox && typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
                const notification = new Notification("มีข้อความใหม่จากลูกค้า", {
                    body: `ข้อความที่ยังไม่ได้อ่าน ${unread.totalUnread} ข้อความ`,
                    tag: "admin-chat-unread",
                });

                notification.onclick = () => {
                    window.focus();
                    window.location.href = "/admin/chat";
                };
            } catch {
                // Notification is best-effort only.
            }
        }
    }, [unread, pathname]);

    return null;
}
