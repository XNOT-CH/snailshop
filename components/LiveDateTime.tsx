"use client";

import { useState, useEffect } from "react";
import { CalendarDays, Clock } from "lucide-react";

const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const THAI_MONTHS = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const THAI_MONTHS_SHORT = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function formatThaiDate(date: Date) {
    const day = THAI_DAYS[date.getDay()];
    const d = date.getDate();
    const month = THAI_MONTHS[date.getMonth()];
    const monthShort = THAI_MONTHS_SHORT[date.getMonth()];
    const year = date.getFullYear() + 543; // พ.ศ.
    return { day, d, month, monthShort, year };
}

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
        setNow(new Date());
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    if (!now) {
        return (
            <div className="flex items-center gap-3 text-sm text-muted-foreground animate-pulse">
                <div className="h-4 w-40 bg-muted rounded" />
            </div>
        );
    }

    const { day, d, month, year } = formatThaiDate(now);
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
