"use client";

import { useState } from "react";
import { subDays, format } from "date-fns";
import { th } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { DailyTopupSummary } from "@/components/DailyTopupSummary";
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
