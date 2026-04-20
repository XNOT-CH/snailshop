"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ElementType } from "react";
import {
    BadgeCheck,
    CircleAlert,
    Clock3,
    Coins,
    Gift,
    Lock,
    Sparkles,
    Ticket,
    Wallet,
    XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SeasonPassClaimButton } from "@/components/season-pass/SeasonPassClaimButton";
import { useCurrencySettings } from "@/hooks/useCurrencySettings";
import { getPointCurrencyName } from "@/lib/currencySettings";
import { themeClasses } from "@/lib/theme";
import type { SeasonPassBoardReward, SeasonPassRewardType } from "@/lib/seasonPass";

type SeasonPassHistoryEntry = {
    id: string;
    dayNumber: number;
    rewardLabel: string;
    rewardAmount: string;
    dateText: string;
};

type SeasonPassDashboardContentProps = {
    durationDays: number;
    price: number;
    currentDay: number;
    endAtText: string;
    packageWindowText: string;
    nextResetText: string;
    initialBoard: SeasonPassBoardReward[];
    initialHistory: SeasonPassHistoryEntry[];
    mockDate?: string | null;
};

const rewardConfig: Record<
    SeasonPassRewardType,
    { icon: ElementType; iconWrap: string; tileAccent: string }
> = {
    credits: {
        icon: Wallet,
        iconWrap: "bg-blue-50 text-blue-700 dark:bg-blue-500/18 dark:text-blue-100",
        tileAccent: "from-blue-50 to-white dark:from-blue-500/18 dark:to-slate-900/90",
    },
    points: {
        icon: Coins,
        iconWrap: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/18 dark:text-emerald-100",
        tileAccent: "from-emerald-50 to-white dark:from-emerald-500/18 dark:to-slate-900/90",
    },
    tickets: {
        icon: Ticket,
        iconWrap: "bg-sky-50 text-sky-700 dark:bg-sky-500/18 dark:text-sky-100",
        tileAccent: "from-sky-50 to-white dark:from-sky-500/18 dark:to-slate-900/90",
    },
};

const statusConfig = {
    claimed: {
        label: "รับแล้ว",
        card: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-400/35 dark:bg-emerald-500/10",
        badge: "bg-emerald-600 text-white dark:bg-emerald-500/90 dark:text-white",
        icon: BadgeCheck,
        iconClass: "text-emerald-600 dark:text-emerald-300",
    },
    missed: {
        label: "พลาดสิทธิ์",
        card: "border-rose-200 bg-rose-50/80 dark:border-rose-400/30 dark:bg-rose-500/10",
        badge: "bg-rose-600 text-white dark:bg-rose-500/90 dark:text-white",
        icon: XCircle,
        iconClass: "text-rose-500 dark:text-rose-300",
    },
    today: {
        label: "รับวันนี้",
        card: "border-blue-300 bg-blue-50/90 shadow-[0_16px_30px_-22px_rgba(37,99,235,0.55)] dark:border-sky-400/45 dark:bg-sky-500/10 dark:shadow-[0_18px_34px_-24px_rgba(56,189,248,0.28)]",
        badge: "bg-blue-600 text-white dark:bg-sky-500/90 dark:text-slate-950",
        icon: Gift,
        iconClass: "text-blue-600 dark:text-sky-300",
    },
    locked: {
        label: "รอวันถัดไป",
        card: "border-border/70 bg-white/70 dark:border-slate-700/80 dark:bg-slate-900/55",
        badge: "bg-slate-200 text-slate-600",
        icon: Lock,
        iconClass: "text-slate-400",
    },
} as const;

const rewardLegend = [
    { key: "credits", title: "เครดิต", detail: "เพิ่มเครดิตเข้าระบบทันทีเมื่อกดรับ" },
    { key: "points", title: "", detail: "" },
    { key: "tickets", title: "ตั๋วสุ่ม", detail: "ใช้เป็นรางวัลตั๋วสุ่มตามจำนวนที่กำหนด" },
] as const;

function RewardTile({ reward }: Readonly<{ reward: SeasonPassBoardReward }>) {
    const rewardInfo = rewardConfig[reward.type];
    const stateInfo = statusConfig[reward.status];
    const Icon = rewardInfo.icon;
    const StateIcon = stateInfo.icon;
    const rewardImage = reward.imageUrl;
    const isClaimed = reward.status === "claimed";
    const isLocked = reward.status === "locked";
    const tileAccentClass = isClaimed
        ? "from-slate-100 to-white dark:from-slate-700/70 dark:to-slate-900/90"
        : rewardInfo.tileAccent;
    const iconWrapClass = isClaimed
        ? "bg-slate-100 text-slate-500 dark:bg-slate-700/80 dark:text-slate-300"
        : rewardInfo.iconWrap;

    return (
        <div
            className={`relative min-h-36 rounded-[22px] border p-3 transition-transform duration-200 hover:-translate-y-0.5 ${stateInfo.card} ${
                reward.highlight ? "ring-1 ring-amber-200/80 dark:ring-amber-300/55" : ""
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <span className="rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-500 shadow-sm dark:bg-slate-800/95 dark:text-slate-300 dark:shadow-none">
                    Day {String(reward.day).padStart(2, "0")}
                </span>
                {reward.highlight ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800 dark:bg-amber-500/18 dark:text-amber-200">
                        Special
                    </span>
                ) : null}
            </div>

            <div className={`mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b ${tileAccentClass} shadow-sm dark:shadow-none`}>
                <div className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl ${iconWrapClass}`}>
                    {rewardImage ? (
                        <Image src={rewardImage} alt={reward.label} fill sizes="40px" className={`object-contain p-1.5 ${isClaimed ? "grayscale" : ""}`} />
                    ) : (
                        <Icon className="h-5 w-5" />
                    )}
                    {isClaimed ? (
                        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/95 shadow-sm dark:bg-slate-900 dark:shadow-none">
                            <BadgeCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-300" />
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="mt-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{reward.label}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">จำนวน {reward.amount}</p>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
                <span
                    data-season-pass-status={isLocked ? "locked" : undefined}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] ${stateInfo.badge}`}
                >
                    {stateInfo.label}
                </span>
                <StateIcon
                    data-season-pass-icon={isLocked ? "locked" : undefined}
                    className={`h-4 w-4 ${stateInfo.iconClass}`}
                />
            </div>
        </div>
    );
}

export function SeasonPassDashboardContent({
    durationDays,
    price,
    currentDay,
    endAtText,
    packageWindowText,
    nextResetText,
    initialBoard,
    initialHistory,
    mockDate,
}: Readonly<SeasonPassDashboardContentProps>) {
    const router = useRouter();
    const currencySettings = useCurrencySettings();
    const [board, setBoard] = useState(initialBoard);
    const [history, setHistory] = useState(initialHistory);
    const pointCurrencyName = getPointCurrencyName(currencySettings);

    const boardSummary = useMemo(() => {
        const claimedCount = board.filter((item) => item.status === "claimed").length;
        const missedCount = board.filter((item) => item.status === "missed").length;
        const remainingCount = Math.max(durationDays - claimedCount - missedCount, 0);
        const currentReward = board.find((item) => item.status === "today") ?? board.find((item) => item.day === currentDay) ?? board[0];

        return { claimedCount, missedCount, remainingCount, currentReward };
    }, [board, currentDay, durationDays]);

    const handleClaimSuccess = (payload: { dayNumber: number; rewardLabel: string; rewardAmount: string; claimedAtText: string }) => {
        setBoard((currentBoard) =>
            currentBoard.map((reward) => {
                if (reward.day === payload.dayNumber) {
                    return {
                        ...reward,
                        status: "claimed",
                        claimedAt: payload.claimedAtText,
                    };
                }

                return reward;
            }),
        );

        setHistory((currentHistory) => [
            {
                id: `local-${payload.dayNumber}`,
                dayNumber: payload.dayNumber,
                rewardLabel: payload.rewardLabel,
                rewardAmount: payload.rewardAmount,
                dateText: payload.claimedAtText,
            },
            ...currentHistory.filter((entry) => entry.dayNumber !== payload.dayNumber).slice(0, 4),
        ]);

        router.refresh();
    };

    const currentReward = boardSummary.currentReward;
    const CurrentIcon = rewardConfig[currentReward.type].icon;
    const canClaim = currentReward.status === "today";

    const summaryCards = [
        { label: "รับแล้ว", value: `${boardSummary.claimedCount} วัน`, hint: "ของสะสมเข้าคลังแล้ว" },
        { label: "พลาดสิทธิ์", value: `${boardSummary.missedCount} วัน`, hint: "ไม่ล็อกอินภายในวัน" },
        { label: "เหลืออีก", value: `${boardSummary.remainingCount} วัน`, hint: "ยังเปิดได้ในรอบนี้" },
        { label: "รีเซ็ตถัดไป", value: nextResetText, hint: "รีเซ็ตรายวันเวลา 00:00 น." },
    ];

    return (
        <>
            <section className={`${themeClasses.shell} relative overflow-hidden rounded-[30px] px-5 py-6 sm:px-7 sm:py-8`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(26,86,219,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))]" />
                <div className="relative space-y-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl space-y-4">
                            <Badge className="rounded-full border border-primary/20 bg-background px-3 py-1 text-xs font-medium text-primary shadow-sm">
                                Season Pass • {price.toLocaleString()} บาท • {durationDays} วัน
                            </Badge>
                            <div className="space-y-3">
                                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                                    ตารางรับของ 30 วัน ที่ปลดล็อกจริงสำหรับบัญชีนี้แล้ว
                                </h1>
                            </div>
                        </div>

                        <div className={`${themeClasses.surface} w-full max-w-xl rounded-[26px] p-4 backdrop-blur`}>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Progress</p>
                                    <p className="mt-2 text-lg font-semibold text-slate-900">
                                        Day {currentDay} of {durationDays}
                                    </p>
                                </div>
                                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                                    หมดอายุ {endAtText}
                                </Badge>
                            </div>
                            <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-[linear-gradient(90deg,#1a56db_0%,#60a5fa_100%)]" style={{ width: `${Math.min((currentDay / durationDays) * 100, 100)}%` }} />
                            </div>
                            <p className="mt-2 text-xs text-slate-500">Season Pass นี้จะหมดอายุในอีก {packageWindowText}</p>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {summaryCards.map((card) => (
                            <div key={card.label} className={`${themeClasses.surfaceSoft} rounded-2xl p-4 backdrop-blur`}>
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
                                <p className="mt-3 text-xl font-semibold text-slate-900">{card.value}</p>
                                <p className="mt-1 text-sm text-slate-500">{card.hint}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.55fr_0.8fr]">
                <section className={`${themeClasses.surface} rounded-[30px] p-4 sm:p-6`}>
                    <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-slate-900">
                                <Gift className="h-5 w-5 text-blue-600" />
                                <h2 className="text-2xl font-semibold tracking-tight">ตารางรับของรายวัน 30 วัน</h2>
                            </div>
                            <p className="max-w-2xl text-sm leading-6 text-slate-500">
                                ตารางนี้อัปเดตตามสถานะจริงของผู้ใช้ทันที วันไหนรับแล้วจะขึ้นเขียว วันไหนพลาดจะขึ้นแดง
                                และวันปัจจุบันจะปลดล็อกปุ่มรับของวันนี้
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs">
                            <Badge className="rounded-full bg-blue-600 px-3 py-1 text-white">วันนี้</Badge>
                            <Badge className="rounded-full bg-emerald-600 px-3 py-1 text-white">รับแล้ว</Badge>
                            <Badge className="rounded-full bg-rose-600 px-3 py-1 text-white">พลาดสิทธิ์</Badge>
                            <Badge variant="secondary" className="rounded-full px-3 py-1">Milestone</Badge>
                        </div>
                    </div>

                    <div className="mt-5 rounded-[28px] border border-[#eadfce] bg-[linear-gradient(180deg,#fffdfa_0%,#f9f6ef_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:border-slate-700/80 dark:bg-[linear-gradient(180deg,rgba(20,31,49,0.98)_0%,rgba(12,21,34,0.98)_100%)] dark:shadow-none sm:p-5">
                        <div className="mx-auto mb-5 flex w-fit items-center gap-3 rounded-full border border-[#e4d7c2] bg-white/90 px-4 py-2 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/90 dark:shadow-none">
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                            <p className="text-sm font-semibold tracking-[0.18em] text-slate-700 dark:text-slate-200">MONTHLY REWARD BOARD</p>
                            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                            {board.map((reward) => (
                                <RewardTile key={reward.day} reward={reward} />
                            ))}
                        </div>
                    </div>
                </section>

                <aside className="space-y-6">
                    <section className={`${themeClasses.surface} rounded-[30px] p-5 sm:p-6`}>
                        <div className="flex items-center gap-2 text-slate-900">
                            <Gift className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-semibold">ของวันนี้</h2>
                        </div>

                        <div className={`${themeClasses.surfaceSoft} mt-5 rounded-[26px] p-5`}>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.18em] text-blue-500">Today Reward</p>
                                    <p className="mt-2 text-2xl font-semibold text-slate-900">{currentReward.label}</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Day {String(currentReward.day).padStart(2, "0")} ของรอบนี้
                                    </p>
                                </div>
                                <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[22px] bg-white shadow-sm dark:bg-slate-900 dark:shadow-none">
                                    {currentReward.imageUrl ? (
                                        <Image src={currentReward.imageUrl} alt={currentReward.label} fill sizes="64px" className="object-contain p-2.5" />
                                    ) : (
                                        <CurrentIcon className="h-7 w-7 text-blue-600" />
                                    )}
                                </div>
                            </div>

                            <div className="mt-5 rounded-2xl border border-white/80 bg-white/90 p-4 dark:border-slate-700/80 dark:bg-slate-900/80">
                                <p className="text-xs text-slate-400 dark:text-slate-500">จำนวนที่ได้รับ</p>
                                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">{currentReward.amount}</p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">สถานะตอนนี้: {statusConfig[currentReward.status].label}</p>
                            </div>

                            <SeasonPassClaimButton
                                canClaim={canClaim}
                                rewardLabel={currentReward.label}
                                rewardAmount={currentReward.amount}
                                onClaimSuccess={handleClaimSuccess}
                                mockDate={mockDate}
                            />
                        </div>

                        <div className={`${themeClasses.alert} mt-4 rounded-2xl p-4`}>
                            <div className="flex items-start gap-3">
                                <CircleAlert className="mt-0.5 h-4 w-4 text-amber-700" />
                                <div className="space-y-2">
                                    <p className="text-sm font-semibold text-amber-900">กติกาที่ต้องเห็นชัด</p>
                                    <p className="text-sm leading-6 text-amber-900/85">
                                        ถ้าไม่ล็อกอินหรือไม่กดรับภายในวันนั้น สิทธิ์ของวันนั้นจะหายทันทีและไม่ย้อนรับย้อนหลัง
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className={`${themeClasses.surface} rounded-[30px] p-5 sm:p-6`}>
                        <div className="flex items-center gap-2 text-slate-900">
                            <Clock3 className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-semibold">ประวัติการรับล่าสุด</h2>
                        </div>

                        <div className="mt-5 space-y-3">
                            {history.length > 0 ? (
                                history.map((entry) => (
                                    <div key={entry.id} className="rounded-2xl border border-border/70 bg-background/80 p-4">
                                        <p className="font-medium text-slate-900">
                                            Day {String(entry.dayNumber).padStart(2, "0")} • {entry.rewardLabel}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">จำนวน {entry.rewardAmount}</p>
                                        <p className="mt-2 text-xs text-slate-400">{entry.dateText}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-4 text-sm text-slate-500">
                                    ยังไม่มีประวัติการรับของในรอบนี้
                                </div>
                            )}
                        </div>
                    </section>

                    <section className={`${themeClasses.surface} rounded-[30px] p-5 sm:p-6`}>
                        <div className="flex items-center gap-2 text-slate-900">
                            <Sparkles className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-semibold">ชนิดของรางวัล</h2>
                        </div>

                        <div className="mt-5 space-y-3">
                            {rewardLegend.map((item) => {
                                const config = rewardConfig[item.key];
                                const Icon = config.icon;
                                const title = item.key === "points" ? pointCurrencyName : item.title;
                                const detail = item.key === "points"
                                    ? `เพิ่มยอด ${pointCurrencyName} ของผู้ใช้ทันที`
                                    : item.detail;

                                return (
                                    <div key={item.key} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/80 p-4">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${config.iconWrap}`}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">{title}</p>
                                            <p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </aside>
            </div>
        </>
    );
}
