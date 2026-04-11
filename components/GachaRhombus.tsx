"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dices, Loader2, Gamepad2 } from "lucide-react";
import Image from "next/image";
import { showError, showSuccess } from "@/lib/swal";
import { GachaResultModal } from "@/components/GachaResultModal";
import { GachaRecentFeed } from "@/components/GachaRecentFeed";
import { DropRateModal } from "@/components/DropRateModal";
import { shouldBypassImageOptimization } from "@/lib/imageUrl";
import { EMPTY_USER_BALANCES, getBalanceByCostType, type UserBalances } from "@/lib/userBalances";
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
type Particle = { id: number; tx: string; ty: string; color: string; dur: string; delay: string; size: number };

const tierRing: Record<TileType, string> = {
  start: "ring-1 ring-zinc-700/40",
  selector: "ring-1 ring-zinc-400/60",
  common: "ring-1 ring-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.3)]",
  rare: "ring-2 ring-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.4)]",
  epic: "ring-2 ring-violet-500/90 shadow-[0_0_15px_rgba(139,92,246,0.6)]",
  legendary: "ring-[3px] ring-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]",
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

const particleCache = new Map<string, Particle[]>();

function getParticles(tier: string) {
  const cached = particleCache.get(tier);
  if (cached) return cached;
  const colors = tierParticles[tier] ?? tierParticles.common;
  const particles = Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * 360;
    const rad = angle * (Math.PI / 180);
    const dist = 50 + Math.random() * 70;
    return {
      id: i,
      tx: `${Math.cos(rad) * dist}px`,
      ty: `${Math.sin(rad) * dist}px`,
      color: colors[i % colors.length],
      dur: `${0.5 + Math.random() * 0.4}s`,
      delay: `${Math.random() * 0.15}s`,
      size: 5 + Math.floor(Math.random() * 6),
    };
  });
  particleCache.set(tier, particles);
  return particles;
}

function WinBurst({ tier }: { tier: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      {getParticles(tier).map((p) => (
        <div
          key={p.id}
          className="gacha-win-particle absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            ["--tx" as never]: p.tx,
            ["--ty" as never]: p.ty,
            ["--dur" as never]: p.dur,
            ["--delay" as never]: p.delay,
          }}
        />
      ))}
    </div>
  );
}

function TileImage({ imageUrl, name, fallback }: { imageUrl: string; name: string; fallback: React.ReactNode }) {
  const [err, setErr] = useState(false);
  if (err) return <>{fallback}</>;
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full bg-transparent">
      <Image
        src={imageUrl}
        alt={name}
        fill
        sizes="64px"
        className="object-cover object-center"
        unoptimized={shouldBypassImageOptimization(imageUrl)}
        onError={() => setErr(true)}
      />
    </div>
  );
}

interface GachaRhombusProps {
  products: GachaProductLite[];
  settings: { isEnabled: boolean; costType: string; costAmount: number; dailySpinLimit: number };
  initialBalances?: UserBalances;
  machineId?: string;
  maintenance?: { enabled: boolean; message: string };
}

export function GachaRhombus({ products, settings, initialBalances = EMPTY_USER_BALANCES, machineId, maintenance }: GachaRhombusProps) {
  const tiles = useMemo(() => buildGrid(products), [products]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [highlightedTile, setHighlightedTile] = useState<number | null>(null);
  const [selectedLLabel, setSelectedLLabel] = useState<string | null>(null);
  const [selectedRLabel, setSelectedRLabel] = useState<string | null>(null);
  const [lPathTiles, setLPathTiles] = useState<number[]>([]);
  const [rPathTiles, setRPathTiles] = useState<number[]>([]);
  const [resultProduct, setResultProduct] = useState<GachaProductLite | null>(null);
  const [winTier, setWinTier] = useState("common");
  const [showBurst, setShowBurst] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [flipKey, setFlipKey] = useState<Record<number, number>>({});
  const [showDropRate, setShowDropRate] = useState(false);
  const [auraTiles, setAuraTiles] = useState<number[]>([]);
  const [selectedLAuraTiles, setSelectedLAuraTiles] = useState<number[]>([]);
  const [balances, setBalances] = useState(initialBalances);
  const [skipAnimationEnabled, setSkipAnimationEnabled] = useState(false);
  const [scale, setScale] = useState(1);

  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pendingFirstSpinRef = useRef<string | null>(null);
  const pendingSecondSpinRef = useRef<{ rLabel: string; product: GachaProductLite } | null>(null);
  const skipRequestedPhaseRef = useRef<"rolling1" | "rolling2" | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const restoringPendingRef = useRef(false);

  const queueTimeout = useCallback((cb: () => void, delay: number) => {
    const id = setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter((value) => value !== id);
      cb();
    }, delay);
    timeoutIdsRef.current.push(id);
    return id;
  }, []);

  const clearQueuedTimeouts = useCallback(() => {
    for (const id of timeoutIdsRef.current) clearTimeout(id);
    timeoutIdsRef.current = [];
  }, []);

  useEffect(() => () => clearQueuedTimeouts(), [clearQueuedTimeouts]);
  useEffect(() => setBalances(initialBalances), [initialBalances]);
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
    if (settings.costType === "FREE") return;
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
      // Keep the most recent known balance if refresh fails.
    }
  }, [settings.costType]);

  const currencyWord = settings.costType === "CREDIT" ? "เครดิต" : settings.costType === "POINT" ? "พอยต์" : settings.costType === "TICKET" ? "ตั๋วสุ่ม" : "เพชร";
  const displayedBalance = getBalanceByCostType(balances, settings.costType);
  const isBlocked = !settings.isEnabled || maintenance?.enabled;
  const lSelectorIndices = useMemo(() => tiles.map((t, i) => (t.type === "selector" && t.side === "left" ? i : -1)).filter((i) => i >= 0), [tiles]);
  const rSelectorIndices = useMemo(() => tiles.map((t, i) => (t.type === "selector" && t.side === "right" ? i : -1)).filter((i) => i >= 0), [tiles]);

  const applyFirstSpinSelection = useCallback((lLabel: string) => {
    pendingFirstSpinRef.current = null;
    skipRequestedPhaseRef.current = null;
    clearQueuedTimeouts();
    setSelectedLLabel(lLabel);
    setAuraTiles([]);
    const selectorIdx = tiles.findIndex((t) => t.type === "selector" && t.label === lLabel);
    setHighlightedTile(selectorIdx >= 0 ? selectorIdx : null);
    const pathIndices = (SELECTOR_PATHS[lLabel] || []).map(([r, c]) => findTileIndex(tiles, r, c)).filter((i) => i >= 0);
    setSelectedLAuraTiles(selectorIdx >= 0 ? [selectorIdx, ...pathIndices] : pathIndices);
    setPhase("waitSpin2");
  }, [clearQueuedTimeouts, tiles]);

  const finalizeResult = useCallback((lLabel: string, rLabel: string, product: GachaProductLite, showBurstEffect: boolean) => {
    pendingSecondSpinRef.current = null;
    skipRequestedPhaseRef.current = null;
    clearQueuedTimeouts();
    setSelectedRLabel(rLabel);
    setAuraTiles([]);
    const lPath = (SELECTOR_PATHS[lLabel] || []).map(([r, c]) => findTileIndex(tiles, r, c)).filter((i) => i >= 0);
    const rPath = (SELECTOR_PATHS[rLabel] || []).map(([r, c]) => findTileIndex(tiles, r, c)).filter((i) => i >= 0);
    setLPathTiles(lPath);
    setRPathTiles(rPath);
    const intersPos = INTERSECTION_MAP[lLabel]?.[rLabel];
    const intersIdx = intersPos ? findTileIndex(tiles, intersPos[0], intersPos[1]) : -1;
    if (intersIdx >= 0) {
      setHighlightedTile(intersIdx);
      setFlipKey((prev) => ({ ...prev, [intersIdx]: (prev[intersIdx] ?? 0) + 1 }));
    }
    setWinTier(product.tier ?? "common");
    setShowBurst(showBurstEffect);
    if (showBurstEffect) queueTimeout(() => setShowBurst(false), 1200);
    setResultProduct(product);
    setPhase("result");
    setHistoryRefreshKey((key) => key + 1);
  }, [clearQueuedTimeouts, queueTimeout, tiles]);

  const runRoulette = useCallback((side: "L" | "R", chosenLabel: string, onDone: () => void) => {
    const indices = side === "L" ? lSelectorIndices : rSelectorIndices;
    if (indices.length === 0) {
      onDone();
      return;
    }
    const total = 12 + Math.floor(Math.random() * 6);
    let step = 0;
    const flash = () => {
      const isLast = step >= total - 1;
      const tileIdx = isLast ? tiles.findIndex((t) => t.type === "selector" && t.label === chosenLabel) : indices[step % indices.length];
      setHighlightedTile(tileIdx >= 0 ? tileIdx : indices[0]);
      const currentTile = tiles[tileIdx >= 0 ? tileIdx : indices[0]];
      if (currentTile?.label) {
        const pathIndices = (SELECTOR_PATHS[currentTile.label] || []).map(([r, c]) => findTileIndex(tiles, r, c)).filter((i) => i >= 0);
        setAuraTiles([tileIdx >= 0 ? tileIdx : indices[0], ...pathIndices]);
      }
      step++;
      if (isLast) {
        setAuraTiles([]);
        queueTimeout(onDone, 400);
        return;
      }
      const delay = step < 4 ? 280 : step < 8 ? 160 : 200 + (step - 8) * 30;
      queueTimeout(flash, delay);
    };
    queueTimeout(flash, 200);
  }, [lSelectorIndices, queueTimeout, rSelectorIndices, tiles]);

  const revealIntersection = useCallback((lLabel: string, rLabel: string, product: GachaProductLite) => {
    const lPath = (SELECTOR_PATHS[lLabel] || []).map(([r, c]) => findTileIndex(tiles, r, c)).filter((i) => i >= 0);
    const rPath = (SELECTOR_PATHS[rLabel] || []).map(([r, c]) => findTileIndex(tiles, r, c)).filter((i) => i >= 0);
    setLPathTiles(lPath);
    setRPathTiles(rPath);
    const intersPos = INTERSECTION_MAP[lLabel]?.[rLabel];
    const intersIdx = intersPos ? findTileIndex(tiles, intersPos[0], intersPos[1]) : -1;
    queueTimeout(() => {
      if (intersIdx >= 0) {
        setHighlightedTile(intersIdx);
        setFlipKey((prev) => ({ ...prev, [intersIdx]: (prev[intersIdx] ?? 0) + 1 }));
      }
      queueTimeout(() => finalizeResult(lLabel, rLabel, product, true), 900);
    }, 500);
  }, [finalizeResult, queueTimeout, tiles]);

  const callRollApi = useCallback(async (spinNum: 1 | 2 | 3) => {
    const res = await fetch("/api/gacha/roll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spin: spinNum, machineId }),
    });
    try {
      return await res.json();
    } catch {
      return { success: false, message: res.status === 401 ? "กรุณาเข้าสู่ระบบก่อน" : "เกิดข้อผิดพลาด" };
    }
  }, [machineId]);

  const reset = useCallback(() => {
    clearQueuedTimeouts();
    pendingFirstSpinRef.current = null;
    pendingSecondSpinRef.current = null;
    skipRequestedPhaseRef.current = null;
    setResultProduct(null);
    setPhase("idle");
    setHighlightedTile(null);
    setSelectedLLabel(null);
    setSelectedRLabel(null);
    setShowBurst(false);
    setLPathTiles([]);
    setRPathTiles([]);
    setAuraTiles([]);
    setSelectedLAuraTiles([]);
  }, [clearQueuedTimeouts]);

  useEffect(() => {
    if (restoringPendingRef.current) return;
    restoringPendingRef.current = true;

    void (async () => {
      try {
        const data = await callRollApi(3);
        if (!data.success) return;
        if (data.message) {
          showSuccess(data.message);
        }
        const { lLabel, rLabel, product } = data.data ?? {};
        if (!lLabel || !rLabel || !product) return;
        finalizeResult(lLabel, rLabel, product, false);
        void refreshBalances();
      } catch {
        // Ignore resume failures and let the user start a new spin manually.
      }
    })();
  }, [callRollApi, finalizeResult, refreshBalances]);

  const handleFirstSpin = useCallback(async () => {
    if (phase !== "idle") return;
    clearQueuedTimeouts();
    pendingFirstSpinRef.current = null;
    pendingSecondSpinRef.current = null;
    skipRequestedPhaseRef.current = null;
    setPhase("rolling1");
    setResultProduct(null);
    setSelectedLLabel(null);
    setSelectedRLabel(null);
    setLPathTiles([]);
    setRPathTiles([]);
    setShowBurst(false);
    setHighlightedTile(null);
    try {
      const data = await callRollApi(1);
      if (!data.success) {
        showError(data.message || "สุ่มไม่สำเร็จ");
        reset();
        return;
      }
      const lLabel = data.data?.lLabel;
      if (!lLabel) {
        showError("ข้อมูลสุ่มไม่ครบถ้วน");
        reset();
        return;
      }
      pendingFirstSpinRef.current = lLabel;
      if (skipAnimationEnabled || skipRequestedPhaseRef.current === "rolling1") {
        applyFirstSpinSelection(lLabel);
        return;
      }
      runRoulette("L", lLabel, () => applyFirstSpinSelection(lLabel));
    } catch {
      showError("เกิดข้อผิดพลาดในการสุ่ม");
      reset();
    }
  }, [applyFirstSpinSelection, callRollApi, clearQueuedTimeouts, phase, reset, runRoulette, skipAnimationEnabled]);

  const handleSecondSpin = useCallback(async () => {
    if (phase !== "waitSpin2") return;
    clearQueuedTimeouts();
    pendingSecondSpinRef.current = null;
    skipRequestedPhaseRef.current = null;
    setPhase("rolling2");
    setLPathTiles([]);
    setRPathTiles([]);
    try {
      const data = await callRollApi(2);
      if (!data.success) {
        showError(data.message || "สุ่มไม่สำเร็จ");
        reset();
        return;
      }
      if (data.message) {
        showSuccess(data.message);
      }
      const { rLabel, product } = data.data ?? {};
      if (!rLabel || !product) {
        showError("ข้อมูลสุ่มไม่ครบถ้วน");
        reset();
        return;
      }
      pendingSecondSpinRef.current = { rLabel, product };
      void refreshBalances();
      if ((skipAnimationEnabled || skipRequestedPhaseRef.current === "rolling2") && selectedLLabel) {
        finalizeResult(selectedLLabel, rLabel, product, false);
        return;
      }
      runRoulette("R", rLabel, () => {
        setSelectedRLabel(rLabel);
        setPhase("revealing");
        revealIntersection(selectedLLabel!, rLabel, product);
      });
    } catch {
      showError("เกิดข้อผิดพลาดในการสุ่ม");
      reset();
    }
  }, [callRollApi, clearQueuedTimeouts, finalizeResult, phase, refreshBalances, reset, revealIntersection, runRoulette, selectedLLabel, skipAnimationEnabled]);

  const handleSkipAnimation = useCallback(() => {
    if (phase === "rolling1") {
      skipRequestedPhaseRef.current = "rolling1";
      clearQueuedTimeouts();
      if (pendingFirstSpinRef.current) applyFirstSpinSelection(pendingFirstSpinRef.current);
      return;
    }
    if (phase === "rolling2" || phase === "revealing") {
      skipRequestedPhaseRef.current = "rolling2";
      clearQueuedTimeouts();
      if (selectedLLabel && pendingSecondSpinRef.current) {
        finalizeResult(selectedLLabel, pendingSecondSpinRef.current.rLabel, pendingSecondSpinRef.current.product, false);
      }
    }
  }, [applyFirstSpinSelection, clearQueuedTimeouts, finalizeResult, phase, selectedLLabel]);

  const handleSkipToggle = useCallback((checked: boolean) => {
    setSkipAnimationEnabled(checked);
    if (checked && (phase === "rolling1" || phase === "rolling2" || phase === "revealing")) {
      handleSkipAnimation();
    }
  }, [handleSkipAnimation, phase]);

  const spacingX = 110;
  const spacingY = 44;
  const tileSize = 52;
  const maxRowSize = Math.max(...GRID_DEFINITION.map((row) => row.length));
  const gridWidth = (maxRowSize - 1) * spacingX + tileSize + 4;
  const gridHeight = (GRID_DEFINITION.length - 1) * spacingY + tileSize + 4;

  function getTilePos(row: number, col: number) {
    const rowSize = GRID_DEFINITION[row].length;
    const offsetX = (maxRowSize - rowSize) * (spacingX / 2);
    return { x: offsetX + col * spacingX + 2, y: row * spacingY + 2 };
  }

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? el.clientWidth;
      setScale(Math.min(1, width / gridWidth));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [gridWidth]);

  return (
    <div className="flex w-full max-w-[640px] flex-col items-center gap-8">
      <div ref={cardRef} className="relative flex w-full justify-center overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-4 shadow-sm backdrop-blur-sm sm:p-8 md:p-10">
        <button onClick={() => setShowDropRate(true)} className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm transition-all hover:bg-background hover:text-[#145de7]">
          ℹ อัตราดรอป
        </button>
        <div
          style={{
            width: "100%",
            maxWidth: `${gridWidth}px`,
            aspectRatio: `${gridWidth} / ${gridHeight}`,
            position: "relative",
            flexShrink: 0,
          }}
        >
          <div className="absolute left-0 top-0" style={{ width: gridWidth, height: gridHeight, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <AnimatePresence>
              {showBurst && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
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
              const onAura = auraTiles.includes(index);
              const onSelectedLPath = selectedLAuraTiles.includes(index);
              const fade =
                (phase === "rolling1" && (isItem || tile.side === "right") && !onAura) ||
                (phase === "waitSpin2" && isItem && !onSelectedLPath) ||
                (phase === "rolling2" && (isItem || tile.side === "left") && !onSelectedLPath && !onAura) ||
                (phase === "revealing" && isItem && !onL && !onR);

              return (
                <motion.div key={index} className="absolute" style={{ left: pos.x, top: pos.y, width: tileSize, height: tileSize }} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.015, type: "spring", stiffness: 280 }}>
                  <div
                    key={`f-${flipKey[index] ?? 0}`}
                    className={[
                      "relative h-full w-full overflow-hidden rounded-full transition-all duration-150",
                      tierRing[tile.type],
                      isHL && !onBoth ? "scale-110 brightness-125 ring-2 ring-white/80" : "",
                      onBoth ? "scale-115 brightness-125 ring-2 ring-white" : "",
                      isLSel && phase !== "rolling2" && phase !== "revealing" ? "ring-2 ring-violet-400" : "",
                      isRSel ? "ring-2 ring-emerald-400" : "",
                      onL && !onBoth && phase === "revealing" ? "ring-2 ring-violet-400/50" : "",
                      onR && !onBoth && phase === "revealing" ? "ring-2 ring-emerald-400/50" : "",
                      fade ? "opacity-55 grayscale" : "",
                    ].join(" ")}
                    style={(() => {
                      if (auraTiles.includes(index) && !isHL) return { boxShadow: "0 0 10px 3px rgba(0,180,216,0.18), 0 0 18px 6px rgba(0,180,216,0.08)", filter: "brightness(1.12)" };
                      if (selectedLAuraTiles.includes(index) && (phase === "waitSpin2" || phase === "rolling2")) return { boxShadow: "0 0 12px 4px rgba(0,180,216,0.22), 0 0 20px 7px rgba(0,180,216,0.1)", filter: "brightness(1.1)" };
                      return {};
                    })()}
                  >
                    {tile.type === "start" && <div className="flex h-full w-full items-center justify-center bg-zinc-800"><Dices className="h-5 w-5 text-zinc-400" /></div>}
                    {tile.type === "selector" && <div className={["flex h-full w-full items-center justify-center bg-zinc-800", isHL ? "bg-white/90" : "", isLSel && phase !== "rolling2" && phase !== "revealing" ? "bg-violet-500/20" : "", isRSel ? "bg-emerald-500/20" : ""].join(" ")}><span className={["text-[10px] font-bold tracking-wide", isHL ? "text-zinc-900" : "text-zinc-300", isLSel && !isHL ? "text-violet-400" : "", isRSel && !isHL ? "text-emerald-400" : ""].join(" ")}>{tile.label}</span></div>}
                    {isItem && (tile.product?.imageUrl ? <TileImage imageUrl={tile.product.imageUrl} name={tile.product.name} fallback={<div className={`flex h-full w-full items-center justify-center ${tierBg[tile.type]}`}><span className={`h-2 w-2 rounded-full ${tierDot[tile.type] ?? "bg-zinc-500"}`} /></div>} /> : <div className={`flex h-full w-full items-center justify-center ${tierBg[tile.type]}`}>{tile.product ? <span className={`h-2 w-2 rounded-full ${tierDot[tile.type] ?? "bg-zinc-500"}`} /> : <span className="text-[10px] text-zinc-600">-</span>}</div>)}
                    {isHL && <motion.div className="absolute inset-0 rounded-full border border-white/60" animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }} transition={{ duration: 0.65, repeat: Infinity }} />}
                  </div>
                  {isItem && tile.product && <div className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100"><span className="text-[9px] text-zinc-500">{tile.product.name.substring(0, 14)}</span></div>}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-4">
        {maintenance?.enabled && <div className="w-full rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-center shadow-sm"><p className="text-sm font-semibold text-amber-900">ระบบกาชากำลังปิดปรับปรุงชั่วคราว</p><p className="mt-1 text-xs text-amber-800/90">{maintenance.message}</p></div>}
        <div className="min-h-[20px]">
          <AnimatePresence mode="wait">
            {phase === "waitSpin2" && selectedLLabel && <motion.p key="wait2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-xs text-slate-500">เลือกแล้ว <span className="font-semibold text-violet-500">{selectedLLabel}</span>{" - กดสุ่มครั้งที่ 2 เพื่อเลือกแถวขวา"}</motion.p>}
            {phase === "revealing" && selectedLLabel && selectedRLabel && <motion.p key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-xs text-slate-500"><span className="font-semibold text-violet-500">{selectedLLabel}</span>{" × "}<span className="font-semibold text-emerald-500">{selectedRLabel}</span>{" -> "}<span className="font-semibold text-slate-900">จุดตัด</span></motion.p>}
          </AnimatePresence>
        </div>

        <div className="mt-3 flex w-full flex-col items-center">
          <div className="mb-4 space-y-1 text-center">
            <h2 className="text-[18px] font-bold text-[#145de7] md:text-[22px]">สุ่มรางวัลครั้งละ {settings.costAmount.toLocaleString()} {currencyWord}</h2>
            <p className="text-[13px] font-medium text-black md:text-[14px]">* เมื่อกดสุ่มแล้วไม่สามารถขอคืน{currencyWord}ได้ในทุกกรณี *</p>
          </div>
          <div className="mb-5 w-full rounded-xl border border-[#bcd6ff] bg-[#d0e3ff]/70 px-4 py-3 text-center text-sm font-bold text-[#145de7]">ยอด{currencyWord}คงเหลือ: {displayedBalance.toLocaleString()} {currencyWord} <span className="font-normal text-[#145de7]/90">(ตรวจยอดล่าสุดก่อนกดสุ่มได้)</span></div>
          <label className="mb-4 flex cursor-pointer items-center gap-3 self-start rounded-full border border-[#158e4d]/20 bg-[#158e4d]/5 px-3 py-2 text-sm font-medium text-[#158e4d]">
            <input
              type="checkbox"
              checked={skipAnimationEnabled}
              onChange={(event) => handleSkipToggle(event.target.checked)}
              className="h-4 w-4 rounded border-[#158e4d]/40 text-[#158e4d] focus:ring-[#158e4d]"
            />
            ข้ามอนิเมชั่นอัตโนมัติ
          </label>
          <div className="w-full">
            {phase === "idle" && <button onClick={() => void handleFirstSpin()} disabled={isBlocked} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#158e4d] py-3.5 text-[15px] font-bold text-white shadow-[0_16px_32px_-18px_rgba(21,142,77,0.85)] transition-all active:scale-[0.98] hover:bg-[#117640] disabled:cursor-not-allowed disabled:opacity-50 md:py-4 md:text-base"><Gamepad2 className="h-5 w-5" /> {maintenance?.enabled ? "ปิดปรับปรุงชั่วคราว" : "สุ่ม"}</button>}
            {(phase === "rolling1" || phase === "rolling2" || phase === "revealing") && <button disabled className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[#158e4d]/60 py-3.5 text-[15px] font-bold text-white/80 md:py-4 md:text-base"><Loader2 className="h-5 w-5 animate-spin" /> {phase === "rolling1" ? "กำลังสุ่ม..." : phase === "rolling2" ? "กำลังเลือก..." : "กำลังเปิด..."}</button>}
            {phase === "waitSpin2" && <button onClick={() => void handleSecondSpin()} disabled={isBlocked} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#158e4d] py-3.5 text-[15px] font-bold text-white shadow-[0_16px_32px_-18px_rgba(21,142,77,0.85)] transition-all active:scale-[0.98] hover:bg-[#117640] disabled:cursor-not-allowed disabled:opacity-50 md:py-4 md:text-base"><Gamepad2 className="h-5 w-5" /> สุ่มครั้งที่ 2</button>}
          </div>
        </div>
      </div>

      <div className="mt-4 w-full"><GachaRecentFeed refreshKey={historyRefreshKey} /></div>
      <DropRateModal open={showDropRate} onClose={() => setShowDropRate(false)} />
      {phase === "result" && resultProduct && <GachaResultModal product={resultProduct} onClose={reset} onSpinAgain={() => { reset(); queueTimeout(() => void handleFirstSpin(), 200); }} />}
    </div>
  );
}
