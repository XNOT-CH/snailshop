"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Gift, RotateCcw, Gamepad2, Dices } from "lucide-react";
import Image from "next/image";
import { GachaResultModal } from "@/components/GachaResultModal";
import { showError } from "@/lib/swal";

interface GridReward {
    id: string;
    tier: "common" | "rare" | "epic" | "legendary";
    rewardType: string;
    rewardName: string;
    rewardAmount: number | null;
    imageUrl: string | null;
}

interface GachaGridMachineProps {
    machineId?: string;
    machineName?: string;
    costType?: string;
    costAmount?: number;
    userBalance?: number;
}

// Match สุ่มตัว X tier ring styles
const TIER_RING: Record<string, string> = {
    legendary: "ring-[3px] ring-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse",
    epic: "ring-2 ring-violet-500/90 shadow-[0_0_15px_rgba(139,92,246,0.6)]",
    rare: "ring-2 ring-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.4)]",
    common: "ring-1 ring-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.3)]",
};

const TIER_BG: Record<string, string> = {
    legendary: "bg-gradient-to-br from-red-500/30 via-orange-500/20 to-rose-900/40",
    epic: "bg-gradient-to-br from-violet-500/20 to-indigo-900/40",
    rare: "bg-gradient-to-br from-emerald-500/10 to-emerald-700/5",
    common: "bg-gradient-to-br from-amber-500/10 to-amber-700/5",
};

const TIER_DOT: Record<string, string> = {
    legendary: "bg-red-500",
    epic: "bg-violet-400",
    rare: "bg-emerald-400",
    common: "bg-amber-400",
};

function RewardCard({
    reward,
    isHighlighted,
    isWinner,
    isSpinning,
}: {
    reward: GridReward;
    isHighlighted: boolean;
    isWinner: boolean;
    isSpinning: boolean;
}) {
    const ring = TIER_RING[reward.tier] ?? TIER_RING.common;
    const bg = TIER_BG[reward.tier] ?? TIER_BG.common;
    const dot = TIER_DOT[reward.tier] ?? TIER_DOT.common;

    return (
        <div className={[
            "relative flex flex-col items-center rounded-xl overflow-hidden transition-all duration-150 select-none",
            "border border-border/40 bg-card",
        ].join(" ")}>
            {/* Circle tile — matches สุ่มตัว X style */}
            <div className="w-full aspect-square flex items-center justify-center p-3">
                <div className={[
                    "relative w-full h-full rounded-full overflow-hidden transition-all duration-150",
                    ring,
                    isHighlighted && !isWinner ? "scale-110 brightness-125 ring-white/80" : "",
                    isWinner ? "scale-110 brightness-125" : "",
                    isSpinning && !isHighlighted ? "opacity-20 scale-90" : "",
                ].join(" ")}>
                    {reward.imageUrl && (reward.imageUrl.startsWith("/") || reward.imageUrl.startsWith("http")) ? (
                        <div className="absolute inset-0 bg-zinc-950">
                            <Image
                                src={reward.imageUrl}
                                alt={reward.rewardName}
                                fill
                                sizes="120px"
                                className="object-contain"
                            />
                        </div>
                    ) : (
                        <div className={`w-full h-full ${bg} flex items-center justify-center`}>
                            <span className={`w-3 h-3 rounded-full ${dot}`} />
                        </div>
                    )}
                    {/* pulse ring on highlight */}
                    {isHighlighted && (
                        <div className="absolute inset-0 rounded-full border border-white/60 animate-ping opacity-70 pointer-events-none" />
                    )}
                    {/* WIN badge */}
                    {isWinner && (
                        <div className="absolute top-1 right-1 bg-yellow-400 text-yellow-900 text-[8px] font-black px-1 py-0.5 rounded-sm shadow z-10">
                            ★ WIN
                        </div>
                    )}
                </div>
            </div>
            {/* Label */}
            <div className="w-full text-center pb-1.5 px-1">
                <p className="text-[10px] font-semibold text-foreground leading-tight truncate px-1">
                    {reward.rewardType !== "PRODUCT" && reward.rewardAmount
                        ? `${Number(reward.rewardAmount).toLocaleString()} `
                        : ""}
                    {reward.rewardName}
                </p>
            </div>
        </div>
    );
}

export function GachaGridMachine({
    machineId,
    machineName = "สุ่มกงล้อ",
    costType = "FREE",
    costAmount = 0,
    userBalance = 0,
}: GachaGridMachineProps) {
    const [rewards, setRewards] = useState<GridReward[]>([]);
    const [loading, setLoading] = useState(true);
    const [spinning, setSpinning] = useState(false);
    const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
    const [wonIndex, setWonIndex] = useState<number | null>(null);
    const [wonReward, setWonReward] = useState<GridReward | null>(null);
    const [balance, setBalance] = useState(userBalance);
    const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchRewards = useCallback(async () => {
        setLoading(true);
        try {
            const url = machineId
                ? `/api/gacha/grid/rewards?machineId=${machineId}`
                : "/api/gacha/grid/rewards";
            const res = await fetch(url);
            const json = await res.json() as { success: boolean; data: GridReward[] };
            if (json.success) {
                const data = (json.data ?? []).filter(Boolean) as GridReward[];
                const limited = data.slice(0, 9);
                // Fill remaining slots with null placeholders — do NOT repeat rewards
                const padded = Array.from({ length: 9 }, (_, i) => limited[i] ?? null) as (GridReward | null)[];
                setRewards(padded as unknown as GridReward[]);
            }
        } catch {/* ignore */ } finally { setLoading(false); }
    }, [machineId]);

    useEffect(() => { void fetchRewards(); }, [fetchRewards]);
    useEffect(() => () => { if (intervalRef.current) clearTimeout(intervalRef.current); }, []);

    const handleSpin = useCallback(async () => {
        const actualRewards = rewards.filter(Boolean);
        if (spinning || actualRewards.length === 0) return;
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
                success: boolean; message?: string;
                data?: { wonIndex: number; rewardId: string; rewardName: string; rewardType: string; rewardAmount: number | null; imageUrl: string | null; tier: string };
            };

            if (!json.success) {
                showError(json.message ?? "สุ่มไม่สำเร็จ");
                setSpinning(false);
                return;
            }

            // Deduct cost immediately — no refresh needed
            if (costAmount > 0) setBalance((prev) => Math.max(0, prev - costAmount));

            const wonIdx = json.data!.wonIndex;
            const wonRewardData: GridReward = {
                id: json.data!.rewardId,
                tier: json.data!.tier as GridReward["tier"],
                rewardType: json.data!.rewardType,
                rewardName: json.data!.rewardName,
                rewardAmount: json.data!.rewardAmount,
                imageUrl: json.data!.imageUrl,
            };

            const total = 20 + Math.floor(Math.random() * 8);
            let step = 0;
            const flash = () => {
                const isLast = step >= total - 1;
                const idx = isLast ? wonIdx : step % rewards.length;
                setHighlightIdx(idx);
                step++;
                if (isLast) {
                    setTimeout(() => {
                        setWonIndex(wonIdx);
                        setWonReward(wonRewardData);
                        setSpinning(false);
                    }, 500);
                    return;
                }
                const base = step < 5 ? 60 : step < 12 ? 100 : step < 18 ? 180 : 280;
                intervalRef.current = setTimeout(flash, base);
            };
            intervalRef.current = setTimeout(flash, 80);
        } catch {
            showError("เกิดข้อผิดพลาด กรุณาลองใหม่");
            setSpinning(false);
        }
    }, [spinning, rewards, machineId]);

    const handlePlayAgain = () => {
        setHighlightIdx(null);
        setWonIndex(null);
        setWonReward(null);
    };

    const costLabel = costType === "FREE"
        ? "สุ่มรางวัล (ฟรี)"
        : `สุ่มรางวัลครั้งละ ${costAmount.toLocaleString()} ${costType === "CREDIT" ? "เครดิต" : "พอยต์"}`;

    const balanceLabel = costType === "CREDIT" ? "ยอดเครดิตสะสม" : costType === "POINT" ? "ยอดพอยต์สะสม" : null;

    return (
        <div className="flex flex-col items-center gap-8 w-full max-w-[640px]">

            {/* ── Grid Card (same white card as สุ่มตัว X) ── */}
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-4 sm:p-8 shadow-sm w-full">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-500 opacity-60" />
                    </div>
                ) : rewards.filter(Boolean).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                        <Gift className="w-10 h-10 opacity-20" />
                        <p className="text-sm">ยังไม่มีรางวัลในระบบ</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-3">
                        {rewards.map((reward, idx) => (
                            reward
                                ? (
                                    <RewardCard
                                        key={`${reward.id}-${idx}`}
                                        reward={reward}
                                        isHighlighted={highlightIdx === idx}
                                        isWinner={wonIndex === idx}
                                        isSpinning={spinning}
                                    />
                                ) : (
                                    /* Empty placeholder tile */
                                    <div key={`empty-${idx}`} className="relative flex flex-col items-center rounded-xl overflow-hidden border border-border/20 bg-muted/20 aspect-square">
                                        <div className="w-full h-full flex items-center justify-center">
                                            <div className="w-10 h-10 rounded-full border-2 border-dashed border-border/30" />
                                        </div>
                                    </div>
                                )
                        ))}
                    </div>
                )}
            </div>

            {/* ── Controls (same layout as สุ่มตัว X) ── */}
            <div className="flex flex-col gap-4 w-full">

                {/* Cost text — centered, matches สุ่มตัว X */}
                <div className="w-full flex flex-col items-center mt-2">
                    {/* Title + compact balance badge */}
                    <div className="w-full flex items-center justify-between mb-4">
                        <h2 className="text-[17px] md:text-[20px] font-bold text-[#145de7]">{costLabel}</h2>
                        {balanceLabel && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#145de7] dark:text-[#7ba2f5] bg-[#d0e3ff] dark:bg-[#d0e3ff]/15 border border-[#145de7]/20 rounded-full px-3 py-1 whitespace-nowrap">
                                💰 {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {costType === "CREDIT" ? "เครดิต" : "พอยต์"}
                            </span>
                        )}
                    </div>

                    {/* Buttons */}
                    <div className="w-full">
                        {!wonReward ? (
                            <button
                                onClick={() => void handleSpin()}
                                disabled={spinning || loading}
                                className="w-full py-3 md:py-3.5 rounded-md bg-[#158e4d] hover:bg-[#117640] text-white font-bold text-[15px] md:text-base shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {spinning
                                    ? <><Loader2 className="h-5 w-5 animate-spin" /> กำลังสุ่ม...</>
                                    : <><Gamepad2 className="h-5 w-5" /> สุ่ม 1 ครั้ง</>
                                }
                            </button>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handlePlayAgain}
                                    className="py-3 rounded-md bg-[#158e4d] hover:bg-[#117640] text-white font-bold text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <RotateCcw className="h-4 w-4" /> สุ่มอีกครั้ง
                                </button>
                                <button
                                    onClick={() => window.location.href = "/dashboard"}
                                    className="py-3 rounded-md bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    🎁 แลกรางวัล
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Disclaimer — muted, below buttons */}
                    {costType !== "FREE" && (
                        <p className="mt-3 text-[11px] text-muted-foreground text-center">
                            * เมื่อกดสุ่มแล้วไม่สามารถขอคืน{costType === "CREDIT" ? "เครดิต" : "พอยต์"}ได้ในทุกกรณี *
                        </p>
                    )}
                </div>
            </div>

            {/* Result modal — reuse same modal as สุ่มตัว X */}
            {wonReward && !spinning && (
                <GachaResultModal
                    product={{
                        id: wonReward.id,
                        name: `${wonReward.rewardType !== "PRODUCT" && wonReward.rewardAmount ? `${wonReward.rewardAmount.toLocaleString()} ` : ""}${wonReward.rewardName}`,
                        price: wonReward.rewardAmount ?? 0,
                        imageUrl: wonReward.imageUrl,
                        tier: wonReward.tier,
                    }}
                    onClose={handlePlayAgain}
                    onSpinAgain={() => { handlePlayAgain(); setTimeout(() => void handleSpin(), 100); }}
                />
            )}
        </div>
    );
}
