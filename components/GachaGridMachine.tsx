"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle2, Gamepad2, Gift, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { GachaResultModal } from "@/components/GachaResultModal";
import { showError } from "@/lib/swal";
import { shouldBypassImageOptimization } from "@/lib/imageUrl";
import { EMPTY_USER_BALANCES, getBalanceByCostType, type UserBalances } from "@/lib/userBalances";

interface GridReward {
    id: string;
    tier: "common" | "rare" | "epic" | "legendary";
    rewardType: string;
    rewardName: string;
    rewardAmount: number | null;
    imageUrl: string | null;
}

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

function getCurrencyWord(costType: string) {
    if (costType === "CREDIT") return "เครดิต";
    if (costType === "POINT") return "พอยต์";
    if (costType === "TICKET") return "ตั๋วสุ่ม";
    return "สิทธิ์";
}

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
                "group relative overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white p-3 shadow-[0_14px_28px_-22px_rgba(15,23,42,0.45)] transition-all duration-200",
                isHighlighted ? "border-[#1ca36b]/40 bg-[#f4fff9] -translate-y-0.5" : "",
                isWinner ? "border-[#145de7]/30 bg-[#f8fbff]" : "",
                isSpinning && !isHighlighted ? "opacity-35 scale-[0.97]" : "",
            ].join(" ")}
        >
            <div className="relative mx-auto flex aspect-square w-full items-center justify-center rounded-[1rem] bg-gradient-to-b from-white to-slate-50">
                <div
                    className={[
                        "relative h-[84%] w-[84%] overflow-hidden rounded-full transition-all duration-200",
                        ring,
                        isHighlighted && !isWinner ? "scale-110 brightness-110" : "",
                        isWinner ? "scale-110 brightness-110" : "",
                    ].join(" ")}
                >
                    {hasValidImg ? (
                        <div className="absolute inset-0 bg-zinc-950">
                            <Image
                                src={reward.imageUrl!}
                                alt={reward.rewardName}
                                fill
                                sizes="160px"
                                className="object-contain"
                                unoptimized={shouldBypassImageOptimization(reward.imageUrl)}
                                onError={() => setImgErr(true)}
                            />
                        </div>
                    ) : (
                        <div className={`flex h-full w-full items-center justify-center ${bg}`}>
                            <span className={`h-3 w-3 rounded-full ${dot}`} />
                        </div>
                    )}

                    {isHighlighted && (
                        <div className="pointer-events-none absolute inset-0 rounded-full border border-white/70 animate-ping opacity-70" />
                    )}
                </div>

                {isWinner && (
                    <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#145de7] px-2 py-1 text-[10px] font-black text-white shadow-sm">
                        <Sparkles className="h-3 w-3" />
                        WIN
                    </div>
                )}
            </div>

            <div className="mt-2 text-center">
                <p className="line-clamp-2 min-h-[2.5rem] text-[12px] font-bold leading-5 text-slate-900">
                    {formatRewardLabel(reward)}
                </p>
                <p className="mt-1 text-[10px] font-medium text-slate-500">
                    {TIER_LABEL[reward.tier] ?? TIER_LABEL.common}
                </p>
            </div>
        </div>
    );
}

function EmptyRewardSlot() {
    return (
        <div className="relative overflow-hidden rounded-[1.35rem] border border-dashed border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3">
            <div className="flex aspect-square flex-col items-center justify-center rounded-[1rem] bg-slate-50/70 text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white">
                    <Gift className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-[11px] font-semibold text-slate-500">ยังไม่เปิดรางวัล</p>
                <p className="mt-1 text-[10px] text-slate-400">เพิ่มรางวัลในแอดมินได้</p>
            </div>
        </div>
    );
}

export function GachaGridMachine({
    machineId,
    machineName = "ตู้สุ่ม",
    costType = "FREE",
    costAmount = 0,
    initialBalances = EMPTY_USER_BALANCES,
    maintenance,
}: Readonly<GachaGridMachineProps>) {
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

    const revealWinImmediately = useCallback((wonIdx: number, reward: GridReward) => {
        clearQueuedTimeouts();
        pendingRevealRef.current = null;
        setHighlightIdx(wonIdx);
        setWonIndex(wonIdx);
        setWonReward(reward);
        setSpinning(false);
    }, [clearQueuedTimeouts]);

    const fetchRewards = useCallback(async () => {
        setLoading(true);
        try {
            const url = machineId
                ? `/api/gacha/grid/rewards?machineId=${machineId}`
                : "/api/gacha/grid/rewards";
            const res = await fetch(url);
            const json = await res.json() as { success: boolean; data: GridReward[] };
            if (json.success) {
                const limited = (json.data ?? []).filter(Boolean).slice(0, 9);
                const padded = Array.from({ length: 9 }, (_, index) => limited[index] ?? null);
                setRewards(padded);
            }
        } catch {
            // Keep silent and render fallback state.
        } finally {
            setLoading(false);
        }
    }, [machineId]);

    useEffect(() => { void fetchRewards(); }, [fetchRewards]);
    useEffect(() => { setBalances(initialBalances); }, [initialBalances]);
    useEffect(() => () => { clearQueuedTimeouts(); }, [clearQueuedTimeouts]);
    useEffect(() => {
        if (typeof window === "undefined") return;
        const saved = window.localStorage.getItem("gacha-skip-animation");
        setSkipAnimationEnabled(saved === "true");
    }, []);
    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("gacha-skip-animation", String(skipAnimationEnabled));
    }, [skipAnimationEnabled]);

    const refreshBalances = useCallback(async () => {
        if (costType === "FREE") return;
        try {
            const res = await fetch("/api/user/balance", { cache: "no-store" });
            if (!res.ok) return;
            const json = await res.json() as ({ success?: boolean } & Partial<UserBalances>);
            if (!json.success) return;
            setBalances({
                creditBalance: Number(json.creditBalance ?? 0),
                pointBalance: Number(json.pointBalance ?? 0),
                ticketBalance: Number(json.ticketBalance ?? 0),
            });
        } catch {
            // Keep current values if refresh fails.
        }
    }, [costType]);

    const handleSpin = useCallback(async () => {
        const actualRewards = rewards.filter((reward): reward is GridReward => Boolean(reward));
        if (spinning || actualRewards.length === 0) return;

        clearQueuedTimeouts();
        skipRequestedRef.current = false;
        pendingRevealRef.current = null;
        setSpinning(true);
        setWonIndex(null);
        setWonReward(null);
        setHighlightIdx(null);

        try {
            const res = await fetch("/api/gacha/grid/roll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ machineId: machineId ?? null }),
            });
            const json = await res.json() as {
                success: boolean;
                message?: string;
                data?: {
                    wonIndex: number;
                    rewardId: string;
                    rewardName: string;
                    rewardType: string;
                    rewardAmount: number | null;
                    imageUrl: string | null;
                    tier: string;
                };
            };

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
            void refreshBalances();

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
    }, [clearQueuedTimeouts, machineId, queueTimeout, refreshBalances, revealWinImmediately, rewards, skipAnimationEnabled, spinning]);

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

    const currencyWord = getCurrencyWord(costType);
    const balance = getBalanceByCostType(balances, costType);
    const isBlocked = Boolean(maintenance?.enabled);
    const actualRewards = rewards.filter((reward): reward is GridReward => Boolean(reward));

    return (
        <div className="flex w-full max-w-[640px] flex-col gap-6">
            <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white px-4 py-5 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.35)] sm:px-6 sm:py-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#145de7]/70">Lucky Board</p>
                        <h2 className="mt-1 text-[22px] font-black leading-none text-[#145de7]">{machineName}</h2>
                    </div>
                    <div className="rounded-full border border-[#145de7]/15 bg-[#eef5ff] px-3 py-1.5 text-right text-[11px] font-semibold text-[#145de7]">
                        <p className="opacity-70">รางวัลพร้อมสุ่ม</p>
                        <p className="text-[14px] font-black">{actualRewards.length}/9</p>
                    </div>
                </div>

                {loading && (
                    <div className="flex h-56 items-center justify-center rounded-[1.5rem] border border-slate-200/70 bg-slate-50/70">
                        <Loader2 className="h-10 w-10 animate-spin text-[#145de7]/60" />
                    </div>
                )}

                {!loading && actualRewards.length === 0 && (
                    <div className="flex h-56 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 text-center">
                        <Gift className="h-10 w-10 text-slate-300" />
                        <p className="mt-3 text-sm font-semibold text-slate-600">ยังไม่มีรางวัลในตู้</p>
                        <p className="mt-1 text-xs text-slate-400">เพิ่มรางวัลจากหน้าแอดมินก่อนเปิดให้สุ่ม</p>
                    </div>
                )}

                {!loading && actualRewards.length > 0 && (
                    <div className="rounded-[1.5rem] border border-slate-100 bg-[radial-gradient(circle_at_top,_rgba(20,93,231,0.06),_transparent_45%),linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-3 sm:p-4">
                        <div className="grid grid-cols-3 gap-3 sm:gap-4">
                            {rewards.map((reward, idx) => (
                                reward ? (
                                    <RewardCard
                                        key={`${reward.id}-${idx}`}
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
                <div className="rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-center shadow-sm">
                    <p className="text-sm font-semibold text-amber-900">ระบบกาชากำลังปิดปรับปรุงชั่วคราว</p>
                    <p className="mt-1 text-xs text-amber-800/90">{maintenance.message}</p>
                </div>
            )}

            <div className="rounded-[1.75rem] border border-[#dbe7ff] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-4 shadow-[0_18px_50px_-36px_rgba(20,93,231,0.35)]">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[24px] font-black tracking-tight text-[#145de7]">
                                สุ่มรางวัลครั้งละ {costAmount.toLocaleString()} {currencyWord}
                            </p>
                            {costType !== "FREE" && (
                                <p className="mt-2 text-[12px] font-medium text-slate-500">
                                    เมื่อกดสุ่มแล้วไม่สามารถขอคืน{currencyWord}ได้ในทุกกรณี
                                </p>
                            )}
                        </div>

                        {costType !== "FREE" && (
                            <div className="rounded-2xl border border-[#bcd6ff] bg-[#dce9ff] px-4 py-3 text-[#145de7]">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">ยอดคงเหลือ</p>
                                <p className="mt-1 text-[20px] font-black leading-none">
                                    {balance.toLocaleString()} <span className="text-[13px] font-bold">{currencyWord}</span>
                                </p>
                            </div>
                        )}
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#158e4d]/15 bg-[#effaf4] px-4 py-3 transition hover:border-[#158e4d]/30">
                        <input
                            type="checkbox"
                            checked={skipAnimationEnabled}
                            onChange={(event) => handleSkipToggle(event.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-[#158e4d]/40 text-[#158e4d] focus:ring-[#158e4d]"
                        />
                        <div className="flex-1">
                            <p className="flex items-center gap-2 text-sm font-bold text-[#158e4d]">
                                <CheckCircle2 className="h-4 w-4" />
                                ข้ามอนิเมชั่นอัตโนมัติ
                            </p>
                            <p className="mt-1 text-[12px] text-[#158e4d]/80">
                                เหมาะกับคนที่อยากเห็นผลลัพธ์ทันที ไม่ต้องรอจังหวะสุ่มทีละช่อง
                            </p>
                        </div>
                    </label>

                    <div className="w-full">
                        {wonReward ? (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handlePlayAgain}
                                    className="flex items-center justify-center gap-2 rounded-2xl bg-[#158e4d] px-4 py-4 text-[15px] font-black text-white shadow-[0_16px_30px_-18px_rgba(21,142,77,0.85)] transition-all hover:bg-[#117640] active:scale-[0.985]"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    เล่นอีกครั้ง
                                </button>
                                <button
                                    onClick={() => setWonReward(null)}
                                    className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#158e4d] bg-white px-4 py-4 text-[15px] font-black text-[#158e4d] transition-all hover:bg-[#f7fffa] active:scale-[0.985]"
                                >
                                    <X className="h-4 w-4" />
                                    ปิดผลลัพธ์
                                </button>
                            </div>
                        ) : spinning ? (
                            <button
                                disabled
                                className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-[#158e4d]/65 px-4 py-4 text-[15px] font-black text-white/85"
                            >
                                <Loader2 className="h-5 w-5 animate-spin" />
                                กำลังสุ่ม...
                            </button>
                        ) : (
                            <button
                                onClick={() => void handleSpin()}
                                disabled={loading || isBlocked || actualRewards.length === 0}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#158e4d] px-4 py-4 text-[16px] font-black text-white shadow-[0_16px_30px_-18px_rgba(21,142,77,0.85)] transition-all hover:bg-[#117640] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Gamepad2 className="h-5 w-5" />
                                {maintenance?.enabled ? "ปิดปรับปรุงชั่วคราว" : "สุ่ม 1 ครั้ง"}
                            </button>
                        )}
                    </div>

                    {costType !== "FREE" && (
                        <p className="text-center text-[11px] font-medium text-slate-400">
                            ระบบจะดึงยอดล่าสุดจากบัญชีก่อนสรุปผลทุกครั้ง
                        </p>
                    )}
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
                        setTimeout(() => void handleSpin(), 100);
                    }}
                />
            )}
        </div>
    );
}
