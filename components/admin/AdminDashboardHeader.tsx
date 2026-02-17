"use client";

import { useState } from "react";
import { DateRangePicker } from "@/components/DateRangePicker";
import { LiveDateTime } from "@/components/LiveDateTime";
import type { DateRange } from "react-day-picker";
import { subDays } from "date-fns";

interface AdminDashboardHeaderProps {
    title?: string;
    subtitle?: string;
}

export function AdminDashboardHeader({
    title = "แดชบอร์ด",
    subtitle = "ภาพรวมข้อมูลธุรกิจของคุณ",
}: AdminDashboardHeaderProps) {
    const today = new Date();
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(today, 6),
        to: today,
    });

    return (
        <div className="flex flex-col gap-4">
            {/* Top Row: Title + LiveDateTime */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {title}
                    </h1>
                    <p className="text-muted-foreground">
                        {subtitle}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <LiveDateTime />
                    <DateRangePicker
                        value={dateRange}
                        onChange={setDateRange}
                        placeholder="เลือกช่วงวันที่"
                    />
                </div>
            </div>
        </div>
    );
}
