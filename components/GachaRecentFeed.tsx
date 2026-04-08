"use client";

import { useState, useEffect } from "react";
import { Loader2, User, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { shouldBypassImageOptimization } from "@/lib/imageUrl";

interface RecentLog {
    id: string;
    tier: string;
    rewardName: string;
    rewardImageUrl: string | null;
    username: string;
    createdAt: string;
}

export function GachaRecentFeed({ refreshKey }: Readonly<{ refreshKey: number }>) {
    const [logs, setLogs] = useState<RecentLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isHovered, setIsHovered] = useState(false);

    // Auto-scroll: shift items one by one every 2.5s, pause on hover
    useEffect(() => {
        if (logs.length <= 1 || isHovered) return;
        const interval = setInterval(() => {
            setLogs((prev) => {
                const arr = [...prev];
                const first = arr.shift();
                if (first) arr.push(first);
                return arr;
            });
        }, 2500);
        return () => clearInterval(interval);
    }, [isHovered, logs.length]);

    useEffect(() => {
        let mounted = true;
        const fetchRecent = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/gacha/recent");
                if (!res.ok) throw new Error("Failed to fetch recent logs");
                const json = await res.json();
                if (json.success && mounted) {
                    setLogs(json.data);
                }
            } catch {
                // ignore
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchRecent();
        return () => { mounted = false; };
    }, [refreshKey]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 bg-card/50 rounded-xl border border-border/50">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-card/50 rounded-xl border border-border/50 text-muted-foreground gap-3">
                <Gift className="w-8 h-8 opacity-20" />
                <p className="text-sm font-medium">ยังไม่มีผู้โชคดีในช่วงเวลานี้</p>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm">
            <div className="bg-[#145de7] text-white py-2.5 px-4 font-bold flex items-center gap-2 relative z-10">
                <div className="bg-white/20 p-1 rounded-full text-white">
                    <User className="h-4 w-4" />
                </div>
                ผู้โชคดีล่าสุดที่ผ่านมา
            </div>

            <section
                aria-label="Recent Winners Feed"
                className="relative w-full overflow-hidden bg-white"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onFocus={() => setIsHovered(true)}
                onBlur={() => setIsHovered(false)}
                /* NOSONAR */ tabIndex={0}
            >
                <div className="flex items-start px-2 py-4">
                    <AnimatePresence mode="popLayout">
                        {logs.map((log) => (
                            <motion.div
                                key={log.id}
                                layout
                                initial={{ opacity: 0, scale: 0.8, x: -50 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="relative flex w-[140px] flex-shrink-0 cursor-pointer flex-col items-center gap-2 px-2 group"
                            >
                                <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-zinc-50 shadow-sm transition-transform group-hover:scale-105">
                                    {log.rewardImageUrl ? (
                                        <Image
                                            src={log.rewardImageUrl}
                                            alt={log.rewardName}
                                            fill
                                            sizes="80px"
                                            className="object-cover"
                                            unoptimized={shouldBypassImageOptimization(log.rewardImageUrl)}
                                        />
                                    ) : (
                                        <Gift className="w-8 h-8 text-muted-foreground/30" />
                                    )}

                                    {/* Tier Badge */}
                                    {log.tier === 'legendary' && <div className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white shadow-sm" />}
                                    {log.tier === 'epic' && <div className="absolute top-0 right-0 h-3 w-3 rounded-full bg-violet-400 ring-2 ring-white shadow-sm" />}
                                </div>

                                <div className="text-center w-full">
                                    <p className="w-full truncate text-xs font-bold text-[#145de7]">ได้รับ: {log.rewardName}</p>
                                    <p className="mt-0.5 w-full truncate text-xs text-slate-500">{log.username}</p>
                                    <p className="mt-1 inline-block border-b border-slate-300/80 border-dotted text-[10px] text-slate-400">
                                        {new Date(log.createdAt).toLocaleString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </section>
        </div>
    );
}
