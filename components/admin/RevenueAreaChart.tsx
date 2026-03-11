"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

// ─── Types ──────────────────────────────────────────────
type Granularity = "day" | "week" | "month" | "year";

interface DataPoint {
    date: string;
    revenue: number;
    [key: string]: string | number;
}

interface RevenueAreaChartProps {
    data: DataPoint[];
    granularity: Granularity;
}

// ─── Date Formatter ─────────────────────────────────────
function formatXAxis(dateStr: string, granularity: Granularity): string {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr; // already formatted, pass through

    switch (granularity) {
        case "day":
            return d.toLocaleDateString("th-TH", {
                day: "2-digit",
                month: "short",
            }); // "12 ก.พ."
        case "week":
            return d.toLocaleDateString("th-TH", {
                day: "2-digit",
                month: "short",
            });
        case "month":
            return d.toLocaleDateString("th-TH", {
                month: "short",
                year: "2-digit",
            }); // "ก.พ. 69"
        case "year":
            return (d.getFullYear() + 543).toString(); // พ.ศ.
        default:
            return dateStr;
    }
}

// ─── Currency Formatter ─────────────────────────────────
function formatCurrency(value: number): string {
    if (value >= 1_000_000) return `฿${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `฿${(value / 1_000).toFixed(0)}k`;
    return `฿${value}`;
}

// ─── Custom Tooltip ─────────────────────────────────────
function CustomTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{ value: number; name: string }>;
    label?: string;
}) {
    if (!active || !payload?.length) return null;

    return (
        <div
            className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-xl"
            style={{ minWidth: 160 }}
        >
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
                {label}
            </p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center justify-between gap-6">
                    <span className="text-xs text-muted-foreground">
                        {entry.name}
                    </span>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                        ฿{entry.value.toLocaleString()}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── Component ──────────────────────────────────────────
export function RevenueAreaChart({ data, granularity }: RevenueAreaChartProps) {
    return (
        <ResponsiveContainer width="100%" height={350}>
            <AreaChart
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
                {/* Gradient Definitions */}
                <defs>
                    <linearGradient
                        id="revenueGradientFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="0%"
                            stopColor="var(--chart-area-gradient-from)"
                            stopOpacity={0.35}
                        />
                        <stop
                            offset="50%"
                            stopColor="var(--chart-area-stroke)"
                            stopOpacity={0.12}
                        />
                        <stop
                            offset="100%"
                            stopColor="var(--chart-area-stroke)"
                            stopOpacity={0.02}
                        />
                    </linearGradient>
                    <linearGradient
                        id="revenueStrokeGrad"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                    >
                        <stop offset="0%" stopColor="var(--chart-area-gradient-from)" />
                        <stop offset="100%" stopColor="var(--chart-area-stroke)" />
                    </linearGradient>
                </defs>

                {/* Grid — horizontal lines only */}
                <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--color-border)"
                    strokeOpacity={0.6}
                />

                {/* X-Axis — formatted dates */}
                <XAxis
                    dataKey="date"
                    tickFormatter={(v) => formatXAxis(v, granularity)}
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                />

                {/* Y-Axis — formatted currency */}
                <YAxis
                    tickFormatter={formatCurrency}
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                />

                {/* Tooltip */}
                <Tooltip
                    content={<CustomTooltip />}
                    cursor={{
                        stroke: "var(--color-primary)",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                    }}
                />

                {/* Area */}
                <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="url(#revenueStrokeGrad)"
                    strokeWidth={2.5}
                    fill="url(#revenueGradientFill)"
                    dot={false}
                    activeDot={{
                        r: 6,
                        fill: "var(--chart-dot-fill)",
                        stroke: "var(--card)",
                        strokeWidth: 2.5,
                        className: "drop-shadow-md",
                    }}
                    animationDuration={800}
                    animationEasing="ease-out"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
