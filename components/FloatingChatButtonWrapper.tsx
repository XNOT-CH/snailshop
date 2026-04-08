"use client";

import dynamic from "next/dynamic";

const FloatingChatButton = dynamic(
    () => import("@/components/FloatingChatButton").then((mod) => mod.FloatingChatButton),
    { ssr: false }
);

export function FloatingChatButtonWrapper() {
    return <FloatingChatButton />;
}
