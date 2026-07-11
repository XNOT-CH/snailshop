"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Range = "today" | "7d" | "30d" | "all";

interface BestSellerRow {
    productName: string;
    productImage: string | null;
    units: number;
    revenue: number;
}

const rangeLabels: Record<Range, string> = {
    today: "วันนี้",
    "7d": "7 วัน",
    "30d": "30 วัน",
    all: "ทั้งหมด",
};

export function BestSellers() {
    const [range, setRange] = useState<Range>("30d");
    const [cache, setCache] = useState<Partial<Record<Range, BestSellerRow[]>>>({});

    useEffect(() => {
        if (cache[range]) {
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
    }, [range, cache]);

    const showLoader = !cache[range];
    const rows = cache[range] ?? [];
    const maxRevenue = rows.length > 0 ? rows[0].revenue : 0;

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                    <h3 className="text-lg font-semibold">สินค้าขายดี</h3>
                    <p className="text-sm text-muted-foreground">10 อันดับตามรายได้</p>
                </div>
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

            {showLoader ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังโหลดข้อมูลสินค้าขายดี
                </div>
            ) : rows.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    ยังไม่มียอดขายในช่วงเวลานี้
                </div>
            ) : (
                <ol className="space-y-1.5">
                    {rows.map((row, index) => (
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
            )}
        </div>
    );
}
