"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChatHeadsetIcon } from "@/components/chat/ChatHeadsetIcon";
import { OPEN_CHAT_EVENT } from "@/components/FloatingChatButtonWrapper";

// The floating chat widget doesn't mount on these routes, so the button
// would silently do nothing — hide it there instead.
const HIDDEN_PATH_PREFIXES = ["/login", "/register", "/admin"];

export function NavbarChatButton() {
    const pathname = usePathname();

    if (HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        return null;
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            className="rounded-xl text-muted-foreground hover:bg-accent hover:text-primary"
            onClick={() => globalThis.dispatchEvent(new Event(OPEN_CHAT_EVENT))}
            aria-label="เปิดแชทลูกค้า"
            title="แชทกับร้าน"
        >
            <ChatHeadsetIcon className="h-5 w-5" />
            <span className="sr-only">แชทกับร้าน</span>
        </Button>
    );
}
