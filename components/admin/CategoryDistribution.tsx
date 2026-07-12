"use client";

import { useEffect, useState } from "react";
import { ChartPie, Loader2 } from "lucide-react";
import { DonutChart } from "@/components/admin/DonutChart";

interface CategoryRow {
    name: string;
    revenue: number;
    orders: number;
}

const baht = (value: number) => `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;

function DonutCard({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
    return (
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)]">
            <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                <div className="w-6 h-6 bg-[#145de7] rounded flex items-center justify-center">
                    <ChartPie className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-bold">{title}</span>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

/** Overview donut pair: revenue share and order share by product category (30 days). */
export function CategoryDistribution() {
    const [categories, setCategories] = useState<CategoryRow[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/admin/dashboard/category-distribution?days=30", { cache: "no-store" })
            .then((res) => res.json())
            .then((json) => {
                if (!cancelled) {
                    setCategories(json?.success && Array.isArray(json.categories) ? json.categories : []);
                }
            })
            .catch(() => {
                if (!cancelled) setCategories([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const loading = (
        <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            กำลังโหลดข้อมูล
        </div>
    );

    // Both donuts share the same category order (revenue-desc from the API) so a
    // category keeps the same color in both charts.
    return (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <DonutCard title="สัดส่วนรายได้ตามหมวดหมู่ (30 วันล่าสุด)">
                {categories === null ? (
                    loading
                ) : (
                    <DonutChart
                        data={categories.map((c) => ({ name: c.name, value: c.revenue }))}
                        format={baht}
                        centerCaption="รายได้รวม"
                        emptyText="ยังไม่มีคำสั่งซื้อในช่วงนี้"
                    />
                )}
            </DonutCard>
            <DonutCard title="สัดส่วนออเดอร์ตามหมวดหมู่ (30 วันล่าสุด)">
                {categories === null ? (
                    loading
                ) : (
                    <DonutChart
                        data={categories.map((c) => ({ name: c.name, value: c.orders }))}
                        format={(v) => `${v.toLocaleString("th-TH")} ออเดอร์`}
                        centerCaption="ออเดอร์ทั้งหมด"
                        emptyText="ยังไม่มีคำสั่งซื้อในช่วงนี้"
                    />
                )}
            </DonutCard>
        </div>
    );
}
