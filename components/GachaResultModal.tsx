"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, RotateCcw, X } from "lucide-react";
import Image from "next/image";
import { shouldBypassImageOptimization } from "@/lib/imageUrl";

interface GachaProduct {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    tier: "common" | "rare" | "epic" | "legendary";
}

interface GachaResultModalProps {
    product: GachaProduct;
    onClose: () => void;
    onSpinAgain: () => void;
}

const tierConfig = {
    common: {
        label: "COMMON",
        accent: "#f97316",
        glow: "rgba(249,115,22,0.24)",
        dot: "bg-orange-400",
    },
    rare: {
        label: "RARE",
        accent: "#22c55e",
        glow: "rgba(34,197,94,0.24)",
        dot: "bg-emerald-400",
    },
    epic: {
        label: "EPIC",
        accent: "#8b5cf6",
        glow: "rgba(139,92,246,0.26)",
        dot: "bg-violet-400",
    },
    legendary: {
        label: "LEGENDARY",
        accent: "#ef4444",
        glow: "rgba(239,68,68,0.28)",
        dot: "bg-red-400",
    },
} as const;

export function GachaResultModal({ product, onClose, onSpinAgain }: Readonly<GachaResultModalProps>) {
    const [imgErr, setImgErr] = useState(false);
    const tier = tierConfig[product.tier];
    const hasValidImg = !imgErr && product.imageUrl && (product.imageUrl.startsWith("/") || product.imageUrl.startsWith("http"));

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="absolute inset-0 bg-[rgba(8,10,14,0.72)] backdrop-blur-[4px]"
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                />

                <motion.div
                    className="relative z-10 w-full max-w-md overflow-hidden rounded-[30px] border bg-[#18171c]"
                    style={{
                        borderColor: "rgba(255,255,255,0.22)",
                        boxShadow: `0 28px 80px -34px rgba(0,0,0,0.82), 0 16px 40px -28px ${tier.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
                    }}
                    initial={{ scale: 0.92, opacity: 0, y: 18 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.97, opacity: 0, y: 10 }}
                    transition={{ type: "spring", damping: 24, stiffness: 280 }}
                >
                    <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-36 opacity-90"
                        style={{ background: `radial-gradient(circle at top, ${tier.glow}, transparent 68%)` }}
                    />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#242329] text-zinc-500 transition-all hover:bg-[#2d2b33] hover:text-zinc-100"
                        aria-label="Close reward modal"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className="px-8 pt-7 pb-1">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-[#222127] px-3 py-1.5">
                            <span className={`inline-block h-2 w-2 rounded-full ${tier.dot}`} />
                            <span className="text-[10px] font-semibold tracking-[0.22em] text-zinc-300/85">
                                {tier.label}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-center px-8 pt-4 pb-6">
                        <motion.div
                            className="relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#222127]"
                            style={{
                                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 8px rgba(255,255,255,0.012), 0 18px 35px -22px ${tier.glow}`,
                            }}
                            initial={{ scale: 0.82, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", delay: 0.12, damping: 20 }}
                        >
                            <div
                                className="pointer-events-none absolute inset-3 rounded-full"
                                style={{
                                    border: `1px solid ${tier.accent}1f`,
                                    background: `radial-gradient(circle at 50% 25%, ${tier.accent}18, transparent 55%)`,
                                }}
                            />
                            {hasValidImg ? (
                                <Image
                                    src={product.imageUrl!}
                                    alt={product.name}
                                    fill
                                    sizes="176px"
                                    className="object-cover"
                                    unoptimized={shouldBypassImageOptimization(product.imageUrl)}
                                    onError={() => setImgErr(true)}
                                />
                            ) : (
                                <div
                                    className="flex h-full w-full items-center justify-center"
                                    style={{
                                        background:
                                            "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.07), transparent 35%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                                    }}
                                >
                                    <div
                                        className="flex h-20 w-20 items-center justify-center rounded-full"
                                        style={{ backgroundColor: `${tier.accent}18`, boxShadow: `0 0 24px -14px ${tier.accent}` }}
                                    >
                                        <Gift className="h-9 w-9" style={{ color: tier.accent }} />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>

                    <motion.div
                        className="space-y-5 px-8 pb-8 text-center"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.22 }}
                    >
                        <div className="space-y-2.5">
                            <p className="text-[1.84rem] font-bold leading-[1.05] text-zinc-50">{product.name}</p>
                            <p className="text-[11px] font-medium tracking-[0.14em] text-zinc-500">รางวัลที่ได้รับ</p>
                        </div>
                        {product.price > 0 && (
                            <div className="mx-auto inline-flex min-w-[138px] items-center justify-center rounded-full border border-white/10 bg-[#232229] px-4 py-2.5 text-sm text-zinc-200">
                                <span>มูลค่า</span>
                                <span className="ml-2 font-semibold" style={{ color: tier.accent }}>
                                    ฿{product.price.toLocaleString()}
                                </span>
                            </div>
                        )}
                    </motion.div>

                    <motion.div
                        className="flex gap-3 px-8 pb-8"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.32 }}
                    >
                        <button
                            onClick={onClose}
                            className="flex-1 rounded-2xl border border-white/10 bg-[#202025] px-4 py-3.5 text-sm font-medium text-zinc-400 transition-all hover:border-white/18 hover:bg-[#292930] hover:text-zinc-100"
                        >
                            ปิด
                        </button>
                        <button
                            onClick={onSpinAgain}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:brightness-105"
                            style={{
                                background: `linear-gradient(135deg, ${tier.accent}, ${tier.accent}dd)`,
                                boxShadow: `0 16px 28px -18px ${tier.glow}`,
                            }}
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            สุ่มอีกครั้ง
                        </button>
                    </motion.div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
