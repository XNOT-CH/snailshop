"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";

interface ShopControlsProps {
    readonly currentPage: number;
    readonly totalPages: number;
    readonly currentSort: string;
}

export function ShopControls({ currentPage, totalPages, currentSort }: Readonly<ShopControlsProps>) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const createQueryString = (name: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(name, value);
        return params.toString();
    };

    const handleSortChange = (val: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("sort", val);
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handlePageChange = (newPage: number) => {
        router.push(`${pathname}?${createQueryString("page", newPage.toString())}`, { scroll: false });
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
        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            {/* ─── Sort pill bar ─── */}
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

            {/* ─── Pagination ─── */}
            <div className="flex flex-shrink-0 items-center justify-between gap-2 sm:justify-end">
                <span className="text-xs text-muted-foreground tabular-nums">
                    <span className="font-semibold text-foreground">{currentPage}</span>
                    <span className="opacity-40"> / {totalPages}</span>
                </span>
                <div className="flex gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full border-border bg-card hover:bg-accent hover:text-primary transition-colors disabled:opacity-30"
                        disabled={currentPage <= 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                        aria-label="หน้าก่อนหน้า"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full border-border bg-card hover:bg-accent hover:text-primary transition-colors disabled:opacity-30"
                        disabled={currentPage >= totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                        aria-label="หน้าถัดไป"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

        </div>
    );
}
