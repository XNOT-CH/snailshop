"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ShoppingBag, ChevronDown, Tag } from "lucide-react";

interface ShopDropdownProps {
    readonly categories: readonly string[];
}

export function ShopDropdown({ categories }: Readonly<ShopDropdownProps>) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-white/[0.06] hover:text-foreground whitespace-nowrap"
                aria-expanded={open}
                aria-haspopup="true"
            >
                <ShoppingBag className="h-4 w-4 flex-shrink-0" />
                ร้านค้า
                <ChevronDown
                    className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                <div className="absolute left-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-white/8 bg-card/95 shadow-2xl shadow-black/30 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* All products link */}
                    <Link
                        href="/shop"
                        onClick={() => setOpen(false)}
                        className="flex w-full items-center gap-2.5 border-b border-white/6 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.05]"
                    >
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                        ทั้งหมด
                    </Link>

                    {/* Category links */}
                    <div className="py-1">
                        {categories.length === 0 ? (
                            <p className="px-4 py-2 text-xs text-muted-foreground">ไม่มีหมวดหมู่</p>
                        ) : (
                            categories.map((cat) => (
                                <Link
                                    key={cat}
                                    href={`/shop?category=${encodeURIComponent(cat)}`}
                                    onClick={() => setOpen(false)}
                                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
                                >
                                    <Tag className="h-3.5 w-3.5 flex-shrink-0" />
                                    {cat}
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
