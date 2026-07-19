"use client";

import { useState } from "react";
import { subDays, format } from "date-fns";
import { th } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Defers recharts until the top-up tab content mounts.
const DailyTopupSummary = dynamic(
    () => import("@/components/DailyTopupSummary").then((mod) => mod.DailyTopupSummary),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center" style={{ height: 320 }}>
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        ),
    },
);
import { DateRangePicker } from "@/components/DateRangePicker";

export function TopupSummaryWithDateRange() {
    const [range, setRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 6),
        to: new Date(),
    });

    let rangeLabel = "เลือกช่วงวันที่";
    if (range?.from) {
        if (range.to && range.from.toDateString() !== range.to.toDateString()) {
            rangeLabel = `${format(range.from, "d MMM yyyy", { locale: th })} – ${format(range.to, "d MMM yyyy", { locale: th })}`;
        } else {
            rangeLabel = format(range.from, "d MMM yyyy", { locale: th });
        }
    }

    return (
        <div className="space-y-4">
            {/* Header + DateRangePicker */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">
                        สรุปเติมเงิน
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {rangeLabel}
                    </p>
                </div>
                <DateRangePicker
                    value={range}
                    onChange={(r) => r && setRange(r)}
                    placeholder="เลือกช่วงวันที่"
                />
            </div>

            {/* Topup Summary */}
            <DailyTopupSummary
                startDate={range?.from ? format(range.from, "yyyy-MM-dd") : undefined}
                endDate={range?.to ? format(range.to, "yyyy-MM-dd") : undefined}
            />
        </div>
    );
}
