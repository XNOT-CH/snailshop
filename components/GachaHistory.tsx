"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

interface RollLog {
    id: string;
    tier: string;
    rewardName: string;
    rewardImageUrl: string | null;
    costType: string;
    costAmount: number;
    createdAt: string;
}

interface Stats {
    todayCount: number;
    totalCount: number;
    topTier: string | null;
}

const tierConfig: Record<string, { label: string; color: string; emoji: string }> = {
    common: { label: "Common", color: "bg-orange-500/15 text-orange-600 border-orange-400/30", emoji: "🟠" },
    rare: { label: "Rare", color: "bg-green-500/15 text-green-600 border-green-400/30", emoji: "🟢" },
    epic: { label: "Epic", color: "bg-blue-500/15 text-blue-600 border-blue-400/30", emoji: "🔵" },
    legendary: { label: "Legendary", color: "bg-red-500/15 text-red-600 border-red-400/30", emoji: "🔴" },
};

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "เมื่อกี้";
    if (m < 60) return `${m} นาทีที่แล้ว`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
    return `${Math.floor(h / 24)} วันที่แล้ว`;
}

export function GachaHistory({ refreshKey }: Readonly<{ refreshKey: number }>) {
    const [logs, setLogs] = useState<RollLog[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchHistory = useCallback(async () => {
        try {
            const res = await fetch("/api/gacha/history");
            if (!res.ok) return;
            const data = await res.json();
            if (data.success) {
                setLogs(data.data.logs);
                setStats(data.data.stats);
            }
        } catch {
            // silently ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchHistory();
    }, [fetchHistory, refreshKey]);

    if (loading) {
        return (
            <div className="animate-pulse space-y-2 mt-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-xl bg-muted/40" />
                ))}
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="mt-4 text-center py-8 rounded-2xl border border-dashed border-border bg-muted/20">
                <p className="text-2xl mb-1">🎲</p>
                <p className="text-sm text-muted-foreground">ยังไม่มีประวัติการสุ่ม</p>
            </div>
        );
    }

    const top = stats?.topTier ? tierConfig[stats.topTier] : null;

    return (
        <div className="mt-4 space-y-3">
            {/* Stats row */}
            {stats && (
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl bg-muted/30 border border-border px-1.5 py-2.5 sm:px-2 sm:py-2">
                        <p className="text-xl sm:text-lg font-bold text-foreground">{stats.todayCount}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">วันนี้</p>
                    </div>
                    <div className="rounded-2xl bg-muted/30 border border-border px-1.5 py-2.5 sm:px-2 sm:py-2">
                        <p className="text-xl sm:text-lg font-bold text-foreground">{stats.totalCount}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">รวมทั้งหมด</p>
                    </div>
                    <div className="rounded-2xl bg-muted/30 border border-border px-1.5 py-2.5 sm:px-2 sm:py-2 flex flex-col items-center justify-center">
                        <p className="text-xl sm:text-lg font-bold text-foreground leading-none mb-1">{top ? top.emoji : "—"}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                            {top ? top.label : "ยังไม่มี"}
                        </p>
                    </div>
                </div>
            )}

            {/* Log list */}
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {logs.map((log, i) => {
                    const tier = tierConfig[log.tier] ?? tierConfig.common;
                    return (
                        <div
                            key={log.id}
                            className="gacha-history-item flex items-center gap-3.5 rounded-2xl border border-border bg-card/60 backdrop-blur-sm px-4 py-3 shadow-sm"
                            style={{ animationDelay: `${i * 30}ms` }}
                        >
                            {/* image */}
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border border-border/60 bg-white/90 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                                {log.rewardImageUrl ? (
                                    <Image
                                        src={log.rewardImageUrl}
                                        alt={log.rewardName}
                                        width={48}
                                        height={48}
                                        className="object-contain w-full h-full p-0.5"
                                    />
                                ) : (
                                    <span className="text-2xl">{tier.emoji}</span>
                                )}
                            </div>
                            {/* name + tier */}
                            <div className="flex-1 min-w-0 flex flex-col items-start gap-1">
                                <p className="text-sm sm:text-[15px] font-semibold text-foreground truncate w-full">{log.rewardName}</p>
                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold tracking-wide px-2 py-0.5 rounded-full border shadow-sm ${tier.color}`}>
                                    {tier.emoji} {tier.label}
                                </span>
                            </div>
                            {/* time */}
                            <p className="text-xs text-muted-foreground flex-shrink-0 font-medium">{timeAgo(log.createdAt)}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
