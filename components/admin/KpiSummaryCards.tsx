"use client";

import { useEffect, useState } from "react";
import { DollarSign, Receipt, ShoppingCart, Wallet, type LucideIcon } from "lucide-react";
import dynamic from "next/dynamic";

// Only mounts when a KPI card is clicked, so its recharts payload loads on
// first drilldown instead of with the dashboard.
const KpiDrilldownDialog = dynamic(
    () => import("@/components/admin/KpiDrilldownDialog").then((mod) => mod.KpiDrilldownDialog),
    { ssr: false },
);
import { DeltaBadge } from "@/components/admin/DeltaBadge";

type Range = "today" | "7d" | "30d" | "all";

interface PeriodMetrics {
    revenue: number;
    orders: number;
    aov: number;
    topup: number;
    netInflow: number;
}

interface KpiSummary {
    current: PeriodMetrics;
    previous: PeriodMetrics | null;
}

const rangeLabels: Record<Range, string> = {
    today: "วันนี้",
    "7d": "7 วัน",
    "30d": "30 วัน",
    all: "ทั้งหมด",
};

const compareLabels: Record<Exclude<Range, "all">, string> = {
    today: "เทียบเมื่อวาน",
    "7d": "เทียบ 7 วันก่อนหน้า",
    "30d": "เทียบ 30 วันก่อนหน้า",
};

const baht = (value: number, fractionDigits = 0) =>
    `฿${value.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: fractionDigits })}`;

interface CardDef {
    key: "revenue" | "orders" | "aov" | "netInflow";
    title: string;
    subtitle?: string;
    icon: LucideIcon;
    gradient: string;
    lightBg: string;
    iconColor: string;
    format: (value: number) => string;
    isBaht: boolean;
}

const CARDS: CardDef[] = [
    {
        key: "revenue",
        title: "รายได้",
        icon: DollarSign,
        gradient: "from-[#145de7] to-[#114fc4]",
        lightBg: "bg-blue-50 dark:bg-blue-950/30",
        iconColor: "text-[#145de7] dark:text-blue-400",
        format: (v) => baht(v),
        isBaht: true,
    },
    {
        key: "orders",
        title: "คำสั่งซื้อ",
        icon: ShoppingCart,
        gradient: "from-amber-500 to-orange-500",
        lightBg: "bg-amber-50 dark:bg-amber-950/30",
        iconColor: "text-amber-600 dark:text-amber-400",
        format: (v) => v.toLocaleString("th-TH"),
        isBaht: false,
    },
    {
        key: "aov",
        title: "ยอดเฉลี่ยต่อออเดอร์",
        icon: Receipt,
        gradient: "from-violet-500 to-purple-600",
        lightBg: "bg-violet-50 dark:bg-violet-950/30",
        iconColor: "text-violet-600 dark:text-violet-400",
        format: (v) => baht(v, 2),
        isBaht: true,
    },
    {
        key: "netInflow",
        title: "เงินเข้าสุทธิ",
        subtitle: "เติมเงินอนุมัติ − ยอดซื้อ",
        icon: Wallet,
        gradient: "from-emerald-500 to-teal-600",
        lightBg: "bg-emerald-50 dark:bg-emerald-950/30",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        format: (v) => baht(v),
        isBaht: true,
    },
];

function DeltaLine({
    current,
    previous,
    compareLabel,
    format,
}: Readonly<{ current: number; previous: number; compareLabel: string; format: (value: number) => string }>) {
    return (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <DeltaBadge current={current} baseline={previous} format={format} />
            {compareLabel}
        </p>
    );
}

export function KpiSummaryCards() {
    const [range, setRange] = useState<Range>("7d");
    const [cache, setCache] = useState<Partial<Record<Range, KpiSummary>>>({});
    const [drilldown, setDrilldown] = useState<CardDef["key"] | null>(null);

    useEffect(() => {
        if (cache[range]) {
            return;
        }

        let cancelled = false;

        fetch(`/api/admin/dashboard/kpi-summary?range=${range}`, { cache: "no-store" })
            .then((response) => response.json())
            .then((json) => {
                if (!cancelled && json?.success && json.current) {
                    setCache((prev) => ({ ...prev, [range]: { current: json.current, previous: json.previous ?? null } }));
                }
            })
            .catch(() => {
                // Leave the cards in their loading state; a range re-select retries.
            });

        return () => {
            cancelled = true;
        };
    }, [range, cache]);

    const summary = cache[range];
    const activeCard = CARDS.find((card) => card.key === drilldown);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-muted-foreground">สรุปช่วงเวลา</h3>
                <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                    {(Object.keys(rangeLabels) as Range[]).map((key) => (
                        <button
                            key={key}
                            onClick={() => setRange(key)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${range === key
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {rangeLabels[key]}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {CARDS.map((card) => {
                    const Icon = card.icon;
                    const clickable = range !== "all";
                    return (
                        <button
                            key={card.key}
                            type="button"
                            disabled={!clickable}
                            onClick={() => setDrilldown(card.key)}
                            title={clickable ? "ดูรายละเอียดรายวัน" : undefined}
                            className={`relative overflow-hidden rounded-2xl border border-border/80 bg-card/95 text-left shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)] transition-shadow duration-300 hover:shadow-[0_24px_50px_-28px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                clickable ? "cursor-pointer" : "cursor-default"
                            }`}
                        >
                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`} />
                            <div className="p-5 pt-6">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            {card.title} · {rangeLabels[range]}
                                        </p>
                                        <p className="text-2xl font-bold tracking-tight">
                                            {summary ? card.format(summary.current[card.key]) : "…"}
                                        </p>
                                        {summary && range !== "all" && summary.previous && (
                                            <DeltaLine
                                                current={summary.current[card.key]}
                                                previous={summary.previous[card.key]}
                                                compareLabel={compareLabels[range]}
                                                format={card.format}
                                            />
                                        )}
                                        {card.subtitle && <p className="text-xs text-muted-foreground">{card.subtitle}</p>}
                                    </div>
                                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.lightBg}`}>
                                        <Icon className={`h-5 w-5 ${card.iconColor}`} />
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {range !== "all" && activeCard && (
                <KpiDrilldownDialog
                    open
                    onOpenChange={(open) => {
                        if (!open) setDrilldown(null);
                    }}
                    metric={activeCard.key}
                    metricTitle={activeCard.title}
                    range={range}
                    compareLabel={compareLabels[range]}
                    format={activeCard.format}
                    isBaht={activeCard.isBaht}
                />
            )}
        </div>
    );
}
