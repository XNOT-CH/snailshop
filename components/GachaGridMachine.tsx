"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Gamepad2, Gift, Loader2, Sparkles } from "lucide-react";
import { ThumbImage } from "@/components/ThumbImage";
import { useCurrencySettings } from "@/hooks/useCurrencySettings";
import { requireAuthBeforePurchase } from "@/lib/require-auth-before-purchase";
import { showError } from "@/lib/swal";
import { EMPTY_USER_BALANCES, getBalanceByCostType, type UserBalances } from "@/lib/userBalances";
import { getGachaCostLabel, normalizeGachaCost } from "@/lib/gachaCost";
import { useRouter } from "next/navigation";
import { themeClasses } from "@/lib/theme";
import { STORAGE_KEYS } from "@/lib/constants/storageKeys";
import { fetchUserBalances } from "@/lib/client/userBalanceClient";
import {
    buildGachaGridRollPayload,
    fetchGachaGridRewards,
    getPaddedGridRewards,
    requestGachaGridRoll,
    type GridReward,
} from "@/lib/client/gachaGridClient";

const GachaResultModal = dynamic(
    () => import("@/components/GachaResultModal").then((mod) => mod.GachaResultModal),
    { ssr: false }
);

interface GachaGridMachineProps {
    readonly machineId?: string;
    readonly machineName?: string;
    readonly costType?: string;
    readonly costAmount?: number;
    readonly initialBalances?: UserBalances;
    readonly maintenance?: {
        enabled: boolean;
        message: string;
    };
}

const TIER_RING: Record<string, string> = {
    legendary: "ring-[3px] ring-red-500 shadow-[0_0_24px_rgba(239,68,68,0.75)]",
    epic: "ring-2 ring-violet-500/90 shadow-[0_0_18px_rgba(139,92,246,0.45)]",
    rare: "ring-2 ring-emerald-400/80 shadow-[0_0_14px_rgba(52,211,153,0.35)]",
    common: "ring-1 ring-amber-400/80 shadow-[0_0_10px_rgba(251,191,36,0.25)]",
};

const TIER_BG: Record<string, string> = {
    legendary: "bg-gradient-to-br from-red-500/30 via-orange-500/15 to-rose-900/35",
    epic: "bg-gradient-to-br from-violet-500/15 to-indigo-900/30",
    rare: "bg-gradient-to-br from-emerald-500/10 to-emerald-700/5",
    common: "bg-gradient-to-br from-amber-500/10 to-amber-700/5",
};

const TIER_DOT: Record<string, string> = {
    legendary: "bg-red-500",
    epic: "bg-violet-400",
    rare: "bg-emerald-400",
    common: "bg-amber-400",
};

const TIER_LABEL: Record<string, string> = {
    legendary: "ตำนาน",
    epic: "มหากาพย์",
    rare: "หายาก",
    common: "ธรรมดา",
};

function formatRewardLabel(reward: GridReward) {
    if (reward.rewardType !== "PRODUCT" && reward.rewardAmount) {
        return `${Number(reward.rewardAmount).toLocaleString()} ${reward.rewardName}`;
    }
    return reward.rewardName;
}

function RewardCard({
    reward,
    isHighlighted,
    isWinner,
    isSpinning,
}: Readonly<{
    reward: GridReward;
    isHighlighted: boolean;
    isWinner: boolean;
    isSpinning: boolean;
}>) {
    const [imgErr, setImgErr] = useState(false);
    const ring = TIER_RING[reward.tier] ?? TIER_RING.common;
    const bg = TIER_BG[reward.tier] ?? TIER_BG.common;
    const dot = TIER_DOT[reward.tier] ?? TIER_DOT.common;
    const hasValidImg = !imgErr && reward.imageUrl && (reward.imageUrl.startsWith("/") || reward.imageUrl.startsWith("http"));

    return (
        <div
            className={[
                `${themeClasses.surface} group relative overflow-hidden rounded-2xl p-2 transition-all duration-200 sm:p-3`,
                isHighlighted ? "border-[#1c9751]/40 bg-[#f4fff9] dark:border-emerald-400/40 dark:bg-emerald-500/10 -translate-y-0.5" : "",
                isWinner ? "border-[#145de7]/30 bg-[#f8fbff] dark:border-blue-400/30 dark:bg-blue-500/10" : "",
                isSpinning && !isHighlighted ? "opacity-35 scale-[0.97]" : "",
            ].join(" ")}
        >
            <div className="relative mx-auto flex aspect-square w-full items-center justify-center rounded-lg bg-gradient-to-b from-white to-slate-50">
                <div
                    className={[
                        "relative h-[94%] w-[94%] overflow-hidden rounded-xl transition-all duration-200",
                        ring,
                        isHighlighted && !isWinner ? "scale-105 brightness-110" : "",
                        isWinner ? "scale-105 brightness-110" : "",
                    ].join(" ")}
                >
                    {hasValidImg ? (
                        <div className="absolute inset-0 bg-background">
                            <ThumbImage
                                src={reward.imageUrl!}
                                alt={reward.rewardName}
                                fill
                                sizes="160px"
                                className="object-contain"
                                onFinalError={() => setImgErr(true)}
                            />
                        </div>
                    ) : (
                        <div className={`flex h-full w-full items-center justify-center ${bg}`}>
                            <span className={`h-3 w-3 rounded-full ${dot}`} />
                        </div>
                    )}

                    {isHighlighted && (
                        <div className="pointer-events-none absolute inset-0 rounded-xl border border-white/70 animate-ping opacity-70" />
                    )}
                </div>

                {isWinner && (
                    <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#145de7] px-2 py-1 text-[10px] font-black text-white shadow-sm">
                        <Sparkles className="h-3 w-3" />
                        WIN
                    </div>
                )}
            </div>

            <div className="mt-1.5 text-center sm:mt-2">
                <p className="line-clamp-2 min-h-[2.1rem] text-[11px] font-bold leading-[1.05rem] text-slate-900 dark:text-slate-100 sm:min-h-[2.5rem] sm:text-xs sm:leading-5">
                    {formatRewardLabel(reward)}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 sm:mt-1">
                    {TIER_LABEL[reward.tier] ?? TIER_LABEL.common}
                </p>
            </div>
        </div>
    );
}

function EmptyRewardSlot() {
    return (
        <div className={`${themeClasses.surfaceSoft} relative overflow-hidden rounded-2xl border-dashed p-3`}>
            <div className="flex aspect-square flex-col items-center justify-center rounded-lg bg-slate-50/70 text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white">
                    <Gift className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-[11px] font-semibold text-slate-500">ยังไม่เปิดรางวัล</p>
                <p className="mt-1 text-[10px] text-slate-400">เพิ่มรางวัลในแอดมินได้</p>
            </div>
        </div>
    );
}

function getSpinButtonLabel(isMaintenanceEnabled: boolean | undefined) {
    return isMaintenanceEnabled ? "ปิดปรับปรุงชั่วคราว" : "สุ่ม 1 ครั้ง";
}

function getStatusMessage(spinning: boolean, wonReward: GridReward | null) {
    if (wonReward) {
        return (
            <p className="text-sm font-semibold text-foreground">
                ได้รางวัล <span className="text-[#145de7]">{formatRewardLabel(wonReward)}</span>
            </p>
        );
    }

    if (spinning) {
        return <p className="text-xs text-muted-foreground">กำลังสุ่มและเตรียมเปิดผลลัพธ์</p>;
    }

    return <p className="text-xs text-muted-foreground" />;
}

export function GachaGridMachine({
    machineId,
    machineName = "ตู้สุ่ม",
    costType = "FREE",
    costAmount = 0,
    initialBalances = EMPTY_USER_BALANCES,
    maintenance,
}: Readonly<GachaGridMachineProps>) {
    const router = useRouter();
    const currencySettings = useCurrencySettings();
    const normalizedCost = useMemo(
        () => normalizeGachaCost(costType, costAmount),
        [costAmount, costType]
    );
    const [rewards, setRewards] = useState<Array<GridReward | null>>([]);
    const [loading, setLoading] = useState(true);
    const [spinning, setSpinning] = useState(false);
    const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
    const [wonIndex, setWonIndex] = useState<number | null>(null);
    const [wonReward, setWonReward] = useState<GridReward | null>(null);
    const [balances, setBalances] = useState(initialBalances);
    const [skipAnimationEnabled, setSkipAnimationEnabled] = useState(false);
    const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const pendingRevealRef = useRef<{ wonIdx: number; reward: GridReward } | null>(null);
    const skipRequestedRef = useRef(false);

    const queueTimeout = useCallback((callback: () => void, delay: number) => {
        const timeoutId = setTimeout(() => {
            timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
            callback();
        }, delay);
        timeoutIdsRef.current.push(timeoutId);
        return timeoutId;
    }, []);

    const clearQueuedTimeouts = useCallback(() => {
        for (const timeoutId of timeoutIdsRef.current) {
            clearTimeout(timeoutId);
        }
        timeoutIdsRef.current = [];
    }, []);

    const refreshBalances = useCallback(async () => {
        if (normalizedCost.costType === "FREE") return;
        try {
            const latestBalances = await fetchUserBalances();
            if (!latestBalances) return;
            setBalances(latestBalances);
        } catch {
            // Keep current values if refresh fails.
        }
    }, [normalizedCost.costType]);

    const revealWinImmediately = useCallback((wonIdx: number, reward: GridReward) => {
        clearQueuedTimeouts();
        pendingRevealRef.current = null;
        setHighlightIdx(wonIdx);
        setWonIndex(wonIdx);
        setWonReward(reward);
        setSpinning(false);
        refreshBalances().catch(() => undefined);
    }, [clearQueuedTimeouts, refreshBalances]);

    const fetchRewards = useCallback(async () => {
        setLoading(true);
        try {
            const json = await fetchGachaGridRewards(machineId);
            if (json.success) {
                setRewards(getPaddedGridRewards(json.data));
            }
        } catch {
            // Keep silent and render fallback state.
        } finally {
            setLoading(false);
        }
    }, [machineId]);

    useEffect(() => { fetchRewards().catch(() => undefined); }, [fetchRewards]);
    useEffect(() => { setBalances(initialBalances); }, [initialBalances]);
    useEffect(() => () => { clearQueuedTimeouts(); }, [clearQueuedTimeouts]);
    useEffect(() => {
        if (globalThis.window === undefined) return;
        const saved = globalThis.window.localStorage.getItem(STORAGE_KEYS.GACHA_SKIP_ANIMATION);
        setSkipAnimationEnabled(saved === "true");
    }, []);
    useEffect(() => {
        if (globalThis.window === undefined) return;
        globalThis.window.localStorage.setItem(STORAGE_KEYS.GACHA_SKIP_ANIMATION, String(skipAnimationEnabled));
    }, [skipAnimationEnabled]);

    const handleSpin = useCallback(async () => {
        const actualRewards = rewards.filter((reward): reward is GridReward => Boolean(reward));
        if (spinning || actualRewards.length === 0) return;

        const authCheck = await requireAuthBeforePurchase(router);
        if (!authCheck.allowed) {
            return;
        }

        clearQueuedTimeouts();
        skipRequestedRef.current = false;
        pendingRevealRef.current = null;
        setSpinning(true);
        setWonIndex(null);
        setWonReward(null);
        setHighlightIdx(null);

        try {
            const json = await requestGachaGridRoll(buildGachaGridRollPayload(machineId));

            if (!json.success || !json.data) {
                showError(json.message ?? "สุ่มไม่สำเร็จ");
                setSpinning(false);
                return;
            }

            const wonIdx = json.data.wonIndex;
            const wonRewardData: GridReward = {
                id: json.data.rewardId,
                tier: json.data.tier as GridReward["tier"],
                rewardType: json.data.rewardType,
                rewardName: json.data.rewardName,
                rewardAmount: json.data.rewardAmount,
                imageUrl: json.data.imageUrl,
            };

            pendingRevealRef.current = { wonIdx, reward: wonRewardData };

            if (skipAnimationEnabled || skipRequestedRef.current) {
                revealWinImmediately(wonIdx, wonRewardData);
                return;
            }

            const totalSteps = 20 + Math.floor(Math.random() * 8);
            let step = 0;
            const flash = () => {
                const isLast = step >= totalSteps - 1;
                const index = isLast ? wonIdx : step % rewards.length;
                setHighlightIdx(index);
                step += 1;

                if (isLast) {
                    queueTimeout(() => revealWinImmediately(wonIdx, wonRewardData), 550);
                    return;
                }

                let delay = 280;
                if (step < 5) delay = 60;
                else if (step < 12) delay = 100;
                else if (step < 18) delay = 180;

                queueTimeout(flash, delay);
            };

            queueTimeout(flash, 80);
        } catch {
            showError("เกิดข้อผิดพลาด กรุณาลองใหม่");
            pendingRevealRef.current = null;
            skipRequestedRef.current = false;
            setSpinning(false);
        }
    }, [clearQueuedTimeouts, machineId, queueTimeout, revealWinImmediately, rewards, router, skipAnimationEnabled, spinning]);

    const handleSkipAnimation = useCallback(() => {
        if (!spinning) return;
        skipRequestedRef.current = true;
        const pendingReveal = pendingRevealRef.current;
        if (pendingReveal) {
            revealWinImmediately(pendingReveal.wonIdx, pendingReveal.reward);
        }
    }, [revealWinImmediately, spinning]);

    const handleSkipToggle = useCallback((checked: boolean) => {
        setSkipAnimationEnabled(checked);
        if (checked && spinning) {
            handleSkipAnimation();
        }
    }, [handleSkipAnimation, spinning]);

    const handlePlayAgain = useCallback(() => {
        clearQueuedTimeouts();
        skipRequestedRef.current = false;
        pendingRevealRef.current = null;
        setHighlightIdx(null);
        setWonIndex(null);
        setWonReward(null);
    }, [clearQueuedTimeouts]);

    const currencyWord = getGachaCostLabel(normalizedCost.costType, currencySettings);
    const balance = getBalanceByCostType(balances, normalizedCost.costType);
    const isBlocked = Boolean(maintenance?.enabled);
    const actualRewards = rewards.filter((reward): reward is GridReward => Boolean(reward));

    return (
        <div className="flex w-full max-w-[640px] flex-col gap-0.5 sm:gap-1">
            <div className={`${themeClasses.surface} overflow-hidden rounded-3xl px-4 py-5 sm:px-6 sm:py-6`}>
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#145de7]/70">Lucky Board</p>
                        <h2 className="mt-1 text-2xl font-bold leading-none text-[#145de7]">{machineName}</h2>
                    </div>
                    <div className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-right text-[11px] font-semibold text-primary">
                        <p className="opacity-70">รางวัลพร้อมสุ่ม</p>
                        <p className="text-sm font-black">{actualRewards.length}/9</p>
                    </div>
                </div>

                {loading && (
                    <div className={`${themeClasses.surfaceSoft} flex h-56 items-center justify-center rounded-3xl`}>
                        <Loader2 className="h-10 w-10 animate-spin text-[#145de7]/60" />
                    </div>
                )}

                {!loading && actualRewards.length === 0 && (
                    <div className={`${themeClasses.surfaceSoft} flex h-56 flex-col items-center justify-center rounded-3xl border-dashed text-center`}>
                        <Gift className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                        <p className="mt-3 text-sm font-semibold text-slate-600">ยังไม่มีรางวัลในตู้</p>
                        <p className="mt-1 text-xs text-slate-400">เพิ่มรางวัลจากหน้าแอดมินก่อนเปิดให้สุ่ม</p>
                    </div>
                )}

                {!loading && actualRewards.length > 0 && (
                    <div className={`${themeClasses.surfaceSoft} rounded-3xl p-3 sm:p-4`}>
                        <div className="grid grid-cols-3 gap-2 sm:gap-4">
                            {rewards.map((reward, idx) => (
                                reward ? (
                                    <RewardCard
                                        key={reward.id}
                                        reward={reward}
                                        isHighlighted={highlightIdx === idx}
                                        isWinner={wonIndex === idx}
                                        isSpinning={spinning}
                                    />
                                ) : (
                                    <EmptyRewardSlot key={`empty-${idx}`} />
                                )
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {maintenance?.enabled && (
                <div className={`${themeClasses.alert} rounded-2xl px-4 py-3 text-center shadow-sm`}>
                    <p className="text-sm font-semibold text-amber-900">ระบบกาชากำลังปิดปรับปรุงชั่วคราว</p>
                    <p className="mt-1 text-xs text-amber-800/90">{maintenance.message}</p>
                </div>
            )}

            <div className={`${themeClasses.surface} -mt-2 rounded-3xl px-4 pb-4 pt-0 sm:-mt-3 sm:px-5 sm:pb-5 sm:pt-0`}>
                <div className="flex flex-col gap-3 sm:gap-5">
                    <div className="space-y-1 text-center">
                        <p className="text-xl font-bold tracking-tight text-[#145de7] sm:text-2xl">
                            สุ่มรางวัลครั้งละ {normalizedCost.costAmount.toLocaleString()} {currencyWord}
                        </p>
                        {normalizedCost.costType !== "FREE" && (
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">กดสุ่มแล้วไม่สามารถขอคืน{currencyWord}ได้</p>
                        )}
                    </div>

                    {normalizedCost.costType !== "FREE" && (
                        <div className="w-full rounded-2xl border border-[#b7d0ff] bg-[#cfe1ff]/75 px-4 py-3 text-center text-[#145de7] dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200">
                            <p className="text-sm font-bold">
                                ยอด{currencyWord}คงเหลือ: {balance.toLocaleString()} {currencyWord}
                            </p>
                        </div>
                    )}

                    <label className="flex w-fit cursor-pointer items-center gap-3 rounded-full border border-[#bfe5ce] bg-[#f8fffb] px-4 py-2 text-sm font-medium text-[#1c9751] dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <input
                            type="checkbox"
                            checked={skipAnimationEnabled}
                            onChange={(event) => handleSkipToggle(event.target.checked)}
                            className="h-4 w-4 rounded border-[#1c9751]/40 text-[#1c9751] focus:ring-[#1c9751]"
                        />
                        ข้ามอนิเมชั่นอัตโนมัติ
                    </label>

                    <div className="pt-1">
                        {spinning ? (
                            <button
                                disabled
                                className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-[#1c9751]/60 h-12 px-4 text-base font-bold text-white/85 sm:h-14"
                            >
                                <Loader2 className="h-5 w-5 animate-spin" />
                                กำลังสุ่ม...
                            </button>
                        ) : (
                            <button
                                onClick={() => { handleSpin().catch(() => undefined); }}
                                disabled={loading || isBlocked || actualRewards.length === 0}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1c9751] h-12 px-4 text-base font-bold text-white shadow-[0_14px_28px_-20px_rgba(15,23,42,0.28)] transition-all hover:bg-[#167c42] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 sm:h-14"
                            >
                                <Gamepad2 className="h-5 w-5" />
                                {getSpinButtonLabel(maintenance?.enabled)}
                            </button>
                        )}
                    </div>

                    <div className="min-h-[20px] text-center">
                            {getStatusMessage(spinning, wonReward)}
                    </div>
                </div>
            </div>

            {wonReward && !spinning && (
                <GachaResultModal
                    product={{
                        id: wonReward.id,
                        name: formatRewardLabel(wonReward),
                        price: wonReward.rewardAmount ?? 0,
                        imageUrl: wonReward.imageUrl,
                        tier: wonReward.tier,
                    }}
                    onClose={handlePlayAgain}
                    onSpinAgain={() => {
                        handlePlayAgain();
                        setTimeout(() => { handleSpin().catch(() => undefined); }, 100);
                    }}
                />
            )}
        </div>
    );
}
