"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export interface DonutSlice {
    name: string;
    value: number;
    /** Neutral-gray "remainder" slice (e.g. ยังไม่เคยซื้อ) instead of a hue. */
    muted?: boolean;
}

import { DONUT_SLICE_HUES, DONUT_OTHER_COLOR } from "@/components/admin/donutPalette";

const SLICE_HUES = DONUT_SLICE_HUES;
const OTHER_COLOR = DONUT_OTHER_COLOR;
const MAX_HUE_SLICES = SLICE_HUES.length;

interface DonutChartProps {
    /** Slices in display order (order fixes each slice's color — keep it stable). */
    data: DonutSlice[];
    /** Formats a slice value for the legend and tooltip, e.g. (v) => `฿${v}`. */
    format: (value: number) => string;
    /** Small caption under the total in the donut hole. */
    centerCaption?: string;
    emptyText?: string;
    height?: number;
}

/**
 * Shared donut chart: hue slices assigned by fixed position, anything past the
 * 4th slice folded into a gray "อื่นๆ", legend with value + %, total in the hole.
 */
export function DonutChart({
    data,
    format,
    centerCaption,
    emptyText = "ยังไม่มีข้อมูล",
    height = 200,
}: Readonly<DonutChartProps>) {
    // Hue index comes from the slice's position in the ORIGINAL data (before
    // zero-value slices are dropped) so the same entity keeps the same color
    // across paired donuts fed the same entity order with different measures.
    let hueCounter = 0;
    const assigned = data.map((slice) => ({
        ...slice,
        hueIndex: slice.muted ? -1 : hueCounter++,
    }));

    const visible = assigned.filter((slice) => slice.value > 0);
    const kept = visible.filter((slice) => slice.hueIndex >= 0 && slice.hueIndex < MAX_HUE_SLICES);
    const folded = visible.filter((slice) => slice.hueIndex < 0 || slice.hueIndex >= MAX_HUE_SLICES);

    const slices = [...kept];
    if (folded.length > 0) {
        slices.push({
            name: folded.length === 1 ? folded[0].name : "อื่นๆ",
            value: folded.reduce((sum, slice) => sum + slice.value, 0),
            muted: true,
            hueIndex: -1,
        });
    }

    const total = slices.reduce((sum, slice) => sum + slice.value, 0);

    if (total <= 0) {
        return (
            <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: height + 60 }}>
                {emptyText}
            </div>
        );
    }

    const colorFor = (slice: (typeof slices)[number]) =>
        slice.hueIndex >= 0 ? SLICE_HUES[slice.hueIndex] : OTHER_COLOR;

    return (
        <div className="flex flex-col gap-5">
            <div className="relative" style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={slices}
                            cx="50%"
                            cy="50%"
                            innerRadius="62%"
                            outerRadius="90%"
                            paddingAngle={3}
                            cornerRadius={4}
                            dataKey="value"
                            stroke="none"
                            isAnimationActive={false}
                        >
                            {slices.map((slice) => (
                                <Cell
                                    key={`${slice.hueIndex}-${slice.name}`}
                                    fill={colorFor(slice)}
                                    className="transition-opacity hover:opacity-80"
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number, name: string) => [format(value), name]}
                            contentStyle={{
                                backgroundColor: "var(--popover)",
                                borderColor: "var(--border)",
                                borderRadius: "12px",
                                boxShadow: "0 10px 30px -5px rgba(0,0,0,0.15)",
                                color: "var(--popover-foreground)",
                                fontSize: "12px",
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold tracking-tight tabular-nums">{format(total)}</span>
                    {centerCaption && <span className="text-xs text-muted-foreground">{centerCaption}</span>}
                </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                {slices.map((slice) => (
                    <div key={`${slice.hueIndex}-${slice.name}`} className="flex items-center gap-2.5 text-sm">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colorFor(slice) }} />
                        <span className="min-w-0 truncate text-muted-foreground">{slice.name}</span>
                        <span className="ml-auto shrink-0 font-medium tabular-nums">{format(slice.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
