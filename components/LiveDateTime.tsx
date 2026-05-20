"use client";

import { useState, useEffect } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { getThaiDateParts } from "@/lib/formatters/date";

function formatTime(date: Date) {
    return date.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
}

export function LiveDateTime() {
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        const timeout = setTimeout(() => setNow(new Date()), 0);
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
    }, []);

    if (!now) return null;

    const { day, d, month, year } = getThaiDateParts(now);
    const time = formatTime(now);

    return (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Date */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent/60 border border-border/40">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                    วัน{day}ที่ {d} {month} {year}
                </span>
            </div>

            {/* Time */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent/60 border border-border/40">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground tabular-nums">
                    {time} น.
                </span>
            </div>
        </div>
    );
}
