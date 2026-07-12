"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Dices, Loader2, Trophy, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DeltaBadge } from "@/components/admin/DeltaBadge";
import { DonutChart } from "@/components/admin/DonutChart";
import { formatBucketLabel } from "@/lib/features/dashboard/bucketLabels";

type RangeDays = 7 | 30 | 90;

interface GachaKpis {
    rollsToday: number;
    rollsYesterday: number;
    rolls7d: number;
    rollsPrev7d: number;
    rangeRolls: number;
    paidRolls: number;
    freeRolls: number;
    revenue: number;
    players: number;
    avgRollsPerPlayer: number;
}

interface DailyPoint {
    date: string;
    paid: number;
    free: number;
}

interface TopPlayer {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
    rolls: number;
    spent: number;
}

interface DistributionBucket {
    key: string;
    label: string;
    players: number;
}

interface GachaSummaryData {
    kpis: GachaKpis;
    daily: DailyPoint[];
    topPlayers: TopPlayer[];
    distribution: DistributionBucket[];
}

interface MachineTier {
    tier: string;
    actualPct: number;
    expectedPct: number | null;
    count: number;
}

interface MachineRow {
    machineId: string | null;
    name: string;
    isActive: boolean;
    isEnabled: boolean;
    rolls: number;
    revenue: number;
    payout: number;
    rtp: number | null;
    players: number;
    tiers: MachineTier[];
}

const RANGE_OPTIONS: RangeDays[] = [7, 30, 90];

const baht = (value: number) => `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;

function profitBadgeClass(profit: number, revenue: number): string {
    if (profit < 0) return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
    // Thin margin (payout ate 85%+ of revenue) — worth a closer look.
    if (revenue > 0 && profit <= revenue * 0.15) return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
}

function DailyTooltip({
    active,
    payload,
}: Readonly<{ active?: boolean; payload?: Array<{ payload: DailyPoint }> }>) {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    return (
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-xl" style={{ minWidth: 170 }}>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{formatBucketLabel(point.date, "day", true)}</p>
            <div className="space-y-1 text-xs">
                <p className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--chart-1)]" />
                        เสียเงิน
                    </span>
                    <span className="font-bold tabular-nums">{point.paid.toLocaleString("th-TH")} ตา</span>
                </p>
                <p className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--chart-4)]" />
                        ฟรี
                    </span>
                    <span className="font-bold tabular-nums">{point.free.toLocaleString("th-TH")} ตา</span>
                </p>
            </div>
        </div>
    );
}

export function GachaSummary() {
    const router = useRouter();
    const [days, setDays] = useState<RangeDays>(30);
    const [summaryCache, setSummaryCache] = useState<Partial<Record<RangeDays, GachaSummaryData>>>({});
    const [machinesCache, setMachinesCache] = useState<Partial<Record<RangeDays, MachineRow[]>>>({});
    const [selectedMachine, setSelectedMachine] = useState<string | null>(null);

    useEffect(() => {
        if (summaryCache[days]) return;
        let cancelled = false;
        fetch(`/api/admin/dashboard/gacha-summary?days=${days}`, { cache: "no-store" })
            .then((res) => res.json())
            .then((json) => {
                if (!cancelled && json?.success) {
                    setSummaryCache((prev) => ({
                        ...prev,
                        [days]: { kpis: json.kpis, daily: json.daily, topPlayers: json.topPlayers, distribution: json.distribution },
                    }));
                }
            })
            .catch((err) => console.error("Failed to fetch gacha summary:", err));
        return () => {
            cancelled = true;
        };
    }, [days, summaryCache]);

    useEffect(() => {
        if (machinesCache[days]) return;
        let cancelled = false;
        fetch(`/api/admin/dashboard/gacha-machines?days=${days}`, { cache: "no-store" })
            .then((res) => res.json())
            .then((json) => {
                if (!cancelled && json?.success) {
                    setMachinesCache((prev) => ({ ...prev, [days]: json.machines }));
                }
            })
            .catch((err) => console.error("Failed to fetch gacha machines:", err));
        return () => {
            cancelled = true;
        };
    }, [days, machinesCache]);

    const summary = summaryCache[days];
    const machines = machinesCache[days];

    if (!summary) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const { kpis } = summary;
    const maxBucket = Math.max(1, ...summary.distribution.map((bucket) => bucket.players));
    const machineList = machines ?? [];
    const tierMachine =
        machineList.find((m) => (m.machineId ?? "__default__") === selectedMachine) ?? machineList[0];

    const goToUser = (username: string) => router.push(`/admin/users?search=${encodeURIComponent(username)}`);

    const KPI_CARDS = [
        {
            label: "การสุ่มวันนี้",
            value: `${kpis.rollsToday.toLocaleString("th-TH")} ตา`,
            delta: { current: kpis.rollsToday, baseline: kpis.rollsYesterday, label: "เทียบเมื่อวาน" },
            sub: null as string | null,
        },
        {
            label: "การสุ่ม 7 วันล่าสุด",
            value: `${kpis.rolls7d.toLocaleString("th-TH")} ตา`,
            delta: { current: kpis.rolls7d, baseline: kpis.rollsPrev7d, label: "เทียบ 7 วันก่อน" },
            sub: null,
        },
        {
            label: `รายได้กาชา (${days} วัน)`,
            value: baht(kpis.revenue),
            delta: null,
            sub: `เสียเงิน ${kpis.paidRolls.toLocaleString("th-TH")} ตา · ฟรี ${kpis.freeRolls.toLocaleString("th-TH")} ตา`,
        },
        {
            label: `ผู้เล่น (${days} วัน)`,
            value: `${kpis.players.toLocaleString("th-TH")} คน`,
            delta: null,
            sub: `เฉลี่ย ${kpis.avgRollsPerPlayer.toLocaleString("th-TH", { maximumFractionDigits: 1 })} ตา/คน`,
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-foreground">สรุปกาชา</h3>
                <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                    {RANGE_OPTIONS.map((option) => (
                        <button
                            key={option}
                            onClick={() => setDays(option)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                                days === option
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {option} วัน
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {KPI_CARDS.map((kpi) => (
                    <Card key={kpi.label} className="border-border/50 hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                                <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                                {kpi.delta && (
                                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <DeltaBadge current={kpi.delta.current} baseline={kpi.delta.baseline} />
                                        {kpi.delta.label}
                                    </p>
                                )}
                                {kpi.sub && <p className="text-xs text-muted-foreground">{kpi.sub}</p>}
                            </div>
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 dark:bg-violet-500/20">
                                <Dices className="h-4.5 w-4.5 text-violet-700 dark:text-violet-400" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Daily rolls: paid vs free */}
            <Card className="border-border/50">
                <CardContent className="p-6">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-base font-semibold text-foreground">การสุ่มรายวัน</h4>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--chart-1)]" />
                                เสียเงิน
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--chart-4)]" />
                                ฟรี
                            </span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={summary.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.6} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(v: string) => formatBucketLabel(v, "day")}
                                stroke="var(--color-muted-foreground)"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                dy={8}
                                interval="preserveStartEnd"
                                minTickGap={24}
                            />
                            <YAxis
                                allowDecimals={false}
                                stroke="var(--color-muted-foreground)"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                width={40}
                            />
                            <Tooltip content={<DailyTooltip />} cursor={{ fill: "var(--color-muted)", fillOpacity: 0.4 }} />
                            <Bar dataKey="paid" stackId="rolls" fill="var(--chart-1)" maxBarSize={32} animationDuration={500} />
                            <Bar
                                dataKey="free"
                                stackId="rolls"
                                fill="var(--chart-4)"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={32}
                                animationDuration={500}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Roll-type + machine revenue donuts */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="border-border/50">
                    <CardContent className="p-6">
                        <h4 className="mb-1 text-base font-semibold text-foreground">สัดส่วนการสุ่ม: เสียเงิน vs ฟรี</h4>
                        <p className="mb-4 text-xs text-muted-foreground">ในช่วง {days} วันล่าสุด</p>
                        <DonutChart
                            data={[
                                { name: "เสียเงิน", value: kpis.paidRolls },
                                { name: "ฟรี", value: kpis.freeRolls },
                            ]}
                            format={(v) => `${v.toLocaleString("th-TH")} ตา`}
                            centerCaption="การสุ่มทั้งหมด"
                            emptyText="ยังไม่มีการสุ่มในช่วงนี้"
                        />
                    </CardContent>
                </Card>
                <Card className="border-border/50">
                    <CardContent className="p-6">
                        <h4 className="mb-1 text-base font-semibold text-foreground">สัดส่วนรายได้รายตู้</h4>
                        <p className="mb-4 text-xs text-muted-foreground">เฉพาะตู้ที่มีรายได้ในช่วง {days} วันล่าสุด</p>
                        {!machines ? (
                            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                กำลังโหลด…
                            </div>
                        ) : (
                            <DonutChart
                                data={[...machineList]
                                    .sort((a, b) => b.revenue - a.revenue)
                                    .map((machine) => ({ name: machine.name, value: machine.revenue }))}
                                format={baht}
                                centerCaption="รายได้รวม"
                                emptyText="ยังไม่มีรายได้ในช่วงนี้"
                            />
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Top players + distribution */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="border-border/50">
                    <CardContent className="p-6">
                        <div className="mb-4 flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-amber-500" />
                            <h4 className="text-base font-semibold text-foreground">สุ่มเยอะสุด {days} วัน</h4>
                        </div>
                        {summary.topPlayers.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีการสุ่มในช่วงนี้</p>
                        ) : (
                            <div className="space-y-1">
                                {summary.topPlayers.map((player, idx) => (
                                    <button
                                        key={player.id}
                                        type="button"
                                        onClick={() => goToUser(player.username)}
                                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50"
                                    >
                                        <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">{idx + 1}</span>
                                        <Avatar className="h-8 w-8 shrink-0">
                                            <AvatarImage src={player.image || undefined} alt={player.username} />
                                            <AvatarFallback className="bg-violet-500/15 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400 text-xs">
                                                {player.username.slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{player.username}</span>
                                        <div className="shrink-0 text-right">
                                            <p className="text-sm font-bold tabular-nums">{player.rolls.toLocaleString("th-TH")} ตา</p>
                                            <p className="text-xs text-muted-foreground tabular-nums">{baht(player.spent)}</p>
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
                            <Users className="h-4 w-4 text-sky-500" />
                            <h4 className="text-base font-semibold text-foreground">ผู้เล่นส่วนใหญ่สุ่มกี่ตา</h4>
                        </div>
                        <p className="mb-4 text-xs text-muted-foreground">จำนวนผู้เล่นแบ่งตามจำนวนตาที่สุ่มในช่วง {days} วัน</p>
                        <div className="space-y-3">
                            {summary.distribution.map((bucket) => (
                                <div key={bucket.key}>
                                    <div className="mb-1 flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{bucket.label}</span>
                                        <span className="font-semibold tabular-nums">{bucket.players.toLocaleString("th-TH")} คน</span>
                                    </div>
                                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-[var(--chart-1)]"
                                            style={{ width: `${(bucket.players / maxBucket) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Machines */}
            <Card className="border-border/50">
                <CardContent className="p-6">
                    <h4 className="mb-1 text-base font-semibold text-foreground">รายตู้</h4>
                    <p className="mb-4 text-xs text-muted-foreground">
                        กำไร = รายได้ − มูลค่ารางวัลที่จ่ายออก (โดยประมาณ — ใช้ราคาปัจจุบันกับการสุ่มก่อน 11 ก.ค. 69) · ติดลบ = ตู้จ่ายมากกว่าที่เก็บ
                    </p>
                    {!machines ? (
                        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            กำลังโหลด…
                        </div>
                    ) : machineList.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีการสุ่มในช่วงนี้</p>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-border/60">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border/60 bg-muted/40 text-left text-xs text-muted-foreground">
                                        <th className="px-3 py-2 font-medium">ตู้</th>
                                        <th className="px-3 py-2 text-right font-medium">สุ่ม</th>
                                        <th className="px-3 py-2 text-right font-medium">ผู้เล่น</th>
                                        <th className="px-3 py-2 text-right font-medium">รายได้</th>
                                        <th className="px-3 py-2 text-right font-medium">จ่ายออก</th>
                                        <th className="px-3 py-2 text-right font-medium">กำไร</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {machineList.map((machine) => (
                                        <tr key={machine.machineId ?? "__default__"} className="border-b border-border/40 last:border-0">
                                            <td className="px-3 py-2">
                                                <span className="font-medium">{machine.name}</span>
                                                {(!machine.isActive || !machine.isEnabled) && (
                                                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">ปิดอยู่</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums">{machine.rolls.toLocaleString("th-TH")}</td>
                                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                                                {machine.players.toLocaleString("th-TH")}
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium tabular-nums">{baht(machine.revenue)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{baht(machine.payout)}</td>
                                            <td className="px-3 py-2 text-right">
                                                {machine.rtp === null ? (
                                                    <span className="text-xs text-muted-foreground">ฟรีล้วน</span>
                                                ) : (
                                                    <span
                                                        className={`rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${profitBadgeClass(machine.revenue - machine.payout, machine.revenue)}`}
                                                    >
                                                        {machine.revenue - machine.payout < 0 ? "−" : ""}
                                                        {baht(Math.abs(machine.revenue - machine.payout))}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Tier: actual vs configured */}
                    {machineList.length > 0 && tierMachine && (
                        <div className="mt-5">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h5 className="text-sm font-semibold text-foreground">Tier ที่ออกจริง vs ที่ตั้งไว้</h5>
                                    <p className="text-xs text-muted-foreground">ถ้า tier หายากออกบ่อยกว่าที่ตั้งมาก แปลว่าตู้กำลังใจดีเกินตั้งใจ</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1">
                                    {machineList.map((machine) => {
                                        const key = machine.machineId ?? "__default__";
                                        const active = (tierMachine.machineId ?? "__default__") === (machine.machineId ?? "__default__");
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => setSelectedMachine(key)}
                                                className={`max-w-40 truncate px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                                                    active
                                                        ? "bg-primary text-primary-foreground shadow-sm"
                                                        : "text-muted-foreground hover:text-foreground"
                                                }`}
                                            >
                                                {machine.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="space-y-2">
                                {tierMachine.tiers.map((tier) => {
                                    const over = tier.expectedPct !== null && tier.actualPct > tier.expectedPct * 1.25 && tier.expectedPct < 50;
                                    const expectedCount =
                                        tier.expectedPct !== null ? (tier.expectedPct / 100) * tierMachine.rolls : null;
                                    return (
                                        <div key={tier.tier} className="flex items-center gap-3 text-sm">
                                            <span className="w-24 shrink-0 truncate font-medium capitalize">{tier.tier}</span>
                                            <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className={`h-full rounded-full ${over ? "bg-red-500/80" : "bg-[var(--chart-1)]"}`}
                                                    style={{ width: `${Math.min(100, tier.actualPct)}%` }}
                                                />
                                            </div>
                                            <span className={`w-44 shrink-0 text-right text-xs tabular-nums ${over ? "font-semibold text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                                                ออก {tier.count.toLocaleString("th-TH")} ครั้ง
                                                {expectedCount !== null
                                                    ? ` (คาดไว้ ~${expectedCount.toLocaleString("th-TH", { maximumFractionDigits: 1 })} ครั้ง)`
                                                    : ""}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
