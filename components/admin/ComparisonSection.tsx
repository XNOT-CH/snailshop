"use client";

import { useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, format, subDays, subYears } from "date-fns";
import { th } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import {
    ArrowDownRight,
    ArrowLeftRight,
    ArrowUpRight,
    ChartLine,
    ChartNoAxesColumn,
    Download,
    Scale,
    Table as TableIcon,
} from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Button } from "@/components/ui/button";
import { formatCompactBaht } from "@/lib/formatters/currency";
import { formatBucketLabel, type BucketGranularity } from "@/lib/features/dashboard/bucketLabels";

type MetricKey = "revenue" | "orders" | "aov" | "topup" | "netInflow";
type ChartType = "line" | "bar";

interface PeriodData {
    points: Array<Record<MetricKey, number> & { date: string }>;
    totals: Record<MetricKey, number>;
}

interface CompareData {
    granularity: BucketGranularity;
    a: PeriodData;
    b: PeriodData;
}

const baht = (value: number, fractionDigits = 0) =>
    `฿${value.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: fractionDigits })}`;

const METRICS: Array<{ key: MetricKey; label: string; isBaht: boolean; format: (value: number) => string }> = [
    { key: "revenue", label: "รายได้", isBaht: true, format: (v) => baht(v) },
    { key: "orders", label: "คำสั่งซื้อ", isBaht: false, format: (v) => v.toLocaleString("th-TH") },
    { key: "aov", label: "ยอดเฉลี่ย/ออเดอร์", isBaht: true, format: (v) => baht(v, 2) },
    { key: "topup", label: "เติมเงินอนุมัติ", isBaht: true, format: (v) => baht(v) },
    { key: "netInflow", label: "เงินเข้าสุทธิ", isBaht: true, format: (v) => baht(v) },
];

// Cumulative AOV/net-inflow are ratios/differences of the running sums, not
// running sums of the per-bucket values.
function seriesValues(points: PeriodData["points"], metric: MetricKey, cumulative: boolean): number[] {
    if (!cumulative) {
        return points.map((point) => point[metric]);
    }
    let revenue = 0;
    let orders = 0;
    let topup = 0;
    return points.map((point) => {
        revenue += point.revenue;
        orders += point.orders;
        topup += point.topup;
        switch (metric) {
            case "revenue":
                return revenue;
            case "orders":
                return orders;
            case "topup":
                return topup;
            case "aov":
                return orders > 0 ? revenue / orders : 0;
            case "netInflow":
                return topup - revenue;
        }
    });
}

function rangeToParams(range: DateRange): { start: string; end: string } | null {
    if (!range.from || !range.to) return null;
    return { start: format(range.from, "yyyy-MM-dd"), end: format(range.to, "yyyy-MM-dd") };
}

function rangeLabel(range: DateRange): string {
    if (!range.from || !range.to) return "";
    const fromStr = format(range.from, "d MMM", { locale: th });
    if (range.from.toDateString() === range.to.toDateString()) return fromStr;
    return `${fromStr} – ${format(range.to, "d MMM", { locale: th })}`;
}

function DeltaBadge({ current, baseline }: Readonly<{ current: number; baseline: number }>) {
    if (baseline === 0) {
        return <span className="text-xs text-muted-foreground">—</span>;
    }
    const pct = ((current - baseline) / Math.abs(baseline)) * 100;
    const isUp = pct >= 0;
    const Arrow = isUp ? ArrowUpRight : ArrowDownRight;
    return (
        <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            }`}
        >
            <Arrow className="h-3.5 w-3.5" />
            {Math.abs(pct).toLocaleString("th-TH", { maximumFractionDigits: 1 })}%
        </span>
    );
}

interface ChartRow {
    index: number;
    label: string;
    aDate: string | null;
    bDate: string | null;
    a: number | null;
    b: number | null;
}

function CompareTooltip({
    active,
    payload,
    formatValue,
    granularity,
    labelA,
    labelB,
}: Readonly<{
    active?: boolean;
    payload?: Array<{ payload: ChartRow }>;
    formatValue: (value: number) => string;
    granularity: BucketGranularity;
    labelA: string;
    labelB: string;
}>) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;

    return (
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-xl" style={{ minWidth: 200 }}>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="inline-block h-0.5 w-4 rounded-full bg-[var(--chart-1)]" />
                        {row.aDate ? formatBucketLabel(row.aDate, granularity, true) : labelA}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-foreground">
                        {row.a === null ? "—" : formatValue(row.a)}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="inline-block h-0.5 w-4 rounded-full border-t-2 border-dashed border-muted-foreground" />
                        {row.bDate ? formatBucketLabel(row.bDate, granularity, true) : labelB}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                        {row.b === null ? "—" : formatValue(row.b)}
                    </span>
                </div>
            </div>
        </div>
    );
}

function buildCsv(data: CompareData): string {
    const header = [
        "ลำดับ",
        "วันที่ A",
        ...METRICS.map((m) => `${m.label} A`),
        "วันที่ B",
        ...METRICS.map((m) => `${m.label} B`),
    ];
    const rowCount = Math.max(data.a.points.length, data.b.points.length);
    const rows = Array.from({ length: rowCount }, (_, i) => {
        const a = data.a.points[i];
        const b = data.b.points[i];
        return [
            i + 1,
            a?.date ?? "",
            ...METRICS.map((m) => (a ? a[m.key] : "")),
            b?.date ?? "",
            ...METRICS.map((m) => (b ? b[m.key] : "")),
        ];
    });
    const totals = ["รวม", "", ...METRICS.map((m) => data.a.totals[m.key]), "", ...METRICS.map((m) => data.b.totals[m.key])];
    return [header, ...rows, totals].map((row) => row.join(",")).join("\r\n");
}

export function ComparisonSection() {
    const today = useMemo(() => new Date(), []);
    const [rangeA, setRangeA] = useState<DateRange>({ from: subDays(today, 6), to: today });
    const [rangeB, setRangeB] = useState<DateRange>({ from: subDays(today, 13), to: subDays(today, 7) });
    const [metric, setMetric] = useState<MetricKey>("revenue");
    const [chartType, setChartType] = useState<ChartType>("line");
    const [cumulative, setCumulative] = useState(false);
    const [showTable, setShowTable] = useState(false);
    const [cache, setCache] = useState<Record<string, CompareData>>({});
    const [failed, setFailed] = useState(false);

    const paramsA = rangeToParams(rangeA);
    const paramsB = rangeToParams(rangeB);
    const cacheKey = paramsA && paramsB ? `${paramsA.start}_${paramsA.end}_${paramsB.start}_${paramsB.end}` : null;

    useEffect(() => {
        const a = rangeToParams(rangeA);
        const b = rangeToParams(rangeB);
        if (!a || !b) return;
        const key = `${a.start}_${a.end}_${b.start}_${b.end}`;
        if (cache[key]) return;

        let cancelled = false;
        const query = new URLSearchParams({ aStart: a.start, aEnd: a.end, bStart: b.start, bEnd: b.end });

        fetch(`/api/admin/dashboard/kpi-compare?${query}`, { cache: "no-store" })
            .then((response) => response.json())
            .then((json) => {
                if (cancelled) return;
                if (json?.success && json.a && json.b) {
                    setFailed(false);
                    setCache((prev) => ({ ...prev, [key]: { granularity: json.granularity, a: json.a, b: json.b } }));
                } else {
                    setFailed(true);
                }
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });

        return () => {
            cancelled = true;
        };
    }, [rangeA, rangeB, cache]);

    const data = cacheKey ? cache[cacheKey] : undefined;
    const activeMetric = METRICS.find((m) => m.key === metric) ?? METRICS[0];
    const labelA = `ช่วง A (${rangeLabel(rangeA)})`;
    const labelB = `ช่วง B (${rangeLabel(rangeB)})`;

    const chartRows: ChartRow[] | undefined = useMemo(() => {
        if (!data) return undefined;
        const valuesA = seriesValues(data.a.points, metric, cumulative);
        const valuesB = seriesValues(data.b.points, metric, cumulative);
        const rowCount = Math.max(valuesA.length, valuesB.length);
        return Array.from({ length: rowCount }, (_, i) => {
            const aDate = data.a.points[i]?.date ?? null;
            const bDate = data.b.points[i]?.date ?? null;
            return {
                index: i + 1,
                label: aDate
                    ? formatBucketLabel(aDate, data.granularity)
                    : bDate
                      ? formatBucketLabel(bDate, data.granularity)
                      : `${i + 1}`,
                aDate,
                bDate,
                a: valuesA[i] ?? null,
                b: valuesB[i] ?? null,
            };
        });
    }, [data, metric, cumulative]);

    const swapPeriods = () => {
        setRangeA(rangeB);
        setRangeB(rangeA);
    };

    // One-click B presets relative to A: the adjacent window of the same
    // length before A, or the same calendar window one year earlier.
    const setPreviousPeriod = () => {
        if (!rangeA.from || !rangeA.to) return;
        const days = differenceInCalendarDays(rangeA.to, rangeA.from) + 1;
        setRangeB({ from: subDays(rangeA.from, days), to: subDays(rangeA.from, 1) });
    };

    const setYearAgoPeriod = () => {
        if (!rangeA.from || !rangeA.to) return;
        setRangeB({ from: subYears(rangeA.from, 1), to: subYears(rangeA.to, 1) });
    };

    const exportCsv = () => {
        if (!data || !paramsA || !paramsB) return;
        // BOM so Excel opens Thai text as UTF-8.
        const blob = new Blob([String.fromCharCode(0xfeff), buildCsv(data)], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `kpi-compare_${paramsA.start}_${paramsA.end}_vs_${paramsB.start}_${paramsB.end}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const yTickFormatter = (value: number) =>
        activeMetric.isBaht ? formatCompactBaht(value) : value.toLocaleString("th-TH");

    return (
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)]">
            {/* Header */}
            <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                <div className="w-6 h-6 bg-[#145de7] rounded flex items-center justify-center">
                    <Scale className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-bold">เปรียบเทียบข้อมูล</span>
            </div>

            <div className="p-5 space-y-4">
                {/* Period + display controls */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">ช่วง A</span>
                        <DateRangePicker value={rangeA} onChange={(range) => range && setRangeA(range)} />
                    </div>
                    <Button variant="ghost" size="sm" className="h-9 px-2" onClick={swapPeriods} title="สลับช่วง A ↔ B">
                        <ArrowLeftRight className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">ช่วง B</span>
                        <DateRangePicker value={rangeB} onChange={(range) => range && setRangeB(range)} />
                        <div className="flex items-center gap-1">
                            <button
                                onClick={setPreviousPeriod}
                                title="ตั้งช่วง B เป็นช่วงยาวเท่ากันที่อยู่ติดกันก่อนหน้าช่วง A"
                                className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground"
                            >
                                ก่อนหน้า
                            </button>
                            <button
                                onClick={setYearAgoPeriod}
                                title="ตั้งช่วง B เป็นช่วงเดียวกันของปีที่แล้ว"
                                className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground"
                            >
                                ปีที่แล้ว
                            </button>
                        </div>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                            <button
                                onClick={() => setChartType("line")}
                                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                                    chartType === "line"
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <ChartLine className="h-3.5 w-3.5" />
                                เส้น
                            </button>
                            <button
                                onClick={() => setChartType("bar")}
                                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                                    chartType === "bar"
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <ChartNoAxesColumn className="h-3.5 w-3.5" />
                                แท่งคู่
                            </button>
                        </div>
                        <button
                            onClick={() => setCumulative((prev) => !prev)}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                                cumulative
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            ยอดสะสม
                        </button>
                        <button
                            onClick={() => setShowTable((prev) => !prev)}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                                showTable
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <TableIcon className="h-3.5 w-3.5" />
                            ตาราง
                        </button>
                        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={exportCsv} disabled={!data}>
                            <Download className="h-3.5 w-3.5" />
                            CSV
                        </Button>
                    </div>
                </div>

                {/* Metric tiles: A vs B for every metric; click to chart that metric */}
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                    {METRICS.map((m) => {
                        const active = m.key === metric;
                        return (
                            <button
                                key={m.key}
                                type="button"
                                onClick={() => setMetric(m.key)}
                                className={`rounded-xl border p-3 text-left transition-all duration-200 ${
                                    active
                                        ? "border-primary/60 bg-primary/5 ring-1 ring-primary/40"
                                        : "border-border/70 hover:border-border hover:bg-muted/40"
                                }`}
                            >
                                <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
                                <p className="mt-1 text-lg font-bold tracking-tight tabular-nums">
                                    {data ? m.format(data.a.totals[m.key]) : "…"}
                                </p>
                                <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                    <span className="tabular-nums">{data ? m.format(data.b.totals[m.key]) : "…"}</span>
                                    {data && <DeltaBadge current={data.a.totals[m.key]} baseline={data.b.totals[m.key]} />}
                                </p>
                            </button>
                        );
                    })}
                </div>

                {failed && <p className="py-10 text-center text-sm text-muted-foreground">โหลดข้อมูลไม่สำเร็จ ลองเปลี่ยนช่วงเวลาแล้วลองใหม่</p>}
                {!failed && !data && <p className="py-10 text-center text-sm text-muted-foreground">กำลังโหลด…</p>}

                {data && chartRows && (
                    <div className="space-y-2">
                        {/* Legend */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <span className="inline-block h-0.5 w-5 rounded-full bg-[var(--chart-1)]" />
                                {labelA}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="inline-block h-0.5 w-5 rounded-full border-t-2 border-dashed border-muted-foreground" />
                                {labelB}
                            </span>
                            <span className="ml-auto">
                                {activeMetric.label}
                                {cumulative ? " (สะสม)" : ""} · {data.granularity === "hour" ? "รายชั่วโมง" : "รายวัน"}
                            </span>
                        </div>

                        <ResponsiveContainer width="100%" height={300}>
                            {chartType === "line" ? (
                                <LineChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.6} />
                                    <XAxis
                                        dataKey="label"
                                        stroke="var(--color-muted-foreground)"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={8}
                                        interval="preserveStartEnd"
                                        minTickGap={24}
                                    />
                                    <YAxis
                                        tickFormatter={yTickFormatter}
                                        stroke="var(--color-muted-foreground)"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        width={60}
                                    />
                                    <Tooltip
                                        content={
                                            <CompareTooltip
                                                formatValue={activeMetric.format}
                                                granularity={data.granularity}
                                                labelA={labelA}
                                                labelB={labelB}
                                            />
                                        }
                                        cursor={{ stroke: "var(--color-primary)", strokeWidth: 1, strokeDasharray: "4 4" }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="b"
                                        name={labelB}
                                        stroke="var(--color-muted-foreground)"
                                        strokeWidth={2}
                                        strokeDasharray="6 4"
                                        dot={false}
                                        activeDot={{ r: 4, fill: "var(--color-muted-foreground)", stroke: "var(--card)", strokeWidth: 2 }}
                                        animationDuration={500}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="a"
                                        name={labelA}
                                        stroke="var(--chart-1)"
                                        strokeWidth={2.5}
                                        dot={false}
                                        activeDot={{ r: 5, fill: "var(--chart-dot-fill)", stroke: "var(--card)", strokeWidth: 2.5 }}
                                        animationDuration={500}
                                    />
                                </LineChart>
                            ) : (
                                <BarChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.6} />
                                    <XAxis
                                        dataKey="label"
                                        stroke="var(--color-muted-foreground)"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={8}
                                        interval="preserveStartEnd"
                                        minTickGap={24}
                                    />
                                    <YAxis
                                        tickFormatter={yTickFormatter}
                                        stroke="var(--color-muted-foreground)"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        width={60}
                                    />
                                    <Tooltip
                                        content={
                                            <CompareTooltip
                                                formatValue={activeMetric.format}
                                                granularity={data.granularity}
                                                labelA={labelA}
                                                labelB={labelB}
                                            />
                                        }
                                        cursor={{ fill: "var(--color-muted)", fillOpacity: 0.4 }}
                                    />
                                    <Bar
                                        dataKey="a"
                                        name={labelA}
                                        fill="var(--chart-1)"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={28}
                                        animationDuration={500}
                                    />
                                    <Bar
                                        dataKey="b"
                                        name={labelB}
                                        fill="var(--color-muted-foreground)"
                                        fillOpacity={0.55}
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={28}
                                        animationDuration={500}
                                    />
                                </BarChart>
                            )}
                        </ResponsiveContainer>

                        {showTable && (
                            <div className="max-h-96 overflow-y-auto overflow-x-auto rounded-xl border border-border/60">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-card">
                                        <tr className="border-b border-border/60 bg-muted/40 text-left text-xs text-muted-foreground">
                                            <th className="px-3 py-2 font-medium">{data.granularity === "hour" ? "ชั่วโมง A" : "วันที่ A"}</th>
                                            <th className="px-3 py-2 text-right font-medium">ช่วง A</th>
                                            <th className="px-3 py-2 font-medium">{data.granularity === "hour" ? "ชั่วโมง B" : "วันที่ B"}</th>
                                            <th className="px-3 py-2 text-right font-medium">ช่วง B</th>
                                            <th className="px-3 py-2 text-right font-medium">เปลี่ยนแปลง</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {chartRows.map((row) => {
                                            const pct =
                                                row.a !== null && row.b !== null && row.b !== 0
                                                    ? ((row.a - row.b) / Math.abs(row.b)) * 100
                                                    : null;
                                            return (
                                                <tr key={row.index} className="border-b border-border/40 last:border-0">
                                                    <td className="px-3 py-1.5 text-muted-foreground">
                                                        {row.aDate ? formatBucketLabel(row.aDate, data.granularity, true) : "—"}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                                                        {row.a === null ? "—" : activeMetric.format(row.a)}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-muted-foreground">
                                                        {row.bDate ? formatBucketLabel(row.bDate, data.granularity, true) : "—"}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                                                        {row.b === null ? "—" : activeMetric.format(row.b)}
                                                    </td>
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
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
