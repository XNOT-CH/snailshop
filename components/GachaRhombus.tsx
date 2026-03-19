"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dices, Loader2, Gamepad2 } from "lucide-react";
import Image from "next/image";
import { showError } from "@/lib/swal";
import { GachaResultModal } from "@/components/GachaResultModal";
import { GachaRecentFeed } from "@/components/GachaRecentFeed";
import { DropRateModal } from "@/components/DropRateModal";
import {
    buildGrid,
    findTileIndex,
    GRID_DEFINITION,
    SELECTOR_PATHS,
    INTERSECTION_MAP,
    type TileType,
    type GachaProductLite,
} from "@/lib/gachaGrid";

type Phase = "idle" | "rolling1" | "waitSpin2" | "rolling2" | "revealing" | "result";

const tierRing: Record<TileType, string> = {
    start: "ring-1 ring-zinc-700/40",
    selector: "ring-1 ring-zinc-400/60",
    common: "ring-1 ring-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.3)]",
    rare: "ring-2 ring-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.4)]",
    epic: "ring-2 ring-violet-500/90 shadow-[0_0_15px_rgba(139,92,246,0.6)]",
    legendary: "ring-[3px] ring-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse",
};

const tierDot: Record<string, string> = {
    common: "bg-amber-400",
    rare: "bg-emerald-400",
    epic: "bg-violet-400",
    legendary: "bg-red-500",
};

const tierBg: Record<TileType, string> = {
    start: "bg-zinc-900",
    selector: "bg-zinc-800",
    common: "bg-gradient-to-br from-amber-500/10 to-amber-700/5",
    rare: "bg-gradient-to-br from-emerald-500/10 to-emerald-700/5",
    epic: "bg-gradient-to-br from-violet-500/20 to-indigo-900/40",
    legendary: "bg-gradient-to-br from-red-500/30 via-orange-500/20 to-rose-900/40",
};

const tierParticles: Record<string, string[]> = {
    common: ["#fbbf24", "#fde68a"],
    rare: ["#34d399", "#a7f3d0"],
    epic: ["#8b5cf6", "#c4b5fd", "#e9d5ff"],
    legendary: ["#ef4444", "#fca5a5", "#fde68a"],
};

interface Particle { id: number; tx: string; ty: string; color: string; dur: string; delay: string; size: number }

const _particleCache = new Map<string, Particle[]>();
function getParticles(tier: string): Particle[] {
    const cached = _particleCache.get(tier);
    if (cached) return cached;
    const colors = tierParticles[tier] ?? tierParticles.common;
    const particles: Particle[] = Array.from({ length: 20 }, (_, i) => {
        const angle = (i / 20) * 360;
        const rad = angle * (Math.PI / 180);
        const dist = 50 + Math.random() * 70; // NOSONAR
        return {
            id: i,
            tx: `${Math.cos(rad) * dist}px`,
            ty: `${Math.sin(rad) * dist}px`,
            color: colors[i % colors.length],
            dur: `${0.5 + Math.random() * 0.4}s`, // NOSONAR
            delay: `${Math.random() * 0.15}s`, // NOSONAR
            size: 5 + Math.floor(Math.random() * 6), // NOSONAR
        };
    });
    _particleCache.set(tier, particles);
    return particles;
}

function WinBurst({ tier }: { tier: string }) {
    const particles = getParticles(tier);
    return (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
            {particles.map((p) => (
                <div key={p.id} className="gacha-win-particle absolute rounded-full"
                    style={{
                        width: p.size, height: p.size, backgroundColor: p.color,
                        // @ts-expect-error CSS custom properties
                        "--tx": p.tx, "--ty": p.ty, "--dur": p.dur, "--delay": p.delay,
                    }}
                />
            ))}
        </div>
    );
}

interface GachaRhombusProps {
    products: GachaProductLite[];
    settings: { isEnabled: boolean; costType: string; costAmount: number; dailySpinLimit: number };
    userBalance?: number;
}

export function GachaRhombus({ products, settings, userBalance = 0 }: GachaRhombusProps) {
    const tiles = useMemo(() => buildGrid(products), [products]);

    const [phase, setPhase] = useState<Phase>("idle");
    const [highlightedTile, setHighlightedTile] = useState<number | null>(null);
    const [selectedLLabel, setSelectedLLabel] = useState<string | null>(null);
    const [selectedRLabel, setSelectedRLabel] = useState<string | null>(null);
    const [lPathTiles, setLPathTiles] = useState<number[]>([]);
    const [rPathTiles, setRPathTiles] = useState<number[]>([]);
    const [resultProduct, setResultProduct] = useState<GachaProductLite | null>(null);
    const [winTier, setWinTier] = useState<string>("common");
    const [showBurst, setShowBurst] = useState(false);
    const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
    const [flipKey, setFlipKey] = useState<Record<number, number>>({});
    const [showDropRate, setShowDropRate] = useState(false);

    const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (intervalRef.current) clearTimeout(intervalRef.current); }, []);

    const lSelectorIndices = useMemo(
        () => tiles.map((t, i) => (t.type === "selector" && t.side === "left" ? i : -1)).filter(i => i >= 0),
        [tiles]
    );
    const rSelectorIndices = useMemo(
        () => tiles.map((t, i) => (t.type === "selector" && t.side === "right" ? i : -1)).filter(i => i >= 0),
        [tiles]
    );

    const runRoulette = useCallback(
        (side: "L" | "R", chosenLabel: string, onDone: () => void) => {
            const idx = side === "L" ? lSelectorIndices : rSelectorIndices;
            if (idx.length === 0) { onDone(); return; }
            const total = 12 + Math.floor(Math.random() * 6);
            let step = 0;
            const flash = () => {
                const isLast = step >= total - 1;
                const tileIdx = isLast
                    ? tiles.findIndex(t => t.type === "selector" && t.label === chosenLabel)
                    : idx[step % idx.length];
                setHighlightedTile(tileIdx >= 0 ? tileIdx : idx[0]);
                step++;
                if (isLast) { setTimeout(onDone, 400); return; }
                const delay = step < 4 ? 280 : step < 8 ? 160 : 200 + (step - 8) * 30;
                intervalRef.current = setTimeout(flash, delay);
            };
            intervalRef.current = setTimeout(flash, 200);
        },
        [tiles, lSelectorIndices, rSelectorIndices]
    );

    const revealIntersection = useCallback(
        (lLabel: string, rLabel: string, product: GachaProductLite) => {
            const lPath = (SELECTOR_PATHS[lLabel] || []).map(([r, c]) => findTileIndex(tiles, r, c)).filter(i => i >= 0);
            const rPath = (SELECTOR_PATHS[rLabel] || []).map(([r, c]) => findTileIndex(tiles, r, c)).filter(i => i >= 0);
            setLPathTiles(lPath);
            setRPathTiles(rPath);
            const intersPos = INTERSECTION_MAP[lLabel]?.[rLabel];
            const intersIdx = intersPos ? findTileIndex(tiles, intersPos[0], intersPos[1]) : -1;
            setTimeout(() => {
                if (intersIdx >= 0) {
                    setHighlightedTile(intersIdx);
                    setFlipKey(prev => ({ ...prev, [intersIdx]: (prev[intersIdx] ?? 0) + 1 }));
                }
                setTimeout(() => {
                    setWinTier(product.tier ?? "common");
                    setShowBurst(true);
                    setTimeout(() => setShowBurst(false), 1200);
                    setResultProduct(product);
                    setPhase("result");
                    setHistoryRefreshKey(k => k + 1);
                }, 900);
            }, 500);
        },
        [tiles]
    );

    async function callRollApi(spinNum: 1 | 2) {
        const res = await fetch("/api/gacha/roll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ spin: spinNum }),
        });
        try { return await res.json(); }
        catch { return { success: false, message: res.status === 401 ? "กรุณาเข้าสู่ระบบก่อน" : "เกิดข้อผิดพลาด" }; }
    }

    const reset = () => {
        setResultProduct(null); setPhase("idle"); setHighlightedTile(null);
        setSelectedLLabel(null); setSelectedRLabel(null);
        setLPathTiles([]); setRPathTiles([]);
    };

    const handleFirstSpin = useCallback(async () => {
        if (phase !== "idle") return;
        setPhase("rolling1"); setResultProduct(null); setSelectedLLabel(null);
        setSelectedRLabel(null); setLPathTiles([]); setRPathTiles([]);
        setShowBurst(false); setHighlightedTile(null);
        try {
            const data = await callRollApi(1);
            if (!data.success) { showError(data.message || "สุ่มไม่สำเร็จ"); reset(); return; }
            const lLabel = data.data?.lLabel;
            if (!lLabel) { showError("ข้อมูลสุ่มไม่ครบถ้วน"); reset(); return; }
            runRoulette("L", lLabel, () => { setSelectedLLabel(lLabel); setPhase("waitSpin2"); });
        } catch { showError("เกิดข้อผิดพลาดในการสุ่ม"); reset(); }
    }, [phase, runRoulette]);

    const handleSecondSpin = useCallback(async () => {
        if (phase !== "waitSpin2") return;
        setPhase("rolling2"); setLPathTiles([]); setRPathTiles([]);
        try {
            const data = await callRollApi(2);
            if (!data.success) { showError(data.message || "สุ่มไม่สำเร็จ"); reset(); return; }
            const { rLabel, product } = data.data ?? {};
            if (!rLabel || !product) { showError("ข้อมูลสุ่มไม่ครบถ้วน"); reset(); return; }
            runRoulette("R", rLabel, () => {
                setSelectedRLabel(rLabel);
                setPhase("revealing");
                revealIntersection(selectedLLabel!, rLabel, product);
            });
        } catch { showError("เกิดข้อผิดพลาดในการสุ่ม"); reset(); }
    }, [phase, selectedLLabel, runRoulette, revealIntersection]);

    // ── Layout ─────────────────────────────────────────────────────────────────
    const spacingX = 110, spacingY = 44, tileSize = 52;
    const maxRowSize = Math.max(...GRID_DEFINITION.map(r => r.length));
    const gridWidth = (maxRowSize - 1) * spacingX + tileSize + 4;
    const gridHeight = (GRID_DEFINITION.length - 1) * spacingY + tileSize + 4;

    function getTilePos(row: number, col: number) {
        const rowSize = GRID_DEFINITION[row].length;
        const offsetX = (maxRowSize - rowSize) * (spacingX / 2);
        return { x: offsetX + col * spacingX + 2, y: row * spacingY + 2 };
    }

    // Responsive scaling — measure the card container's real width via ResizeObserver
    const [scale, setScale] = useState(1);
    const cardRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect.width ?? el.clientWidth;
            setScale(Math.min(1, w / gridWidth));
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [gridWidth]);

    return (
        <div className="flex flex-col items-center gap-8 w-full max-w-[640px]">

            {/* ── Grid (framed) ── */}
            <div ref={cardRef} className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-4 sm:p-8 md:p-10 shadow-sm w-full flex justify-center overflow-hidden relative">
                {/* Drop rate button — top-left corner of grid card */}
                <button onClick={() => setShowDropRate(true)}
                    className="absolute top-3 left-3 z-10 flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-background/80 hover:bg-background border border-border/60 rounded-full px-2.5 py-1 shadow-sm hover:text-[#145de7] transition-all">
                    ℹ️ อัตราดรอป
                </button>
                {/*
                  Outer wrapper is sized to the SCALED visual footprint (gridWidth*scale × gridHeight*scale)
                  so the flex container doesn't see the full native gridWidth causing right-side clipping.
                  The inner div sits at position:absolute top-left, scaled to fit perfectly inside.
                */}
                <div style={{ width: gridWidth * scale, height: gridHeight * scale, position: "relative", flexShrink: 0 }}>
                    <div
                        className="absolute top-0 left-0"
                        style={{ width: gridWidth, height: gridHeight, transform: `scale(${scale})`, transformOrigin: "top left" }}
                    >
                        <AnimatePresence>
                            {showBurst && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                                    <WinBurst tier={winTier} />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {tiles.map((tile, index) => {
                            const pos = getTilePos(tile.row, tile.col);
                            const isItem = tile.type !== "start" && tile.type !== "selector";
                            const isHL = highlightedTile === index;
                            const isLSel = tile.label === selectedLLabel;
                            const isRSel = tile.label === selectedRLabel;
                            const onL = lPathTiles.includes(index);
                            const onR = rPathTiles.includes(index);
                            const onBoth = onL && onR;

                            const fade =
                                (phase === "rolling1" && (isItem || tile.side === "right")) ||
                                (phase === "rolling2" && (isItem || tile.side === "left")) ||
                                (phase === "revealing" && isItem && !onL && !onR);

                            return (
                                <motion.div key={index} className="absolute"
                                    style={{ left: pos.x, top: pos.y, width: tileSize, height: tileSize }}
                                    initial={{ opacity: 0, scale: 0.6 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.015, type: "spring", stiffness: 280 }}>
                                    <div
                                        key={`f-${flipKey[index] ?? 0}`}
                                        className={[
                                            "relative w-full h-full rounded-full overflow-hidden transition-all duration-150",
                                            tierRing[tile.type],
                                            isHL && !onBoth ? "ring-2 ring-white/80 scale-110 brightness-125" : "",
                                            onBoth ? "ring-2 ring-white scale-115 brightness-125" : "",
                                            isLSel && phase !== "rolling2" && phase !== "revealing" ? "ring-2 ring-violet-400" : "",
                                            isRSel ? "ring-2 ring-emerald-400" : "",
                                            onL && !onBoth && phase === "revealing" ? "ring-2 ring-violet-400/50" : "",
                                            onR && !onBoth && phase === "revealing" ? "ring-2 ring-emerald-400/50" : "",
                                            fade ? "opacity-10 scale-90" : "",
                                        ].join(" ")}
                                    >
                                        {tile.type === "start" && (
                                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                                <Dices className="h-5 w-5 text-zinc-400" />
                                            </div>
                                        )}
                                        {tile.type === "selector" && (
                                            <div className={["w-full h-full flex items-center justify-center bg-zinc-800",
                                                isHL ? "bg-white/90" : "",
                                                isLSel && phase !== "rolling2" && phase !== "revealing" ? "bg-violet-500/20" : "",
                                                isRSel ? "bg-emerald-500/20" : "",
                                            ].join(" ")}>
                                                <span className={["text-[10px] font-bold tracking-wide",
                                                    isHL ? "text-zinc-900" : "text-zinc-300",
                                                    isLSel && !isHL ? "text-violet-400" : "",
                                                    isRSel && !isHL ? "text-emerald-400" : "",
                                                ].join(" ")}>{tile.label}</span>
                                            </div>
                                        )}
                                        {isItem && (
                                            tile.product?.imageUrl ? (
                                                <div className="absolute inset-0 bg-zinc-950 flex items-center justify-center">
                                                    <Image src={tile.product.imageUrl} alt={tile.product.name} fill sizes="64px" className="object-contain" />
                                                </div>
                                            ) : (
                                                <div className={`w-full h-full ${tierBg[tile.type]} flex items-center justify-center`}>
                                                    {tile.product
                                                        ? <span className={`w-2 h-2 rounded-full ${tierDot[tile.type] ?? "bg-zinc-500"}`} />
                                                        : <span className="text-[10px] text-zinc-600">—</span>
                                                    }
                                                </div>
                                            )
                                        )}
                                        {isHL && (
                                            <motion.div className="absolute inset-0 rounded-full border border-white/60"
                                                animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
                                                transition={{ duration: 0.65, repeat: Infinity }} />
                                        )}
                                    </div>
                                    {isItem && tile.product && (
                                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100">
                                            <span className="text-[9px] text-zinc-500">{tile.product.name.substring(0, 14)}</span>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Controls ── */}
            <div className="flex flex-col gap-4 w-full">

                {/* Status line */}
                <div className="min-h-[20px]">
                    <AnimatePresence mode="wait">
                        {phase === "waitSpin2" && selectedLLabel && (
                            <motion.p key="wait2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-xs text-muted-foreground text-center">
                                เลือกแล้ว{" "}
                                <span className="text-violet-400 font-semibold">{selectedLLabel}</span>
                                {" — กดสุ่มครั้งที่ 2 เพื่อเลือกแถวขวา"}
                            </motion.p>
                        )}
                        {phase === "revealing" && selectedLLabel && selectedRLabel && (
                            <motion.p key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-xs text-muted-foreground text-center">
                                <span className="text-violet-400 font-semibold">{selectedLLabel}</span>
                                {" × "}
                                <span className="text-emerald-400 font-semibold">{selectedRLabel}</span>
                                {" → "}
                                <span className="text-white font-semibold">จุดตัด</span>
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>

                {/* Spin CTA panel */}
                <div className="w-full flex flex-col items-center mt-6">
                    <div className="text-center mb-4 space-y-1">
                        <h2 className="text-[18px] md:text-[22px] font-bold text-[#145de7]">
                            สุ่มรางวัลครั้งละ {settings.costAmount.toLocaleString()} {settings.costType === "CREDIT" ? "เครดิต" : "เพชร"}
                        </h2>
                        <p className="text-[13px] md:text-[14px] font-medium text-gray-800 dark:text-gray-200">
                            * เมื่อกดสุ่มแล้วไม่สามารถขอคืน{settings.costType === "CREDIT" ? "เครดิต" : "เพชร"}ได้ในทุกกรณี *
                        </p>
                    </div>

                    <div className="w-full bg-[#d0e3ff] dark:bg-[#d0e3ff]/10 text-[#145de7] dark:text-[#7ba2f5] font-bold text-sm md:text-base py-3.5 rounded-md text-center mb-6">
                        ยอด{settings.costType === "CREDIT" ? "เครดิต" : "เพชร"}สะสม:{" "}
                        {userBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                        {settings.costType === "CREDIT" ? "เครดิต" : "เพชร"}{" "}
                        <span className="font-normal opacity-90">(แนะนำให้รีเฟรชเพื่อดูยอดล่าสุด)</span>
                    </div>

                    <div className="w-full">
                        {phase === "idle" && (
                            <button onClick={() => void handleFirstSpin()} disabled={!settings.isEnabled}
                                className="w-full py-3 md:py-3.5 rounded-md bg-[#158e4d] hover:bg-[#117640] text-white font-bold text-[15px] md:text-base shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                <Gamepad2 className="h-5 w-5" /> สุ่ม
                            </button>
                        )}
                        {(phase === "rolling1" || phase === "rolling2" || phase === "revealing") && (
                            <button disabled
                                className="w-full py-3 md:py-3.5 rounded-md bg-[#158e4d]/60 text-white/80 font-bold text-[15px] md:text-base cursor-not-allowed flex items-center justify-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                {phase === "rolling1" ? "กำลังสุ่ม..." : phase === "rolling2" ? "กำลังเลือก..." : "กำลังเปิด..."}
                            </button>
                        )}
                        {phase === "waitSpin2" && (
                            <button onClick={() => void handleSecondSpin()}
                                className="w-full py-3 md:py-3.5 rounded-md bg-[#158e4d] hover:bg-[#117640] text-white font-bold text-[15px] md:text-base shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                <Gamepad2 className="h-5 w-5" /> สุ่มครั้งที่ 2
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Winners Feed */}
            <div className="w-full mt-4">
                <GachaRecentFeed refreshKey={historyRefreshKey} />
            </div>

            {/* Drop rate modal */}
            <DropRateModal open={showDropRate} onClose={() => setShowDropRate(false)} />

            {/* Result modal */}
            {phase === "result" && resultProduct && (
                <GachaResultModal
                    product={resultProduct}
                    onClose={reset}
                    onSpinAgain={() => { reset(); setTimeout(() => void handleFirstSpin(), 200); }}
                />
            )}
        </div>
    );
}
