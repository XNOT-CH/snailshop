"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type Range = "today" | "7d" | "30d" | "all";
type Mode = "best" | "stale";
type StaleDays = 30 | 60 | 90;

interface BestSellerRow {
    productName: string;
    productImage: string | null;
    units: number;
    revenue: number;
}

interface StaleStockRow {
    id: string;
    name: string;
    imageUrl: string | null;
    category: string;
    price: number;
    stockCount: number | null;
    stuckValue: number;
    lastSoldAt: string | null;
}

interface StaleStockData {
    staleCount: number;
    totalStuckValue: number;
    items: StaleStockRow[];
}

const rangeLabels: Record<Range, string> = {
    today: "วันนี้",
    "7d": "7 วัน",
    "30d": "30 วัน",
    all: "ทั้งหมด",
};

const STALE_DAYS: StaleDays[] = [30, 60, 90];

function lastSoldLabel(iso: string | null): string {
    if (!iso) return "ไม่เคยขายเลย";
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
    return days < 1 ? "ขายล่าสุดวันนี้" : `ขายล่าสุด ${days.toLocaleString("th-TH")} วันก่อน`;
}

export function BestSellers() {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>("best");
    const [range, setRange] = useState<Range>("30d");
    const [staleDays, setStaleDays] = useState<StaleDays>(30);
    const [cache, setCache] = useState<Partial<Record<Range, BestSellerRow[]>>>({});
    const [staleCache, setStaleCache] = useState<Partial<Record<StaleDays, StaleStockData>>>({});

    useEffect(() => {
        if (mode !== "best" || cache[range]) {
            return;
        }

        let cancelled = false;

        fetch(`/api/admin/dashboard/best-sellers?range=${range}`, { cache: "no-store" })
            .then((response) => response.json())
            .then((json) => {
                const rows: BestSellerRow[] = json?.success && Array.isArray(json.data) ? json.data : [];
                if (!cancelled) {
                    setCache((prev) => ({ ...prev, [range]: rows }));
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setCache((prev) => ({ ...prev, [range]: [] }));
                }
            });

        return () => {
            cancelled = true;
        };
    }, [mode, range, cache]);

    useEffect(() => {
        if (mode !== "stale" || staleCache[staleDays]) {
            return;
        }

        let cancelled = false;

        fetch(`/api/admin/dashboard/stale-stock?days=${staleDays}`, { cache: "no-store" })
            .then((response) => response.json())
            .then((json) => {
                if (!cancelled && json?.success) {
                    setStaleCache((prev) => ({
                        ...prev,
                        [staleDays]: { staleCount: json.staleCount, totalStuckValue: json.totalStuckValue, items: json.items },
                    }));
                } else if (!cancelled) {
                    setStaleCache((prev) => ({ ...prev, [staleDays]: { staleCount: 0, totalStuckValue: 0, items: [] } }));
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setStaleCache((prev) => ({ ...prev, [staleDays]: { staleCount: 0, totalStuckValue: 0, items: [] } }));
                }
            });

        return () => {
            cancelled = true;
        };
    }, [mode, staleDays, staleCache]);

    const bestRows = cache[range] ?? [];
    const maxRevenue = bestRows.length > 0 ? bestRows[0].revenue : 0;
    const stale = staleCache[staleDays];
    const maxStuck = stale && stale.items.length > 0 ? stale.items[0].stuckValue : 0;
    const showLoader = mode === "best" ? !cache[range] : !stale;

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                        <button
                            onClick={() => setMode("best")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                                mode === "best" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            ขายดี
                        </button>
                        <button
                            onClick={() => setMode("stale")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                                mode === "stale" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            ค้างสต็อก
                        </button>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">{mode === "best" ? "สินค้าขายดี" : "สินค้าค้างสต็อก"}</h3>
                        <p className="text-sm text-muted-foreground">
                            {mode === "best" ? "10 อันดับตามรายได้" : `มีสต็อกแต่ขายไม่ออกเกิน ${staleDays} วัน`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                    {mode === "best"
                        ? (Object.keys(rangeLabels) as Range[]).map((key) => (
                              <button
                                  key={key}
                                  onClick={() => setRange(key)}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                                      range === key
                                          ? "bg-primary text-primary-foreground shadow-sm"
                                          : "text-muted-foreground hover:text-foreground"
                                  }`}
                              >
                                  {rangeLabels[key]}
                              </button>
                          ))
                        : STALE_DAYS.map((d) => (
                              <button
                                  key={d}
                                  onClick={() => setStaleDays(d)}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                                      staleDays === d
                                          ? "bg-primary text-primary-foreground shadow-sm"
                                          : "text-muted-foreground hover:text-foreground"
                                  }`}
                              >
                                  {d} วัน
                              </button>
                          ))}
                </div>
            </div>

            {showLoader && (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังโหลดข้อมูล
                </div>
            )}

            {!showLoader && mode === "best" && (
                bestRows.length === 0 ? (
                    <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                        ยังไม่มียอดขายในช่วงเวลานี้
                    </div>
                ) : (
                    <ol className="space-y-1.5">
                        {bestRows.map((row, index) => (
                            <li key={row.productName} className="relative overflow-hidden rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
                                {/* Revenue bar relative to the top seller */}
                                <div
                                    className="absolute inset-y-0 left-0 bg-primary/8 dark:bg-primary/15 rounded-lg"
                                    style={{ width: maxRevenue > 0 ? `${(row.revenue / maxRevenue) * 100}%` : 0 }}
                                />
                                <div className="relative flex items-center gap-3">
                                    <span className="w-5 shrink-0 text-center text-sm font-semibold text-muted-foreground tabular-nums">
                                        {index + 1}
                                    </span>
                                    {row.productImage ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={row.productImage}
                                            alt=""
                                            className="h-8 w-8 shrink-0 rounded-md object-cover bg-muted"
                                        />
                                    ) : (
                                        <div className="h-8 w-8 shrink-0 rounded-md bg-muted" />
                                    )}
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.productName}</span>
                                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{row.units.toLocaleString()} ชิ้น</span>
                                    <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
                                        ฿{row.revenue.toLocaleString()}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ol>
                )
            )}

            {!showLoader && mode === "stale" && stale && (
                stale.items.length === 0 ? (
                    <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                        ไม่มีสินค้าค้างสต็อกในช่วงนี้ 🎉
                    </div>
                ) : (
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                            รวม {stale.staleCount.toLocaleString("th-TH")} รายการ · มูลค่าสต็อกที่จมอยู่{" "}
                            <span className="font-semibold text-foreground">฿{stale.totalStuckValue.toLocaleString("th-TH")}</span>
                            {stale.staleCount > stale.items.length ? ` (แสดง ${stale.items.length} อันดับแรกตามมูลค่า)` : ""}
                        </p>
                        <ol className="space-y-1.5">
                            {stale.items.map((row) => (
                                <li key={row.id}>
                                    <button
                                        type="button"
                                        onClick={() => router.push(`/admin/products/${row.id}/edit`)}
                                        className="relative w-full overflow-hidden rounded-lg px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                                    >
                                        {/* Stuck-value bar relative to the worst offender */}
                                        <div
                                            className="absolute inset-y-0 left-0 bg-rose-500/10 dark:bg-rose-500/15 rounded-lg"
                                            style={{ width: maxStuck > 0 ? `${(row.stuckValue / maxStuck) * 100}%` : 0 }}
                                        />
                                        <div className="relative flex items-center gap-3">
                                            {row.imageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={row.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover bg-muted" />
                                            ) : (
                                                <div className="h-8 w-8 shrink-0 rounded-md bg-muted" />
                                            )}
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium">{row.name}</span>
                                                <span className="block text-xs text-muted-foreground">{lastSoldLabel(row.lastSoldAt)}</span>
                                            </span>
                                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                                {row.stockCount === null ? "?" : row.stockCount.toLocaleString("th-TH")} ชิ้น
                                            </span>
                                            <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
                                                ฿{row.stuckValue.toLocaleString("th-TH")}
                                            </span>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ol>
                    </div>
                )
            )}
        </div>
    );
}
