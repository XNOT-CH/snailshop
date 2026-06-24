"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { RevenueAreaChart } from "@/components/admin/RevenueAreaChart";

type Granularity = "day" | "week" | "month" | "year";

interface RevenuePoint {
    date: string;
    revenue: number;
    [key: string]: string | number;
}

const granularityLabels: Record<Granularity, string> = {
    day: "วัน",
    week: "สัปดาห์",
    month: "เดือน",
    year: "ปี",
};

// ─── Component ──────────────────────────────────────────
export function RevenueChart() {
    const [granularity, setGranularity] = useState<Granularity>("month");
    const [cache, setCache] = useState<Partial<Record<Granularity, RevenuePoint[]>>>({});

    useEffect(() => {
        if (cache[granularity]) {
            return;
        }

        let cancelled = false;

        fetch(`/api/admin/dashboard/revenue?granularity=${granularity}`, { cache: "no-store" })
            .then((response) => response.json())
            .then((json) => {
                const points: RevenuePoint[] =
                    json?.success && Array.isArray(json.data) ? json.data : [];
                if (!cancelled) {
                    setCache((prev) => ({ ...prev, [granularity]: points }));
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setCache((prev) => ({ ...prev, [granularity]: [] }));
                }
            });

        return () => {
            cancelled = true;
        };
    }, [granularity, cache]);

    // No cache entry yet = still fetching this granularity for the first time.
    const showLoader = !cache[granularity];
    const data = cache[granularity] ?? [];

    return (
        <div>
            {/* Header with Granularity Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                    <h3 className="text-lg font-semibold">แนวโน้มรายได้</h3>
                    <p className="text-sm text-muted-foreground">
                        ภาพรวมผลประกอบการด้านรายได้
                    </p>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                    {(Object.keys(granularityLabels) as Granularity[]).map(
                        (key) => (
                            <button
                                key={key}
                                onClick={() => setGranularity(key)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${granularity === key
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {granularityLabels[key]}
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Chart */}
            {showLoader ? (
                <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังโหลดข้อมูลรายได้
                </div>
            ) : data.length === 0 ? (
                <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
                    ยังไม่มีข้อมูลรายได้ในช่วงเวลานี้
                </div>
            ) : (
                <RevenueAreaChart data={data} granularity={granularity} />
            )}
        </div>
    );
}
