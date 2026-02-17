"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell,
    LabelList,
} from "recharts";
import {
    Sun,
    Clock,
    CalendarDays,
    Database,
    Loader2,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────
interface RecentMember {
    id: string;
    username: string;
    name: string | null;
    email: string | null;
    image: string | null;
    phone: string | null;
    creditBalance: number;
    createdAt: string;
}

interface MembersData {
    todayCount: number;
    weekCount: number;
    monthCount: number;
    totalCount: number;
    dailyTrend: { date: string; rawDate: string; count: number }[];
    recentMembers: RecentMember[];
}

// ─── Period options for area chart ──────────────────────
const PERIODS = [
    { label: "อาทิตย์", days: 7 },
    { label: "เดือน", days: 30 },
    { label: "3 เดือน", days: 90 },
] as const;

// ─── KPI Card config ────────────────────────────────────
const KPI_CARDS = [
    {
        key: "todayCount" as const,
        label: "วันนี้",
        icon: Sun,
        iconBg: "bg-violet-100 dark:bg-violet-900/40",
        iconColor: "text-violet-500 dark:text-violet-400",
    },
    {
        key: "weekCount" as const,
        label: "อาทิตย์นี้",
        icon: Clock,
        iconBg: "bg-violet-100 dark:bg-violet-900/40",
        iconColor: "text-violet-500 dark:text-violet-400",
    },
    {
        key: "monthCount" as const,
        label: "เดือนนี้",
        icon: CalendarDays,
        iconBg: "bg-violet-100 dark:bg-violet-900/40",
        iconColor: "text-violet-500 dark:text-violet-400",
    },
    {
        key: "totalCount" as const,
        label: "ทั้งหมด",
        icon: Database,
        iconBg: "bg-violet-100 dark:bg-violet-900/40",
        iconColor: "text-violet-500 dark:text-violet-400",
    },
];

// ─── Component ──────────────────────────────────────────
export function MembersSummary() {
    const [data, setData] = useState<MembersData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState(0); // index into PERIODS
    const [historyData, setHistoryData] = useState<{ date: string; count: number }[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Fetch KPI data
    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                const res = await fetch("/api/dashboard/members-summary");
                const json = await res.json();
                if (json.success) {
                    setData(json.data);
                }
            } catch (err) {
                console.error("Failed to fetch members summary:", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    // Fetch historical data based on selected period
    useEffect(() => {
        async function fetchHistory() {
            setHistoryLoading(true);
            try {
                const days = PERIODS[selectedPeriod].days;
                const res = await fetch(`/api/dashboard/members-summary?days=${days}`);
                const json = await res.json();
                if (json.success) {
                    setHistoryData(json.data.dailyTrend);
                }
            } catch (err) {
                console.error("Failed to fetch history:", err);
            } finally {
                setHistoryLoading(false);
            }
        }
        fetchHistory();
    }, [selectedPeriod]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-6">
            {/* Section title */}
            <h3 className="text-lg font-semibold text-foreground">
                สมาชิก
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                {/* ── Left: 4 KPI cards in 2×2 ─────────── */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-3">
                    {KPI_CARDS.map((kpi) => {
                        const Icon = kpi.icon;
                        const value = data[kpi.key];

                        return (
                            <Card
                                key={kpi.key}
                                className="border-border/50 hover:shadow-md transition-shadow"
                            >
                                <CardContent className="p-4 flex items-start justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            {kpi.label}
                                        </p>
                                        <p className="text-2xl font-bold tracking-tight">
                                            {value.toLocaleString()}{" "}
                                            <span className="text-sm font-normal text-muted-foreground">
                                                คน
                                            </span>
                                        </p>
                                    </div>
                                    <div
                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${kpi.iconBg}`}
                                    >
                                        <Icon className={`h-4.5 w-4.5 ${kpi.iconColor}`} />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* ── Right: 7-day bar chart ───────────── */}
                <Card className="lg:col-span-5 border-border/50">
                    <CardContent className="p-4">
                        {data.dailyTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart
                                    data={data.dailyTrend}
                                    margin={{ top: 20, right: 8, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="var(--border)"
                                        opacity={0.5}
                                    />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={30}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{
                                            background: "var(--popover)",
                                            border: "1px solid var(--border)",
                                            borderRadius: "8px",
                                            fontSize: "12px",
                                        }}
                                        formatter={(value: number) => [
                                            `${value} คน`,
                                            "สมาชิกใหม่",
                                        ]}
                                    />
                                    <Bar
                                        dataKey="count"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={40}
                                    >
                                        {data.dailyTrend.map((_, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill="#a78bfa"
                                                fillOpacity={0.7}
                                            />
                                        ))}
                                        <LabelList
                                            dataKey="count"
                                            position="top"
                                            style={{
                                                fontSize: "11px",
                                                fill: "var(--muted-foreground)",
                                                fontWeight: 500,
                                            }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                                ไม่มีข้อมูล
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ═══════════════════════════════════════════
                ข้อมูลย้อนหลัง — Historical Area Chart
               ═══════════════════════════════════════════ */}
            <Card className="border-border/50">
                <CardContent className="p-6">
                    {/* Title + period selector */}
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-base font-semibold text-foreground">
                            ข้อมูลย้อนหลัง
                        </h4>
                        <div className="flex gap-1.5">
                            {PERIODS.map((period, idx) => (
                                <Button
                                    key={period.label}
                                    variant={selectedPeriod === idx ? "default" : "outline"}
                                    size="sm"
                                    className="text-xs h-7 px-3"
                                    onClick={() => setSelectedPeriod(idx)}
                                >
                                    {period.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Purple divider */}
                    <div className="h-0.5 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full mb-4" />

                    {/* Area Chart */}
                    {historyLoading ? (
                        <div className="flex items-center justify-center h-[250px]">
                            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                        </div>
                    ) : historyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart
                                data={historyData}
                                margin={{ top: 20, right: 12, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="memberAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.5} />
                                        <stop offset="100%" stopColor="#7dd3fc" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="var(--border)"
                                    opacity={0.4}
                                />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={PERIODS[selectedPeriod].days <= 14 ? 0 : "preserveStartEnd"}
                                    angle={PERIODS[selectedPeriod].days > 14 ? -35 : 0}
                                    textAnchor={PERIODS[selectedPeriod].days > 14 ? "end" : "middle"}
                                    height={PERIODS[selectedPeriod].days > 14 ? 50 : 30}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={30}
                                />
                                <RechartsTooltip
                                    contentStyle={{
                                        background: "var(--popover)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "8px",
                                        fontSize: "12px",
                                    }}
                                    formatter={(value: number) => [
                                        `${value} คน`,
                                        "สมาชิกใหม่",
                                    ]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#38bdf8"
                                    strokeWidth={2}
                                    fill="url(#memberAreaGradient)"
                                    dot={{
                                        r: 4,
                                        fill: "#38bdf8",
                                        stroke: "#fff",
                                        strokeWidth: 2,
                                    }}
                                    activeDot={{
                                        r: 6,
                                        fill: "#38bdf8",
                                        stroke: "#fff",
                                        strokeWidth: 2,
                                    }}
                                >
                                    <LabelList
                                        dataKey="count"
                                        position="top"
                                        style={{
                                            fontSize: "11px",
                                            fill: "#38bdf8",
                                            fontWeight: 600,
                                        }}
                                    />
                                </Area>
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                            ไม่มีข้อมูล
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════
                ยอดการสมัครสมาชิกล่าสุด — Recent Members Table
               ═══════════════════════════════════════════ */}
            {data.recentMembers && data.recentMembers.length > 0 && (
                <Card className="border-border/50">
                    <CardContent className="p-6">
                        <div className="mb-4">
                            <h4 className="text-base font-semibold text-violet-600 dark:text-violet-400">
                                ยอดการสมัครสมาชิกล่าสุด
                            </h4>
                            <p className="text-xs text-muted-foreground">History</p>
                        </div>

                        {/* Purple divider */}
                        <div className="h-0.5 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full mb-4" />

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-muted-foreground border-b border-border/50">
                                        <th className="text-left py-3 px-2 font-medium">โปรไฟล์</th>
                                        <th className="text-left py-3 px-2 font-medium">ชื่อผู้ใช้</th>
                                        <th className="text-left py-3 px-2 font-medium">ชื่อเล่น</th>
                                        <th className="text-left py-3 px-2 font-medium">เบอร์</th>
                                        <th className="text-left py-3 px-2 font-medium">อี-เมล</th>
                                        <th className="text-right py-3 px-2 font-medium">คงเหลือ</th>
                                        <th className="text-right py-3 px-2 font-medium">วันที่</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.recentMembers.map((member) => {
                                        const regDate = new Date(member.createdAt);
                                        const dateStr = regDate.toLocaleDateString("th-TH", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                        });
                                        const timeStr = regDate.toLocaleTimeString("th-TH", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        });

                                        return (
                                            <tr
                                                key={member.id}
                                                className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                                            >
                                                <td className="py-3 px-2">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={member.image || undefined} alt={member.username} />
                                                        <AvatarFallback className="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400 text-xs">
                                                            {member.username.slice(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </td>
                                                <td className="py-3 px-2 font-medium">{member.username}</td>
                                                <td className="py-3 px-2 text-muted-foreground">{member.name || "-"}</td>
                                                <td className="py-3 px-2 text-muted-foreground">{member.phone || "-"}</td>
                                                <td className="py-3 px-2 text-muted-foreground">{member.email || "-"}</td>
                                                <td className="py-3 px-2 text-right font-medium">{member.creditBalance.toLocaleString()}</td>
                                                <td className="py-3 px-2 text-right text-muted-foreground whitespace-nowrap">
                                                    {timeStr} {dateStr}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
