"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface HeatmapCell {
    weekday: number;
    hour: number;
    orders: number;
    revenue: number;
}

// WEEKDAY() order from the API: 0 = Monday … 6 = Sunday.
const DAY_LABELS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
const DAY_FULL = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Sequential single-hue scale on the project primary; sqrt eases the skew so
// one peak hour doesn't wash every other cell out. Rendered as an opacity
// overlay so dark mode can swap to a lighter blue via Tailwind classes.
function cellIntensity(orders: number, max: number): number {
    if (orders === 0 || max === 0) return 0;
    return 0.2 + 0.8 * Math.sqrt(orders / max);
}

export function SalesHeatmap() {
    const [cells, setCells] = useState<HeatmapCell[] | null>(null);
    const [windowDays, setWindowDays] = useState(30);

    useEffect(() => {
        let cancelled = false;

        fetch("/api/admin/dashboard/sales-heatmap", { cache: "no-store" })
            .then((response) => response.json())
            .then((json) => {
                if (!cancelled) {
                    setCells(json?.success && Array.isArray(json.data) ? json.data : []);
                    if (json?.windowDays) setWindowDays(json.windowDays);
                }
            })
            .catch(() => {
                if (!cancelled) setCells([]);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    if (!cells) {
        return (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังโหลดข้อมูลช่วงเวลาขายดี
            </div>
        );
    }

    const grid = new Map<string, HeatmapCell>();
    let max = 0;
    for (const cell of cells) {
        grid.set(`${cell.weekday}-${cell.hour}`, cell);
        if (cell.orders > max) max = cell.orders;
    }

    if (max === 0) {
        return (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                ยังไม่มีคำสั่งซื้อใน {windowDays} วันที่ผ่านมา
            </div>
        );
    }

    return (
        <div>
            <div className="mb-4">
                <h3 className="text-lg font-semibold">ช่วงเวลาขายดี</h3>
                <p className="text-sm text-muted-foreground">คำสั่งซื้อแยกตามวันและชั่วโมง (เวลาไทย) · {windowDays} วันล่าสุด</p>
            </div>

            <div className="overflow-x-auto">
                <div className="min-w-[560px]">
                    {DAY_LABELS.map((label, weekday) => (
                        <div key={label} className="flex items-center gap-1 mb-1">
                            <span className="w-8 shrink-0 text-xs text-muted-foreground">{label}</span>
                            {HOURS.map((hour) => {
                                const cell = grid.get(`${weekday}-${hour}`);
                                const orders = cell?.orders ?? 0;
                                return (
                                    <div
                                        key={hour}
                                        title={`${DAY_FULL[weekday]} ${hour.toString().padStart(2, "0")}:00–${hour.toString().padStart(2, "0")}:59\n${orders.toLocaleString()} คำสั่งซื้อ · ฿${(cell?.revenue ?? 0).toLocaleString()}`}
                                        className="relative h-5 flex-1 rounded-[3px] bg-muted/50 hover:ring-2 hover:ring-primary/60 transition-shadow"
                                    >
                                        {orders > 0 && (
                                            <div
                                                className="absolute inset-0 rounded-[3px] bg-[#145de7] dark:bg-blue-400"
                                                style={{ opacity: cellIntensity(orders, max) }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    {/* Hour axis: label every 3 hours */}
                    <div className="flex items-center gap-1 mt-1">
                        <span className="w-8 shrink-0" />
                        {HOURS.map((hour) => (
                            <span key={hour} className="flex-1 text-center text-[10px] text-muted-foreground tabular-nums">
                                {hour % 3 === 0 ? hour : ""}
                            </span>
                        ))}
                    </div>

                    {/* Intensity legend */}
                    <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
                        <span>น้อย</span>
                        {[0.15, 0.35, 0.6, 1].map((ratio) => (
                            <div
                                key={ratio}
                                className="h-3 w-6 rounded-[3px] bg-[#145de7] dark:bg-blue-400"
                                style={{ opacity: 0.2 + 0.8 * ratio }}
                            />
                        ))}
                        <span>มาก (สูงสุด {max.toLocaleString()} ออเดอร์/ชม.)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
