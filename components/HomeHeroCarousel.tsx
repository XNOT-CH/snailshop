"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroBannerItem } from "@/components/HeroBanner";

const ROTATE_MS = 5000;
const SWIPE_MIN_PX = 40;
// Slides sit this far either side of the centre one. Fewer than five would let
// the slide that wraps from the far left to the far right cross the screen.
const MIN_TRACK = 5;
const GAP_PX = 16;

// Centre banner whole at 8:3, its neighbours peeking in dimmed at both sides,
// rotating on its own. Every slide is positioned by its distance from the
// active one, so the loop never runs out: the slide leaving one end jumps to
// the other off-screen, without a transition, and slides back in from there.
export function HomeHeroCarousel({ banners }: Readonly<{ banners: HeroBannerItem[] }>) {
    const count = banners.length;
    const track = count > 1 ? Array.from({ length: Math.ceil(MIN_TRACK / count) * count }, (_, i) => banners[i % count]) : banners;
    // `from` is the slide shown before the last move, to tell which slides jumped.
    const [{ active, from }, setSlide] = useState({ active: 0, from: 0 });
    const [paused, setPaused] = useState(false);
    const touchStartX = useRef<number | null>(null);
    const rotates = count > 1;

    // Restarted on every change of slide, so a manual pick gets a full interval.
    useEffect(() => {
        if (!rotates || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const timer = setTimeout(() => setSlide((s) => ({ active: (s.active + 1) % track.length, from: s.active })), ROTATE_MS);
        return () => clearTimeout(timer);
    }, [active, paused, rotates, track.length]);

    const step = (delta: number) => setSlide((s) => ({ active: (s.active + delta + track.length) % track.length, from: s.active }));
    // Signed distance from the active slide, wrapped into -half..half.
    const offset = (index: number, from: number) => {
        const half = Math.floor(track.length / 2);
        return ((index - from + track.length + half) % track.length) - half;
    };

    return (
        <div
            className="group relative ml-[calc(50%-50vw)] w-screen [--slide-w:88vw] md:[--slide-w:min(72vw,720px)]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX; }}
            onTouchEnd={(event) => {
                if (touchStartX.current === null) return;
                const dx = event.changedTouches[0].clientX - touchStartX.current;
                touchStartX.current = null;
                if (rotates && Math.abs(dx) >= SWIPE_MIN_PX) step(dx < 0 ? 1 : -1);
            }}
        >
            {/* The outer edges fade into the band, so the neighbours trail off
                toward the screen sides instead of ending in a hard cut. */}
            <div className="relative h-[calc(var(--slide-w)*3/8)] overflow-hidden md:[mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
                {track.map((banner, index) => {
                    const rel = offset(index, active);
                    const jumped = Math.abs(rel - offset(index, from)) > 1;
                    const isActive = rel === 0;
                    return (
                        // Neighbours step to themselves on click; keyboard users have
                        // the arrows and dots, so the slides stay out of the tab order.
                        <div
                            key={`${banner.id}-${index}`}
                            aria-hidden={!isActive}
                            onClick={() => !isActive && step(rel)}
                            className={`group/slide absolute left-1/2 top-0 aspect-[8/3] w-[var(--slide-w)] overflow-hidden rounded-2xl bg-muted ${
                                jumped ? "" : "transition-[translate,scale] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                            } ${isActive ? "cursor-default" : "scale-[0.92] cursor-pointer"}`}
                            style={{ translate: `calc(-50% + ${rel} * (var(--slide-w) + ${GAP_PX}px)) 0` }}
                        >
                            <Image
                                src={banner.image}
                                alt={banner.title}
                                fill
                                sizes="(max-width: 768px) 88vw, 720px"
                                priority={index === 0}
                                className="object-cover"
                            />
                            {(banner.title || banner.subtitle) && (
                                <span className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-black/70 via-black/30 to-transparent px-5 text-left sm:px-12">
                                    {banner.title && <span className="max-w-[70%] text-base font-bold text-white drop-shadow-lg sm:text-3xl">{banner.title}</span>}
                                    {banner.subtitle && <span className="mt-1 max-w-[75%] text-xs text-white/90 drop-shadow sm:mt-3 sm:text-lg">{banner.subtitle}</span>}
                                </span>
                            )}
                            {/* Neighbours are dimmed with a dark veil rather than
                                transparency, which washed out on the light band. */}
                            <span
                                aria-hidden="true"
                                className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-700 ease-out ${
                                    isActive ? "opacity-0" : "opacity-[0.55] group-hover/slide:opacity-[0.35]"
                                }`}
                            />
                        </div>
                    );
                })}

                {rotates && (
                    <>
                        <button
                            type="button"
                            onClick={() => step(-1)}
                            aria-label="ป้ายก่อนหน้า"
                            className="absolute left-[calc(50%-var(--slide-w)/2+12px)] top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-[opacity,background-color] duration-300 hover:bg-black/60 focus-visible:opacity-100 group-hover:opacity-100 md:flex"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => step(1)}
                            aria-label="ป้ายถัดไป"
                            className="absolute right-[calc(50%-var(--slide-w)/2+12px)] top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-[opacity,background-color] duration-300 hover:bg-black/60 focus-visible:opacity-100 group-hover:opacity-100 md:flex"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                        {/* Dots sit on the centre banner's bottom edge. */}
                        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 sm:bottom-3">
                            {banners.map((banner, index) => {
                                const isCurrent = active % count === index;
                                return (
                                    <button
                                        key={banner.id}
                                        type="button"
                                        onClick={() => {
                                            // Shortest way round to the picked banner.
                                            const ahead = (index - (active % count) + count) % count;
                                            step(ahead > count / 2 ? ahead - count : ahead);
                                        }}
                                        aria-label={`ป้ายที่ ${index + 1}`}
                                        aria-current={isCurrent}
                                        className="flex size-4 items-center justify-center"
                                    >
                                        <span className={`block size-2 rounded-full shadow-[0_0_2px_rgba(0,0,0,0.5)] transition-colors duration-500 ${isCurrent ? "bg-primary" : "bg-white/70"}`} />
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

        </div>
    );
}
