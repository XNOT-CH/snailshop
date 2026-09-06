"use client";

import { useMemo, useState } from "react";
import {
    ArrowDownAZ,
    ArrowUpAZ,
    ChevronLeft,
    ChevronRight,
    Copy,
    Download,
    Inbox,
    MoreVertical,
    RefreshCw,
    Search,
    Trash2,
    Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 10;

/**
 * Items carry their stored index, not just their text. Every row action refers
 * to a position in secretData, so once the list is searched or re-sorted a bare
 * array index would point at the wrong item — the same trap the policy manager
 * had to lock drag-and-drop for, except here the real index is available.
 */
export interface StockListItem {
    readonly index: number;
    readonly text: string;
}

interface StockListCardProps {
    readonly items: StockListItem[];
    readonly canEdit: boolean;
    readonly isBusy: boolean;
    readonly onDelete: (index: number) => void;
    readonly onMoveToFront: (index: number) => void;
    readonly onClearAll: () => void;
    readonly onExport: () => void;
    readonly onRefresh: () => void;
}

const toolbarButton = "h-9 w-9 rounded-xl border-border";

export function StockListCard({
    items,
    canEdit,
    isBusy,
    onDelete,
    onMoveToFront,
    onClearAll,
    onExport,
    onRefresh,
}: StockListCardProps) {
    const [query, setQuery] = useState("");
    const [sortByText, setSortByText] = useState(false);
    const [ascending, setAscending] = useState(true);
    const [page, setPage] = useState(1);

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();
        const filtered = needle
            ? items.filter((item) => item.text.toLowerCase().includes(needle))
            : items;

        const sorted = [...filtered].sort((a, b) =>
            sortByText ? a.text.localeCompare(b.text, "th") : a.index - b.index,
        );

        return ascending ? sorted : sorted.reverse();
    }, [items, query, sortByText, ascending]);

    const totalPages = Math.max(1, Math.ceil(visible.length / ITEMS_PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
    const pageItems = visible.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    const showingFrom = visible.length === 0 ? 0 : startIndex + 1;
    const showingTo = Math.min(startIndex + ITEMS_PER_PAGE, visible.length);

    const copyItem = (text: string) => {
        void navigator.clipboard?.writeText(text);
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Warehouse className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-bold text-primary">รายการสต็อก</h2>
                    <p className="truncate text-xs text-muted-foreground">สต็อกคงเหลือของสินค้า</p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onClearAll}
                    disabled={!canEdit || isBusy || items.length === 0}
                    className="gap-2 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                    <Trash2 className="h-4 w-4" />
                    ล้างสต็อกทั้งหมด
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
                <div className="relative min-w-48 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setPage(1);
                        }}
                        placeholder="ค้นหา..."
                        className="h-9 rounded-xl pl-9"
                    />
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={toolbarButton}
                    onClick={() => {
                        setSortByText((prev) => !prev);
                        setPage(1);
                    }}
                    title={sortByText ? "เรียงตามลำดับในสต็อก" : "เรียงตามตัวอักษร"}
                >
                    <ArrowDownAZ className={cn("h-4 w-4", sortByText && "text-primary")} />
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={toolbarButton}
                    onClick={() => {
                        setAscending((prev) => !prev);
                        setPage(1);
                    }}
                    title={ascending ? "สลับเป็นเรียงจากหลังไปหน้า" : "สลับเป็นเรียงจากหน้าไปหลัง"}
                >
                    <ArrowUpAZ className={cn("h-4 w-4 transition-transform", !ascending && "rotate-180")} />
                </Button>
                <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={toolbarButton}
                    onClick={onExport}
                    disabled={!canEdit || items.length === 0}
                    title="ส่งออกเป็นไฟล์ .txt"
                >
                    <Download className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={toolbarButton}
                    onClick={onRefresh}
                    disabled={isBusy}
                    title="โหลดสต็อกใหม่จากเซิร์ฟเวอร์"
                >
                    <RefreshCw className={cn("h-4 w-4", isBusy && "animate-spin")} />
                </Button>
            </div>

            {pageItems.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-5 py-14 text-muted-foreground">
                    <Inbox className="h-10 w-10" />
                    <p className="text-sm">
                        {items.length === 0 ? "ไม่พบรายการสต็อก" : "ไม่พบรายการที่ค้นหา"}
                    </p>
                </div>
            ) : (
                <ul className="divide-y divide-border">
                    {pageItems.map((item) => (
                        <li key={item.index} className="flex items-start gap-3 px-5 py-3">
                            <span className="mt-0.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 px-1.5 text-xs font-semibold text-muted-foreground">
                                {item.index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="whitespace-pre-wrap break-all font-mono text-sm text-foreground">
                                    {item.text}
                                </p>
                                {/* Position 0 is what takeFirstStock hands the next buyer, so
                                    it is worth naming — but only while the list is in stored
                                    order, otherwise "first" is not what is on top. */}
                                {item.index === 0 && !sortByText && ascending ? (
                                    <span className="mt-1 inline-block rounded-md bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                                        จะถูกส่งก่อน
                                    </span>
                                ) : null}
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 rounded-xl"
                                        aria-label={`ตัวเลือกของรายการที่ ${item.index + 1}`}
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => copyItem(item.text)}>
                                        <Copy className="mr-2 h-4 w-4" />
                                        คัดลอกข้อความ
                                    </DropdownMenuItem>
                                    {canEdit && item.index !== 0 ? (
                                        <DropdownMenuItem onClick={() => onMoveToFront(item.index)}>
                                            <ArrowUpAZ className="mr-2 h-4 w-4" />
                                            ย้ายไปบนสุด
                                        </DropdownMenuItem>
                                    ) : null}
                                    {canEdit ? (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => onDelete(item.index)}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                ลบรายการนี้
                                            </DropdownMenuItem>
                                        </>
                                    ) : null}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </li>
                    ))}
                </ul>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
                <p className="text-xs text-muted-foreground">
                    แสดง {showingFrom} ถึง {showingTo} จาก {visible.length} รายการ
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={cn(toolbarButton, "disabled:opacity-50")}
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={safePage <= 1}
                        aria-label="หน้าก่อนหน้า"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-16 text-center text-xs text-muted-foreground">
                        {safePage} จาก {totalPages}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={cn(toolbarButton, "disabled:opacity-50")}
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={safePage >= totalPages}
                        aria-label="หน้าถัดไป"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
