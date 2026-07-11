"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DeltaBadge } from "@/components/admin/DeltaBadge";
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
} from "recharts";
import {
    Sun,
    Clock,
    CalendarDays,
    Database,
    Loader2,
    UserCheck,
    ShoppingBag,
    Wallet,
    Trophy,
    UserX,
    ArrowRight,
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

interface TrendPoint {
    date: string;
    rawDate: string;
    count: number;
}

interface MembersData {
    todayCount: number;
    weekCount: number;
    monthCount: number;
    totalCount: number;
    previous?: {
        todayCount: number;
        weekCount: number;
        monthCount: number;
    };
    dailyTrend: TrendPoint[];
    recentMembers: RecentMember[];
}

interface SpenderRow {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
    creditBalance: number;
    totalSpent: number;
    orderCount: number;
}

interface AtRiskRow {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
    creditBalance: number;
    lastLoginAt: string | null;
}

interface InsightsData {
    activeToday: number;
    active7d: number;
    totalMembers: number;
    buyers: number;
    creditHolders: number;
    creditOutstanding: number;
    topSpenders: SpenderRow[];
    atRisk: { count: number; credit: number; users: AtRiskRow[] };
    newVsReturning: { newRevenue: number; returningRevenue: number };
}

type SpenderRange = "30d" | "all";

const baht = (value: number) => `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;

const TREND_PERIODS = [
    { label: "7 วัน", days: 7 },
    { label: "30 วัน", days: 30 },
    { label: "90 วัน", days: 90 },
] as const;

// ─── Signup KPI cards ───────────────────────────────────
const KPI_CARDS = [
    { key: "todayCount" as const, label: "วันนี้", compare: "เทียบเมื่อวาน", icon: Sun },
    { key: "weekCount" as const, label: "7 วันล่าสุด", compare: "เทียบ 7 วันก่อน", icon: Clock },
    { key: "monthCount" as const, label: "เดือนนี้", compare: "เทียบช่วงเดียวกันเดือนก่อน", icon: CalendarDays },
    { key: "totalCount" as const, label: "ทั้งหมด", compare: null, icon: Database },
];

function daysAgoLabel(iso: string | null): string {
    if (!iso) return "ไม่เคยเข้าสู่ระบบ";
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
    return days < 1 ? "วันนี้" : `หายไป ${days.toLocaleString("th-TH")} วัน`;
}

function MemberCell({ username, name, image }: Readonly<{ username: string; name: string | null; image: string | null }>) {
    return (
        <div className="flex min-w-0 items-center gap-2.5">
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={image || undefined} alt={username} />
                <AvatarFallback className="bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400 text-xs">
                    {username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
                <p className="truncate text-sm font-medium">{username}</p>
                {name && <p className="truncate text-xs text-muted-foreground">{name}</p>}
            </div>
        </div>
    );
}

// ─── Component ──────────────────────────────────────────
export function MembersSummary() {
    const router = useRouter();
    const [data, setData] = useState<MembersData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [trendDays, setTrendDays] = useState<number>(7);
    const [trendCache, setTrendCache] = useState<Record<number, TrendPoint[]>>({});
    const [trendFailed, setTrendFailed] = useState(false);

    const [spenderRange, setSpenderRange] = useState<SpenderRange>("30d");
    const [insightsCache, setInsightsCache] = useState<Partial<Record<SpenderRange, InsightsData>>>({});

    // Signup KPIs + recent members (also seeds the 7-day trend)
    useEffect(() => {
        let cancelled = false;
        fetch("/api/dashboard/members-summary", { cache: "no-store" })
            .then((res) => res.json())
            .then((json) => {
                if (cancelled || !json?.success) return;
                setData(json.data);
                setTrendCache((prev) => ({ ...prev, 7: json.data.dailyTrend }));
            })
            .catch((err) => console.error("Failed to fetch members summary:", err))
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // Trend for the selected window (cached per window, so switching back to
    // 7 วัน restores the right data instead of showing the last fetch)
    useEffect(() => {
        if (trendCache[trendDays]) return;

        let cancelled = false;
        fetch(`/api/dashboard/members-summary?days=${trendDays}`, { cache: "no-store" })
            .then((res) => res.json())
            .then((json) => {
                if (!cancelled && json?.success) {
                    setTrendCache((prev) => ({ ...prev, [trendDays]: json.data.dailyTrend }));
                } else if (!cancelled) {
                    setTrendFailed(true);
                }
            })
            .catch((err) => {
                console.error("Failed to fetch history:", err);
                if (!cancelled) setTrendFailed(true);
            });
        return () => {
            cancelled = true;
        };
    }, [trendDays, trendCache]);

    // Behaviour insights (active users, spenders, at-risk, new vs returning)
    useEffect(() => {
        if (insightsCache[spenderRange]) return;

        let cancelled = false;
        fetch(`/api/admin/dashboard/member-insights?spenders=${spenderRange}`, { cache: "no-store" })
            .then((res) => res.json())
            .then((json) => {
                if (!cancelled && json?.success) {
                    setInsightsCache((prev) => ({ ...prev, [spenderRange]: json }));
                }
            })
            .catch((err) => console.error("Failed to fetch member insights:", err));
        return () => {
            cancelled = true;
        };
    }, [spenderRange, insightsCache]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            </div>
        );
    }

    if (!data) return null;

    const insights = insightsCache[spenderRange] ?? insightsCache[spenderRange === "30d" ? "all" : "30d"];
    const trend = trendCache[trendDays] ?? [];
    const trendLoading = !trendCache[trendDays] && !trendFailed;
    const buyerRate = insights && insights.totalMembers > 0 ? Math.round((insights.buyers / insights.totalMembers) * 100) : 0;
    const revenueSplit = insights ? insights.newVsReturning.newRevenue + insights.newVsReturning.returningRevenue : 0;
    const newPct = revenueSplit > 0 && insights ? (insights.newVsReturning.newRevenue / revenueSplit) * 100 : 0;

    const goToUser = (username: string) => router.push(`/admin/users?search=${encodeURIComponent(username)}`);

    const INSIGHT_CARDS = insights
        ? [
              { label: "ใช้งานวันนี้", value: insights.activeToday.toLocaleString("th-TH"), sub: "จากการเข้าสู่ระบบล่าสุด", icon: UserCheck },
              { label: "ใช้งานใน 7 วัน", value: insights.active7d.toLocaleString("th-TH"), sub: null, icon: Clock },
              { label: "ลูกค้าที่เคยซื้อ", value: insights.buyers.toLocaleString("th-TH"), sub: `${buyerRate}% ของสมาชิกทั้งหมด`, icon: ShoppingBag },
              {
                  label: "เครดิตค้างในมือสมาชิก",
                  value: baht(insights.creditOutstanding),
                  sub: `${insights.creditHolders.toLocaleString("th-TH")} คน`,
                  icon: Wallet,
              },
          ]
        : null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-foreground">สมาชิก</h3>
                <Button asChild variant="outline" size="sm" className="h-8 gap-1">
                    <Link href="/admin/users">
                        ดูสมาชิกทั้งหมด
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            </div>

            {/* ── Signup KPIs with vs-previous deltas ── */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {KPI_CARDS.map((kpi) => {
                    const Icon = kpi.icon;
                    const previous = kpi.key !== "totalCount" ? data.previous?.[kpi.key] : undefined;
                    return (
                        <Card key={kpi.key} className="border-border/50 hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex items-start justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">สมัครใหม่ · {kpi.label}</p>
                                    <p className="text-2xl font-bold tracking-tight">
                                        {data[kpi.key].toLocaleString("th-TH")}{" "}
                                        <span className="text-sm font-normal text-muted-foreground">คน</span>
                                    </p>
                                    {kpi.compare && previous !== undefined && (
                                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <DeltaBadge current={data[kpi.key]} baseline={previous} />
                                            {kpi.compare}
                                        </p>
                                    )}
                                </div>
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 dark:bg-sky-500/20">
                                    <Icon className="h-4.5 w-4.5 text-sky-700 dark:text-sky-400" />
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* ── Behaviour KPIs ── */}
            {INSIGHT_CARDS && (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {INSIGHT_CARDS.map((kpi) => {
                        const Icon = kpi.icon;
                        return (
                            <Card key={kpi.label} className="border-border/50 hover:shadow-md transition-shadow">
                                <CardContent className="p-4 flex items-start justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                                        <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                                        {kpi.sub && <p className="text-xs text-muted-foreground">{kpi.sub}</p>}
                                    </div>
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 dark:bg-violet-500/20">
                                        <Icon className="h-4.5 w-4.5 text-violet-700 dark:text-violet-400" />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ── New-signup trend (single chart, 7/30/90) ── */}
            <Card className="border-border/50">
                <CardContent className="p-6">
                    <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-base font-semibold text-foreground">สมาชิกใหม่รายวัน</h4>
                        <div className="flex gap-1.5">
                            {TREND_PERIODS.map((period) => (
                                <Button
                                    key={period.days}
                                    variant={trendDays === period.days ? "default" : "outline"}
                                    size="sm"
                                    className="text-xs h-7 px-3"
                                    onClick={() => setTrendDays(period.days)}
                                >
                                    {period.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-4 h-0.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-500" />

                    {trendLoading && (
                        <div className="flex h-[240px] items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                        </div>
                    )}
                    {!trendLoading && trend.length === 0 && (
                        <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">ไม่มีข้อมูล</div>
                    )}
                    {!trendLoading && trend.length > 0 && (
                        <ResponsiveContainer width="100%" height={240}>
                            {trendDays <= 7 ? (
                                <BarChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
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
                                        formatter={(value: number) => [`${value} คน`, "สมาชิกใหม่"]}
                                    />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40} fill="var(--chart-bar-fill)" fillOpacity={0.85} />
                                </BarChart>
                            ) : (
                                <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="memberAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--chart-area-gradient-from)" stopOpacity={0.5} />
                                            <stop offset="100%" stopColor="var(--chart-area-gradient-from)" stopOpacity={0.05} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                        axisLine={false}
                                        tickLine={false}
                                        interval="preserveStartEnd"
                                        minTickGap={24}
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
                                        formatter={(value: number) => [`${value} คน`, "สมาชิกใหม่"]}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="var(--chart-area-stroke)"
                                        strokeWidth={2.5}
                                        fill="url(#memberAreaGradient)"
                                        dot={false}
                                        activeDot={{ r: 5, fill: "var(--chart-dot-fill)", stroke: "var(--card)", strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* ── Top spenders + at-risk customers ── */}
            {insights && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card className="border-border/50">
                        <CardContent className="p-6">
                            <div className="mb-4 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Trophy className="h-4 w-4 text-amber-500" />
                                    <h4 className="text-base font-semibold text-foreground">ลูกค้าที่ใช้จ่ายสูงสุด</h4>
                                </div>
                                <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                                    {(["30d", "all"] as const).map((range) => (
                                        <button
                                            key={range}
                                            onClick={() => setSpenderRange(range)}
                                            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                                                spenderRange === range
                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            {range === "30d" ? "30 วัน" : "ทั้งหมด"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {insights.topSpenders.length === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีคำสั่งซื้อในช่วงนี้</p>
                            ) : (
                                <div className="space-y-1">
                                    {insights.topSpenders.map((spender, idx) => (
                                        <button
                                            key={spender.id}
                                            type="button"
                                            onClick={() => goToUser(spender.username)}
                                            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50"
                                        >
                                            <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">{idx + 1}</span>
                                            <div className="min-w-0 flex-1">
                                                <MemberCell username={spender.username} name={spender.name} image={spender.image} />
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-sm font-bold tabular-nums">{baht(spender.totalSpent)}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {spender.orderCount.toLocaleString("th-TH")} ออเดอร์
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-border/50">
                        <CardContent className="p-6">
                            <div className="mb-1 flex items-center gap-2">
                                <UserX className="h-4 w-4 text-rose-500" />
                                <h4 className="text-base font-semibold text-foreground">ลูกค้าเสี่ยงหาย</h4>
                            </div>
                            <p className="mb-4 text-xs text-muted-foreground">
                                มีเครดิตค้างแต่ไม่เข้าสู่ระบบเกิน 30 วัน — รวม {insights.atRisk.count.toLocaleString("th-TH")} คน ·{" "}
                                <span className="font-semibold text-foreground">{baht(insights.atRisk.credit)}</span>
                            </p>

                            {insights.atRisk.users.length === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">ไม่มีลูกค้าเสี่ยงหาย 🎉</p>
                            ) : (
                                <div className="space-y-1">
                                    {insights.atRisk.users.map((member) => (
                                        <button
                                            key={member.id}
                                            type="button"
                                            onClick={() => goToUser(member.username)}
                                            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <MemberCell username={member.username} name={member.name} image={member.image} />
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-sm font-bold tabular-nums">{baht(member.creditBalance)}</p>
                                                <p className="text-xs text-muted-foreground">{daysAgoLabel(member.lastLoginAt)}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ── Revenue: new vs returning members (last 30 days) ── */}
            {insights && revenueSplit > 0 && (
                <Card className="border-border/50">
                    <CardContent className="p-6">
                        <h4 className="mb-1 text-base font-semibold text-foreground">รายได้ 30 วันล่าสุด: สมาชิกใหม่ vs สมาชิกเก่า</h4>
                        <p className="mb-4 text-xs text-muted-foreground">สมาชิกใหม่ = สมัครภายใน 30 วันที่ผ่านมา</p>

                        <div className="mb-3 flex h-3 w-full overflow-hidden rounded-full bg-muted">
                            <div className="bg-[var(--chart-1)]" style={{ width: `${newPct}%` }} />
                            <div className="bg-[var(--chart-4)]" style={{ width: `${100 - newPct}%` }} />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                            <span className="flex items-center gap-1.5">
                                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--chart-1)]" />
                                สมาชิกใหม่{" "}
                                <span className="font-bold tabular-nums">{baht(insights.newVsReturning.newRevenue)}</span>
                                <span className="text-xs text-muted-foreground">
                                    ({newPct.toLocaleString("th-TH", { maximumFractionDigits: 1 })}%)
                                </span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--chart-4)]" />
                                สมาชิกเก่า{" "}
                                <span className="font-bold tabular-nums">{baht(insights.newVsReturning.returningRevenue)}</span>
                                <span className="text-xs text-muted-foreground">
                                    ({(100 - newPct).toLocaleString("th-TH", { maximumFractionDigits: 1 })}%)
                                </span>
                            </span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Recent members ── */}
            {data.recentMembers && data.recentMembers.length > 0 && (
                <Card className="border-border/50">
                    <CardContent className="p-6">
                        <h4 className="mb-4 text-base font-semibold text-foreground">สมาชิกสมัครใหม่ล่าสุด</h4>

                        <div className="mb-4 h-0.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-500" />

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border/50 text-xs text-muted-foreground">
                                        <th className="px-2 py-3 text-left font-medium">สมาชิก</th>
                                        <th className="px-2 py-3 text-left font-medium">เบอร์</th>
                                        <th className="px-2 py-3 text-left font-medium">อีเมล</th>
                                        <th className="px-2 py-3 text-right font-medium">เครดิตคงเหลือ</th>
                                        <th className="px-2 py-3 text-right font-medium">สมัครเมื่อ</th>
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
                                                onClick={() => goToUser(member.username)}
                                                className="cursor-pointer border-b border-border/30 transition-colors hover:bg-muted/30"
                                            >
                                                <td className="px-2 py-3">
                                                    <MemberCell username={member.username} name={member.name} image={member.image} />
                                                </td>
                                                <td className="px-2 py-3 text-muted-foreground">{member.phone || "-"}</td>
                                                <td className="px-2 py-3 text-muted-foreground">{member.email || "-"}</td>
                                                <td className="px-2 py-3 text-right font-medium tabular-nums">{baht(member.creditBalance)}</td>
                                                <td className="whitespace-nowrap px-2 py-3 text-right text-muted-foreground">
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
