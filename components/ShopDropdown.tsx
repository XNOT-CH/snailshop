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
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-primary rounded-lg hover:bg-accent whitespace-nowrap"
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
                <div className="absolute left-0 top-full mt-1.5 w-52 rounded-xl border border-border/60 bg-card shadow-xl shadow-black/10 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* All products link */}
                    <Link
                        href="/shop"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-foreground hover:bg-accent hover:text-primary transition-colors border-b border-border/40 w-full"
                    >
                        <ShoppingBag className="h-4 w-4 text-primary" />
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
                                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-primary transition-colors w-full"
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
