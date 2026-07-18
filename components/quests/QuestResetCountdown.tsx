"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

function formatRemaining(resetAtMs: number, nowMs: number) {
    const remainingMs = Math.max(0, resetAtMs - nowMs);
    const totalMinutes = Math.floor(remainingMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `รีเซ็ตใน ${hours} ชม. ${minutes} นาที`;
    return `รีเซ็ตใน ${minutes} นาที`;
}

export function QuestResetCountdown({ resetAtIso }: Readonly<{ resetAtIso: string }>) {
    const resetAtMs = new Date(resetAtIso).getTime();
    // Render a stable placeholder on the server so hydration always matches,
    // then fill in the live countdown on the client.
    const [label, setLabel] = useState<string | null>(null);

    useEffect(() => {
        const update = () => setLabel(formatRemaining(resetAtMs, Date.now()));
        update();
        const timer = setInterval(update, 30000);
        return () => clearInterval(timer);
    }, [resetAtMs]);

    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            {label ?? "รีเซ็ตเที่ยงคืน"}
        </span>
    );
}
