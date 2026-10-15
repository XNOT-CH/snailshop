"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ElementType, type ReactNode } from "react";
import {
    BadgeCheck,
    CircleAlert,
    Clock3,
    Coins,
    Gift,
    Loader2,
    Lock,
    Sparkles,
    Ticket,
    Wallet,
    XCircle,
} from "lucide-react";
import { SeasonPassClaimButton } from "@/components/season-pass/SeasonPassClaimButton";
import { useCurrencySettings } from "@/hooks/useCurrencySettings";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { getPointCurrencyName } from "@/lib/currencySettings";
import { showError, showSuccess, showWarning } from "@/lib/swal";
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
    /** Rendered beside the page title, e.g. the renew link. */
    headerAction?: ReactNode;
};

type ClaimSuccessPayload = {
    dayNumber: number;
    rewardLabel: string;
    rewardAmount: string;
    claimedAtText: string;
};

const rewardConfig: Record<SeasonPassRewardType, { icon: ElementType }> = {
    credits: { icon: Wallet },
    points: { icon: Coins },
    tickets: { icon: Ticket },
};

// Status colours stay meaningful (green claimed, red missed, blue today) but sit
// on the theme tokens so both modes read the same as the rest of the site.
const statusConfig = {
    claimed: {
        label: "รับแล้ว",
        card: "border-emerald-500/30 bg-emerald-500/5",
        badge: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
        icon: BadgeCheck,
        iconClass: "text-emerald-600 dark:text-emerald-300",
    },
    missed: {
        label: "พลาดสิทธิ์",
        card: "border-rose-500/30 bg-rose-500/5",
        badge: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
        icon: XCircle,
        iconClass: "text-rose-500 dark:text-rose-300",
    },
    today: {
        label: "รับวันนี้",
        card: "border-primary bg-primary/5",
        badge: "bg-primary text-primary-foreground",
        icon: Gift,
        iconClass: "text-primary",
    },
    locked: {
        label: "รอวันถัดไป",
        card: "border-border bg-card",
        badge: "bg-muted text-muted-foreground",
        icon: Lock,
        iconClass: "text-muted-foreground",
    },
} as const;

const rewardLegend = [
    { key: "credits", title: "เครดิต", detail: "เพิ่มเครดิตเข้าระบบทันทีเมื่อกดรับ" },
    { key: "points", title: "", detail: "" },
    { key: "tickets", title: "ตั๋วสุ่ม", detail: "ใช้เป็นรางวัลตั๋วสุ่มตามจำนวนที่กำหนด" },
] as const;

function RewardTile({
    reward,
    isClaiming = false,
    onClaim,
}: Readonly<{
    reward: SeasonPassBoardReward;
    isClaiming?: boolean;
    onClaim?: () => Promise<void> | void;
}>) {
    const Icon = rewardConfig[reward.type].icon;
    const stateInfo = statusConfig[reward.status];
    const StateIcon = isClaiming ? Loader2 : stateInfo.icon;
    const rewardImage = reward.imageUrl;
    const isClaimed = reward.status === "claimed";
    const isLocked = reward.status === "locked";
    const canClaim = reward.status === "today" && Boolean(onClaim);
    const tileClassName = `relative block w-full rounded-xl border p-3 text-left transition-colors duration-300 ease-out ${stateInfo.card} ${
        reward.highlight ? "ring-1 ring-amber-400/60" : ""
    } ${canClaim ? "cursor-pointer hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait" : ""}`;
    const content = (
        <>
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">วันที่ {reward.day}</span>
                {reward.highlight ? (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                        พิเศษ
                    </span>
                ) : null}
            </div>

            <div className="relative mt-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-muted/50 text-primary">
                {rewardImage ? (
                    <Image src={rewardImage} alt={reward.label} fill sizes="44px" className={`object-contain p-1.5 ${isClaimed ? "grayscale" : ""}`} />
                ) : (
                    <Icon className="h-5 w-5" />
                )}
            </div>

            <p className="mt-3 text-sm font-semibold text-foreground">{reward.label}</p>
            <p className="text-xs text-muted-foreground">จำนวน {reward.amount}</p>

            <div className="mt-3 flex items-center justify-between gap-2">
                <span
                    data-season-pass-status={isLocked ? "locked" : undefined}
                    className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${stateInfo.badge}`}
                >
                    {isClaiming ? "กำลังรับ" : stateInfo.label}
                </span>
                <StateIcon
                    data-season-pass-icon={isLocked ? "locked" : undefined}
                    className={`h-4 w-4 ${isClaiming ? "animate-spin text-primary" : stateInfo.iconClass}`}
                />
            </div>
        </>
    );

    if (canClaim) {
        return (
            <button
                type="button"
                className={tileClassName}
                onClick={() => void onClaim?.()}
                disabled={isClaiming}
                aria-busy={isClaiming}
                aria-label={`รับของวันที่ ${reward.day} ${reward.label} จำนวน ${reward.amount}`}
            >
                {content}
            </button>
        );
    }

    return (
        <div className={tileClassName}>
            {content}
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
    headerAction,
}: Readonly<SeasonPassDashboardContentProps>) {
    const router = useRouter();
    const currencySettings = useCurrencySettings();
    const [board, setBoard] = useState(initialBoard);
    const [history, setHistory] = useState(initialHistory);
    const [claimPending, setClaimPending] = useState(false);
    const pointCurrencyName = getPointCurrencyName(currencySettings);

    const boardSummary = useMemo(() => {
        const claimedCount = board.filter((item) => item.status === "claimed").length;
        const missedCount = board.filter((item) => item.status === "missed").length;
        const remainingCount = Math.max(durationDays - claimedCount - missedCount, 0);
        const currentReward = board.find((item) => item.status === "today") ?? board.find((item) => item.day === currentDay) ?? board[0];

        return { claimedCount, missedCount, remainingCount, currentReward };
    }, [board, currentDay, durationDays]);

    const handleClaimSuccess = (payload: ClaimSuccessPayload) => {
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

    const handleClaim = async () => {
        if (!canClaim || claimPending) {
            return;
        }

        setClaimPending(true);

        try {
            const endpoint = mockDate ? `/api/season-pass/claim?mockDate=${encodeURIComponent(mockDate)}` : "/api/season-pass/claim";
            const response = await fetchWithCsrf(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                showWarning(data.message || "ไม่สามารถรับของวันนี้ได้");
                return;
            }

            handleClaimSuccess({
                dayNumber: data.dayNumber,
                rewardLabel: data.rewardLabel ?? currentReward.label,
                rewardAmount: data.rewardAmount ?? currentReward.amount,
                claimedAtText: data.claimedAtText,
            });
            showSuccess("รับรางวัลสำเร็จ");
        } catch (error) {
            console.error("[SEASON_PASS_CLAIM]", error);
            showError("เกิดข้อผิดพลาดในการรับของวันนี้");
        } finally {
            setClaimPending(false);
        }
    };

    const summaryCards = [
        { label: "รับแล้ว", value: `${boardSummary.claimedCount} วัน`, hint: "ของสะสมเข้าคลังแล้ว" },
        { label: "พลาดสิทธิ์", value: `${boardSummary.missedCount} วัน`, hint: "ไม่ล็อกอินภายในวัน" },
        { label: "เหลืออีก", value: `${boardSummary.remainingCount} วัน`, hint: "ยังเปิดได้ในรอบนี้" },
        { label: "รีเซ็ตถัดไป", value: nextResetText, hint: "รีเซ็ตรายวันเวลา 00:00 น." },
    ];
    const cardClass = "rounded-2xl border border-border bg-card";

    return (
        <>
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold leading-tight text-[var(--page-heading)] sm:text-4xl">Season Pass</h1>
                    <p className="mt-2 text-muted-foreground">
                        {price.toLocaleString()} บาท · {durationDays} วัน · หมดอายุ {endAtText}
                    </p>
                </div>
                {headerAction}
            </div>

            <section className={`${cardClass} p-5 sm:p-6`}>
                <div className="flex flex-wrap items-end justify-between gap-2">
                    <p className="text-lg font-semibold text-foreground">
                        วันที่ {currentDay} จาก {durationDays}
                    </p>
                    <p className="text-sm text-muted-foreground">Season Pass นี้จะหมดอายุในอีก {packageWindowText}</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min((currentDay / durationDays) * 100, 100)}%` }} />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {summaryCards.map((card) => (
                        <div key={card.label} className="rounded-xl bg-muted/40 p-4">
                            <p className="text-sm text-muted-foreground">{card.label}</p>
                            <p className="mt-1 text-xl font-bold text-[var(--page-heading)]">{card.value}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
                        </div>
                    ))}
                </div>
            </section>

            <div className="grid items-start gap-6 xl:grid-cols-[1.55fr_0.8fr]">
                <section className={`${cardClass} p-5 sm:p-6`}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-[var(--page-heading)]">ตารางรับของรายวัน {durationDays} วัน</h2>
                            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                                ตารางนี้อัปเดตตามสถานะจริงของผู้ใช้ทันที วันไหนรับแล้วจะขึ้นเขียว วันไหนพลาดจะขึ้นแดง
                                และวันปัจจุบันจะปลดล็อกปุ่มรับของวันนี้
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-primary px-3 py-1 text-primary-foreground">วันนี้</span>
                            <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-emerald-700 dark:text-emerald-300">รับแล้ว</span>
                            <span className="rounded-full bg-rose-500/12 px-3 py-1 text-rose-700 dark:text-rose-300">พลาดสิทธิ์</span>
                            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-700 dark:text-amber-300">พิเศษ</span>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                        {board.map((reward) => (
                            <RewardTile
                                key={reward.day}
                                reward={reward}
                                isClaiming={claimPending && reward.status === "today"}
                                onClaim={reward.status === "today" ? handleClaim : undefined}
                            />
                        ))}
                    </div>
                </section>

                <aside className="space-y-6">
                    <section className={`${cardClass} p-5 sm:p-6`}>
                        <h2 className="text-xl font-bold text-[var(--page-heading)]">ของวันนี้</h2>

                        <div className="mt-4 flex items-center gap-4">
                            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/50 text-primary">
                                {currentReward.imageUrl ? (
                                    <Image src={currentReward.imageUrl} alt={currentReward.label} fill sizes="64px" className="object-contain p-2.5" />
                                ) : (
                                    <CurrentIcon className="h-7 w-7" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-2xl font-bold text-foreground">{currentReward.label}</p>
                                <p className="text-sm text-muted-foreground">วันที่ {currentReward.day} ของรอบนี้</p>
                            </div>
                        </div>

                        <div className="mt-4 rounded-xl bg-muted/40 p-4">
                            <p className="text-xs text-muted-foreground">จำนวนที่ได้รับ</p>
                            <p className="mt-1 text-xl font-bold text-[var(--page-heading)]">{currentReward.amount}</p>
                            <p className="mt-1 text-sm text-muted-foreground">สถานะตอนนี้: {statusConfig[currentReward.status].label}</p>
                        </div>

                        <SeasonPassClaimButton
                            canClaim={canClaim}
                            isLoading={claimPending}
                            onClaim={handleClaim}
                        />

                        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">กติกาที่ต้องเห็นชัด</p>
                                <p className="text-sm leading-6 text-amber-900/85 dark:text-amber-100/85">
                                    ถ้าไม่ล็อกอินหรือไม่กดรับภายในวันนั้น สิทธิ์ของวันนั้นจะหายทันทีและไม่ย้อนรับย้อนหลัง
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className={`${cardClass} p-5 sm:p-6`}>
                        <div className="flex items-center gap-2">
                            <Clock3 className="h-5 w-5 text-primary" />
                            <h2 className="text-xl font-bold text-[var(--page-heading)]">ประวัติการรับล่าสุด</h2>
                        </div>

                        <div className="mt-4 space-y-2">
                            {history.length > 0 ? (
                                history.map((entry) => (
                                    <div key={entry.id} className="rounded-xl bg-muted/40 p-3.5">
                                        <p className="font-medium text-foreground">
                                            วันที่ {entry.dayNumber} · {entry.rewardLabel}
                                        </p>
                                        <p className="mt-0.5 text-sm text-muted-foreground">จำนวน {entry.rewardAmount}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">{entry.dateText}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                                    ยังไม่มีประวัติการรับของในรอบนี้
                                </div>
                            )}
                        </div>
                    </section>

                    <section className={`${cardClass} p-5 sm:p-6`}>
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            <h2 className="text-xl font-bold text-[var(--page-heading)]">ชนิดของรางวัล</h2>
                        </div>

                        <div className="mt-4 space-y-2">
                            {rewardLegend.map((item) => {
                                const Icon = rewardConfig[item.key].icon;
                                const title = item.key === "points" ? pointCurrencyName : item.title;
                                const detail = item.key === "points"
                                    ? `เพิ่มยอด ${pointCurrencyName} ของผู้ใช้ทันที`
                                    : item.detail;

                                return (
                                    <div key={item.key} className="flex items-start gap-3 rounded-xl bg-muted/40 p-3.5">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">{title}</p>
                                            <p className="mt-0.5 text-sm leading-6 text-muted-foreground">{detail}</p>
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
