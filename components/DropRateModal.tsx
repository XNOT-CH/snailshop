"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";

interface DropRateModalProps {
    open: boolean;
    onClose: () => void;
    machineId?: string; // undefined = global (สุ่มตัว X)
}

interface TierRate {
    tier: string;
    label: string;
    labelTh: string;
    rate: number;
    dotCls: string;
    barCls: string;
    textCls: string;
}

export function DropRateModal({ open, onClose, machineId }: DropRateModalProps) {
    const [tiers, setTiers] = useState<TierRate[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        const url = machineId
            ? `/api/gacha/drop-rates?machineId=${machineId}`
            : "/api/gacha/drop-rates";
        fetch(url)
            .then((r) => r.json())
            .then((json: { success: boolean; data: TierRate[] }) => {
                if (json.success) setTiers(json.data ?? []);
            })
            .catch(() => { /* ignore */ })
            .finally(() => setLoading(false));
    }, [open, machineId]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        className="relative z-10 w-full max-w-xs bg-card rounded-2xl border border-border shadow-xl overflow-hidden"
                        initial={{ scale: 0.9, opacity: 0, y: -10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: -10 }}
                        transition={{ type: "spring", stiffness: 340, damping: 30 }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                            <p className="font-semibold text-sm text-foreground">อัตราการดรอป</p>
                            <button onClick={onClose}
                                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                                <X className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Tier rows */}
                        <div className="px-4 py-3 flex flex-col divide-y divide-border/50 min-h-[80px]">
                            {loading ? (
                                <div className="flex items-center justify-center py-6">
                                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : tiers.length === 0 ? (
                                <p className="text-[12px] text-muted-foreground text-center py-4">
                                    ยังไม่มีข้อมูลอัตราการดรอป
                                </p>
                            ) : (
                                tiers.map((tier, i) => (
                                    <div key={tier.tier} className="flex items-center gap-3 py-2.5">
                                        {/* dot */}
                                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${tier.dotCls}`} />

                                        {/* label */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground leading-none">{tier.label}</p>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">{tier.labelTh}</p>
                                        </div>

                                        {/* rate + bar */}
                                        <div className="flex flex-col items-end gap-1 w-20 flex-shrink-0">
                                            <span className={`text-sm font-bold ${tier.textCls}`}>{tier.rate}%</span>
                                            <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                                                <motion.div
                                                    className={`h-full rounded-full ${tier.barCls}`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${tier.rate}%` }}
                                                    transition={{ delay: 0.1 + i * 0.06, duration: 0.45, ease: "easeOut" }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <p className="text-[10px] text-muted-foreground text-center px-4 pb-3">
                            * อัตราการดรอปคำนวณจากน้ำหนักที่ตั้งค่าไว้ *
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
