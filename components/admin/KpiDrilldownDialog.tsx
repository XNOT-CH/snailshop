"use client";

import { useEffect, useState } from "react";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCompactBaht } from "@/lib/formatters/currency";

type ComparableRange = "today" | "7d" | "30d";
type MetricKey = "revenue" | "orders" | "aov" | "topup" | "netInflow";

interface BreakdownPoint {
    date: string;
    previousDate: string;
    current: Record<MetricKey, number>;
    previous: Record<MetricKey, number>;
}

interface Breakdown {
    granularity: "hour" | "day";
    points: BreakdownPoint[];
}

/** BreakdownPoint with the selected metric flattened to `value` for static recharts dataKeys. */
type ChartPoint = Omit<BreakdownPoint, "current" | "previous"> & {
    current: BreakdownPoint["current"] & { value: number };
    previous: BreakdownPoint["previous"] & { value: number };
};

interface KpiDrilldownDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    metric: MetricKey;
    metricTitle: string;
    range: ComparableRange;
    compareLabel: string;
    format: (value: number) => string;
    isBaht: boolean;
}

const rangeTitles: Record<ComparableRange, string> = {
    today: "รายชั่วโมง · วันนี้",
    "7d": "รายวัน · 7 วันล่าสุด",
    "30d": "รายวัน · 30 วันล่าสุด",
};

/** "2026-07-11" → "11 ก.ค." ; "2026-07-11T09" → "09:00" (chart axis / table rows). */
function formatBucketLabel(key: string, granularity: "hour" | "day", withYear = false): string {
    if (granularity === "hour") {
        return `${key.slice(11, 13)}:00`;
    }
    return new Date(`${key}T00:00:00Z`).toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "short",
        ...(withYear ? { year: "2-digit" } : {}),
        timeZone: "UTC",
    });
}

function ComparisonTooltip({
    active,
    payload,
    format,
    granularity,
    compareLabel,
}: Readonly<{
    active?: boolean;
    payload?: Array<{ payload: ChartPoint }>;
    format: (value: number) => string;
    granularity: "hour" | "day";
    compareLabel: string;
}>) {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;

    return (
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-xl" style={{ minWidth: 180 }}>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                {formatBucketLabel(point.date, granularity, true)}
            </p>
            <div className="space-y-1">
                <div className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="inline-block h-0.5 w-4 rounded-full bg-[var(--chart-1)]" />
                        ช่วงนี้
                    </span>
                    <span className="text-sm font-bold tabular-nums text-foreground">{format(point.current.value)}</span>
                </div>
                <div className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="inline-block h-0.5 w-4 rounded-full border-t-2 border-dashed border-muted-foreground" />
                        {compareLabel}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-muted-foreground">{format(point.previous.value)}</span>
                </div>
            </div>
        </div>
    );
}

export function KpiDrilldownDialog({
    open,
    onOpenChange,
    metric,
    metricTitle,
    range,
    compareLabel,
    format,
    isBaht,
}: Readonly<KpiDrilldownDialogProps>) {
    const [cache, setCache] = useState<Partial<Record<ComparableRange, Breakdown>>>({});
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!open || cache[range]) {
            return;
        }

        // No failed-state reset needed: the dialog unmounts on close, so a
        // reopen starts from fresh state.
        let cancelled = false;

        fetch(`/api/admin/dashboard/kpi-breakdown?range=${range}`, { cache: "no-store" })
            .then((response) => response.json())
            .then((json) => {
                if (!cancelled && json?.success && Array.isArray(json.points)) {
                    setCache((prev) => ({ ...prev, [range]: { granularity: json.granularity, points: json.points } }));
                } else if (!cancelled) {
                    setFailed(true);
                }
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });

        return () => {
            cancelled = true;
        };
    }, [open, range, cache]);

    const breakdown = cache[range];
    const chartData: ChartPoint[] | undefined = breakdown?.points.map((point) => ({
        ...point,
        current: { ...point.current, value: point.current[metric] },
        previous: { ...point.previous, value: point.previous[metric] },
    }));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {metricTitle} · {rangeTitles[range]}
                    </DialogTitle>
                    <DialogDescription>เส้นทึบ = ช่วงนี้ · เส้นประ = {compareLabel}</DialogDescription>
                </DialogHeader>

                {!breakdown && !failed && <p className="py-12 text-center text-sm text-muted-foreground">กำลังโหลด…</p>}
                {failed && <p className="py-12 text-center text-sm text-muted-foreground">โหลดข้อมูลไม่สำเร็จ ปิดแล้วลองใหม่อีกครั้ง</p>}

                {breakdown && chartData && (
                    <div className="space-y-4">
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.6} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(v: string) => formatBucketLabel(v, breakdown.granularity)}
                                    stroke="var(--color-muted-foreground)"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={8}
                                    interval="preserveStartEnd"
                                    minTickGap={24}
                                />
                                <YAxis
                                    tickFormatter={(v: number) => (isBaht ? formatCompactBaht(v) : v.toLocaleString("th-TH"))}
                                    stroke="var(--color-muted-foreground)"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    width={60}
                                />
                                <Tooltip
                                    content={
                                        <ComparisonTooltip
                                            format={format}
                                            granularity={breakdown.granularity}
                                            compareLabel={compareLabel}
                                        />
                                    }
                                    cursor={{ stroke: "var(--color-primary)", strokeWidth: 1, strokeDasharray: "4 4" }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="previous.value"
                                    name={compareLabel}
                                    stroke="var(--color-muted-foreground)"
                                    strokeWidth={2}
                                    strokeDasharray="6 4"
                                    dot={false}
                                    activeDot={{ r: 4, fill: "var(--color-muted-foreground)", stroke: "var(--card)", strokeWidth: 2 }}
                                    animationDuration={500}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="current.value"
                                    name="ช่วงนี้"
                                    stroke="var(--chart-1)"
                                    strokeWidth={2.5}
                                    dot={false}
                                    activeDot={{ r: 5, fill: "var(--chart-dot-fill)", stroke: "var(--card)", strokeWidth: 2.5 }}
                                    animationDuration={500}
                                />
                            </LineChart>
                        </ResponsiveContainer>

                        <div className="overflow-x-auto rounded-xl border border-border/60">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border/60 bg-muted/40 text-left text-xs text-muted-foreground">
                                        <th className="px-3 py-2 font-medium">{breakdown.granularity === "hour" ? "ชั่วโมง" : "วันที่"}</th>
                                        <th className="px-3 py-2 text-right font-medium">{compareLabel}</th>
                                        <th className="px-3 py-2 text-right font-medium">ช่วงนี้</th>
                                        <th className="px-3 py-2 text-right font-medium">เปลี่ยนแปลง</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {breakdown.points.map((point) => {
                                        const current = point.current[metric];
                                        const previous = point.previous[metric];
                                        const pct = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : null;
                                        return (
                                            <tr key={point.date} className="border-b border-border/40 last:border-0">
                                                <td className="px-3 py-1.5 text-muted-foreground">
                                                    {formatBucketLabel(point.date, breakdown.granularity, true)}
                                                </td>
                                                <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{format(previous)}</td>
                                                <td className="px-3 py-1.5 text-right font-medium tabular-nums">{format(current)}</td>
                                                <td
                                                    className={`px-3 py-1.5 text-right tabular-nums ${
                                                        pct === null
                                                            ? "text-muted-foreground"
                                                            : pct >= 0
                                                              ? "text-emerald-600 dark:text-emerald-400"
                                                              : "text-red-600 dark:text-red-400"
                                                    }`}
                                                >
                                                    {pct === null
                                                        ? "—"
                                                        : `${pct >= 0 ? "+" : ""}${pct.toLocaleString("th-TH", { maximumFractionDigits: 1 })}%`}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
