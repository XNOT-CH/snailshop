"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface DistributionSlice {
    name: string;
    value: number;
}

// Stable palette assigned by slice order so any number of channels renders cleanly.
const SLICE_COLORS = ["#3b82f6", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b"];

export function SalesDistribution() {
    const [data, setData] = useState<DistributionSlice[] | null>(null);

    useEffect(() => {
        let cancelled = false;

        fetch("/api/admin/dashboard/sales-distribution", { cache: "no-store" })
            .then((response) => response.json())
            .then((json) => {
                if (cancelled) {
                    return;
                }
                setData(json?.success && Array.isArray(json.data) ? json.data : []);
            })
            .catch(() => {
                if (!cancelled) {
                    setData([]);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const total = (data ?? []).reduce((sum, item) => sum + item.value, 0);

    return (
        <div>
            <div className="mb-4">
                <h3 className="text-lg font-semibold">สัดส่วนการเติมเงิน</h3>
                <p className="text-sm text-muted-foreground">
                    แยกตามช่องทางการเติมเงิน
                </p>
            </div>

            {data === null ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังโหลดข้อมูล
                </div>
            ) : data.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    ยังไม่มีข้อมูลการเติมเงิน
                </div>
            ) : (
                <div className="flex flex-col items-center gap-6">
                    {/* Pie Chart */}
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={4}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${entry.name}`}
                                        fill={SLICE_COLORS[index % SLICE_COLORS.length]}
                                        className="transition-opacity hover:opacity-80"
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => [
                                    `฿${value.toLocaleString()}`,
                                    "ยอดเงิน",
                                ]}
                                contentStyle={{
                                    backgroundColor: "var(--color-card)",
                                    borderColor: "var(--color-border)",
                                    borderRadius: "12px",
                                    boxShadow:
                                        "0 10px 30px -5px rgba(0,0,0,0.15)",
                                    color: "var(--color-foreground)",
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-3 w-full">
                        {data.map((item, index) => (
                            <div
                                key={item.name}
                                className="flex items-center gap-2.5 text-sm"
                            >
                                <div
                                    className="h-3 w-3 rounded-full shrink-0"
                                    style={{ backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length] }}
                                />
                                <span className="text-muted-foreground truncate">
                                    {item.name}
                                </span>
                                <span className="ml-auto font-medium tabular-nums">
                                    {total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
