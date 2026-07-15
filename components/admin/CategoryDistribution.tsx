"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { ChartPie, ChevronDown, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DonutChart, DONUT_SLICE_HUES, DONUT_OTHER_COLOR } from "@/components/admin/DonutChart";

interface ProductRow {
    name: string;
    revenue: number;
    orders: number;
}

interface CategoryRow {
    name: string;
    revenue: number;
    orders: number;
    products: ProductRow[];
}

type PresetDays = 7 | 30 | 90;

const PRESET_OPTIONS: PresetDays[] = [7, 30, 90];

const baht = (value: number) => `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;

/**
 * Overview donut pair + drill-down table: revenue/order share by product
 * category over a selectable Thai-day range, searchable down to the products
 * each category's numbers come from.
 */
export function CategoryDistribution() {
    const [preset, setPreset] = useState<PresetDays>(30);
    const [customRange, setCustomRange] = useState<DateRange | undefined>();
    const [cache, setCache] = useState<Record<string, CategoryRow[]>>({});
    const [failedKey, setFailedKey] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const isCustom = Boolean(customRange?.from && customRange?.to);
    const startKey = customRange?.from ? format(customRange.from, "yyyy-MM-dd") : null;
    const endKey = customRange?.to ? format(customRange.to, "yyyy-MM-dd") : null;
    const rangeKey = isCustom ? `${startKey}_${endKey}` : `d${preset}`;

    useEffect(() => {
        if (cache[rangeKey]) return;
        const url = isCustom
            ? `/api/admin/dashboard/category-distribution?startDate=${startKey}&endDate=${endKey}`
            : `/api/admin/dashboard/category-distribution?days=${preset}`;

        let cancelled = false;
        fetch(url, { cache: "no-store" })
            .then((res) => res.json())
            .then((json) => {
                if (cancelled) return;
                if (json?.success && Array.isArray(json.categories)) {
                    setCache((prev) => ({ ...prev, [rangeKey]: json.categories }));
                } else {
                    setFailedKey(rangeKey);
                }
            })
            .catch(() => {
                if (!cancelled) setFailedKey(rangeKey);
            });
        return () => {
            cancelled = true;
        };
    }, [rangeKey, isCustom, startKey, endKey, preset, cache]);

    const categories = cache[rangeKey];

    const rangeLabel = useMemo(() => {
        if (isCustom && customRange?.from && customRange?.to) {
            return `${format(customRange.from, "d MMM yyyy", { locale: th })} – ${format(customRange.to, "d MMM yyyy", { locale: th })}`;
        }
        return `${preset} วันล่าสุด`;
    }, [isCustom, customRange, preset]);

    // Search matches category names OR product names; a product-only match keeps
    // just the matching products so you can see exactly what was counted.
    const q = query.trim().toLowerCase();
    const filtered = useMemo(() => {
        if (!categories) return [];
        if (!q) return categories.map((category) => ({ category, productFiltered: false }));
        const result: Array<{ category: CategoryRow; productFiltered: boolean }> = [];
        for (const category of categories) {
            if (category.name.toLowerCase().includes(q)) {
                result.push({ category, productFiltered: false });
                continue;
            }
            const products = category.products.filter((p) => p.name.toLowerCase().includes(q));
            if (products.length > 0) {
                result.push({ category: { ...category, products }, productFiltered: true });
            }
        }
        return result;
    }, [categories, q]);

    const toggleExpanded = (name: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    // Table dot colors mirror the donut: top-4 categories wear the slice hues,
    // everything else the gray "อื่นๆ" tone.
    const colorOf = (categoryName: string) => {
        const index = (categories ?? []).findIndex((c) => c.name === categoryName);
        return index >= 0 && index < DONUT_SLICE_HUES.length ? DONUT_SLICE_HUES[index] : DONUT_OTHER_COLOR;
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)]">
            {/* Header + range controls */}
            <div className="border-b border-border py-3 px-5 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#145de7] rounded flex items-center justify-center">
                        <ChartPie className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-bold">สัดส่วนตามหมวดหมู่สินค้า</span>
                    <span className="text-xs text-muted-foreground">· {rangeLabel}</span>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                        {PRESET_OPTIONS.map((option) => (
                            <button
                                key={option}
                                onClick={() => {
                                    setPreset(option);
                                    setCustomRange(undefined);
                                }}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                                    !isCustom && preset === option
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {option} วัน
                            </button>
                        ))}
                    </div>
                    <DateRangePicker
                        value={customRange}
                        onChange={(range) => setCustomRange(range)}
                        placeholder="กำหนดเอง"
                        className={isCustom ? "border-primary text-primary" : ""}
                    />
                </div>
            </div>

            <div className="p-5">
                {!categories && failedKey !== rangeKey && (
                    <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังโหลดข้อมูล
                    </div>
                )}
                {!categories && failedKey === rangeKey && (
                    <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                        โหลดข้อมูลไม่สำเร็จ ลองเปลี่ยนช่วงวันแล้วกลับมาใหม่
                    </div>
                )}

                {categories && (
                    <div className="space-y-6">
                        {/* Donut pair — same category order feeds both, so colors match */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <div>
                                <h4 className="mb-3 text-sm font-semibold text-foreground">รายได้</h4>
                                <DonutChart
                                    data={categories.map((c) => ({ name: c.name, value: c.revenue }))}
                                    format={baht}
                                    centerCaption="รายได้รวม"
                                    emptyText="ยังไม่มีคำสั่งซื้อในช่วงนี้"
                                />
                            </div>
                            <div>
                                <h4 className="mb-3 text-sm font-semibold text-foreground">ออเดอร์</h4>
                                <DonutChart
                                    data={categories.map((c) => ({ name: c.name, value: c.orders }))}
                                    format={(v) => `${v.toLocaleString("th-TH")} ออเดอร์`}
                                    centerCaption="ออเดอร์ทั้งหมด"
                                    emptyText="ยังไม่มีคำสั่งซื้อในช่วงนี้"
                                />
                            </div>
                        </div>

                        {/* Search + drill-down table */}
                        {categories.length > 0 && (
                            <div className="space-y-3">
                                <div className="relative max-w-sm">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="ค้นหาหมวดหมู่ หรือชื่อสินค้า…"
                                        className="h-9 pl-9"
                                    />
                                </div>

                                {filtered.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-muted-foreground">
                                        ไม่พบหมวดหมู่หรือสินค้าที่ตรงกับ “{query.trim()}”
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-border/60">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border/60 bg-muted/40 text-left text-xs text-muted-foreground">
                                                    <th className="px-3 py-2 font-medium">หมวดหมู่ / สินค้า</th>
                                                    <th className="px-3 py-2 text-right font-medium">รายได้</th>
                                                    <th className="px-3 py-2 text-right font-medium">ออเดอร์</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filtered.map(({ category, productFiltered }) => {
                                                    const isOpen = expanded.has(category.name) || productFiltered;
                                                    return (
                                                        <FragmentRows
                                                            key={category.name}
                                                            category={category}
                                                            isOpen={isOpen}
                                                            color={colorOf(category.name)}
                                                            onToggle={() => toggleExpanded(category.name)}
                                                        />
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function FragmentRows({
    category,
    isOpen,
    color,
    onToggle,
}: Readonly<{
    category: CategoryRow;
    isOpen: boolean;
    color: string;
    onToggle: () => void;
}>) {
    return (
        <>
            <tr
                onClick={onToggle}
                className="cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
            >
                <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2 font-medium">
                        <ChevronDown
                            className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`}
                        />
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                        {category.name}
                        <span className="text-xs font-normal text-muted-foreground">
                            ({category.products.length.toLocaleString("th-TH")} สินค้า)
                        </span>
                    </span>
                </td>
                <td className="px-3 py-2.5 text-right font-medium tabular-nums">{baht(category.revenue)}</td>
                <td className="px-3 py-2.5 text-right font-medium tabular-nums">{category.orders.toLocaleString("th-TH")}</td>
            </tr>
            {isOpen &&
                category.products.map((product, index) => (
                    <tr key={`${index}-${product.name}`} className="border-b border-border/30 bg-muted/20 text-xs last:border-0">
                        <td className="py-2 pl-12 pr-3 text-muted-foreground">{product.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{baht(product.revenue)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{product.orders.toLocaleString("th-TH")}</td>
                    </tr>
                ))}
        </>
    );
}
