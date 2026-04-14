"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

interface ShopControlsProps {
    readonly currentSort: string;
}

export function ShopControls({ currentSort }: Readonly<ShopControlsProps>) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleSortChange = (val: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("sort", val);
        params.delete("page");
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const sortOptions = [
        { value: "latest", label: "ล่าสุด" },
        { value: "popular", label: "ยอดนิยม" },
        { value: "best_selling", label: "ขายดี" },
        { value: "price_asc", label: "ราคา ↑" },
        { value: "price_desc", label: "ราคา ↓" },
    ];

    const activeSort = currentSort === "all" ? "latest" : currentSort;

    return (
        <div className="flex w-full min-w-0">
            <div className="pb-1">
                <div className="flex flex-wrap items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    {sortOptions.map((opt) => {
                        const isActive = activeSort === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleSortChange(opt.value)}
                                className={`inline-flex items-center h-8 px-3 rounded-full text-xs font-medium transition-all duration-150 whitespace-nowrap flex-shrink-0 ${
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
