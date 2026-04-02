"use client";

import { useSyncExternalStore } from "react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

interface ChatTimestampProps {
    value: string;
    mode?: "relative" | "datetime";
    className?: string;
}

function formatTimestamp(value: string, mode: "relative" | "datetime") {
    const date = new Date(value);

    if (mode === "datetime") {
        return date.toLocaleString("th-TH", {
            dateStyle: "short",
            timeStyle: "short",
        });
    }

    return formatDistanceToNow(date, { addSuffix: true, locale: th });
}

export function ChatTimestamp({
    value,
    mode = "relative",
    className,
}: Readonly<ChatTimestampProps>) {
    const mounted = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false
    );

    return (
        <time
            dateTime={value}
            suppressHydrationWarning
            className={className}
        >
            {mounted ? formatTimestamp(value, mode) : ""}
        </time>
    );
}
