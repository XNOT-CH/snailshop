"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw } from "lucide-react";
import Image from "next/image";

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
        label: "Common",
        accent: "#f97316",           // orange
        glow: "rgba(249,115,22,0.35)",
        dot: "bg-orange-400",
    },
    rare: {
        label: "Rare",
        accent: "#22c55e",           // green
        glow: "rgba(34,197,94,0.35)",
        dot: "bg-emerald-400",
    },
    epic: {
        label: "Epic",
        accent: "#8b5cf6",           // violet
        glow: "rgba(139,92,246,0.40)",
        dot: "bg-violet-400",
    },
    legendary: {
        label: "Legendary",
        accent: "#ef4444",           // red
        glow: "rgba(239,68,68,0.45)",
        dot: "bg-red-400",
    },
};

export function GachaResultModal({ product, onClose, onSpinAgain }: GachaResultModalProps) {
    const tier = tierConfig[product.tier];

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Backdrop */}
                <motion.div
                    className="absolute inset-0 bg-black/70 backdrop-blur-md"
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                />

                {/* Card */}
                <motion.div
                    className="relative z-10 w-full max-w-xs bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl"
                    style={{ border: `1px solid ${tier.accent}22` }}
                    initial={{ scale: 0.88, opacity: 0, y: 24 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.92, opacity: 0 }}
                    transition={{ type: "spring", damping: 22, stiffness: 320 }}
                >
                    {/* Top accent line */}
                    <div className="h-[2px] w-full" style={{ background: tier.accent }} />

                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 z-20 p-1.5 rounded-full text-zinc-500 hover:text-zinc-200 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    {/* Tier label */}
                    <div className="px-6 pt-5 pb-1 flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${tier.dot}`} />
                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: tier.accent }}>
                            {tier.label}
                        </span>
                    </div>

                    {/* Image */}
                    <div className="flex justify-center py-6">
                        <motion.div
                            className="relative w-36 h-36 rounded-full overflow-hidden"
                            initial={{ scale: 0.75, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", delay: 0.15, damping: 18 }}
                        >

                            {product.imageUrl && (product.imageUrl.startsWith("/") || product.imageUrl.startsWith("http")) ? (
                                <Image
                                    src={product.imageUrl}
                                    alt={product.name}
                                    fill
                                    sizes="144px"
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-4xl">
                                    🎁
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* Info */}
                    <motion.div
                        className="px-6 pb-6 text-center space-y-1"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <p className="text-base font-semibold text-zinc-100 leading-snug">{product.name}</p>
                        {product.price > 0 && (
                            <p className="text-sm text-zinc-500">
                                มูลค่า{" "}
                                <span style={{ color: tier.accent }} className="font-medium">
                                    ฿{product.price.toLocaleString()}
                                </span>
                            </p>
                        )}
                    </motion.div>

                    {/* Actions */}
                    <motion.div
                        className="px-6 pb-6 flex gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.38 }}
                    >
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 transition-all"
                        >
                            ปิด
                        </button>
                        <button
                            onClick={onSpinAgain}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5 transition-all hover:brightness-110"
                            style={{ background: tier.accent }}
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
