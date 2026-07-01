"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { RotateCw, Search } from "lucide-react";
import {
    Command,
    CommandInput,
    CommandList,
    CommandGroup,
    CommandItem,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatCurrencyAmount, type PublicCurrencySettings } from "@/lib/currencySettings";

interface SearchProduct {
    id: string;
    name: string;
    price: number | string;
    discountPrice: number | string | null;
    currency: string | null;
    imageUrl: string | null;
    category: string;
}

interface NavbarSearchProps {
    readonly currencySettings?: PublicCurrencySettings;
}

const MAX_RESULTS = 8;

export function NavbarSearch({ currencySettings }: NavbarSearchProps) {
    const router = useRouter();
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [products, setProducts] = React.useState<SearchProduct[] | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(false);
    // Guards against re-fetching once we already have a list. Reset on
    // failure so the next time the dialog opens we try again.
    const fetchedRef = React.useRef(false);

    const load = React.useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await fetch("/api/products/list");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setProducts(Array.isArray(data) ? data : []);
        } catch {
            // Surface the failure instead of masking it as "no products" —
            // an empty list and a failed request must look different.
            setError(true);
            fetchedRef.current = false;
        } finally {
            setLoading(false);
        }
    }, []);

    // Lazily load the (server-cached) product list the first time the
    // dialog opens, then filter locally — no per-keystroke requests.
    React.useEffect(() => {
        if (!open || fetchedRef.current) return;
        fetchedRef.current = true;
        load();
    }, [open, load]);

    const retry = () => {
        fetchedRef.current = true;
        load();
    };

    // ⌘K / Ctrl+K to open from anywhere.
    React.useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((v) => !v);
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, []);

    const results = React.useMemo(() => {
        const all = products ?? [];
        const q = query.trim().toLowerCase();
        if (!q) {
            // No query yet: show a few items as suggestions.
            return all.slice(0, MAX_RESULTS);
        }
        return all
            .filter(
                (p) =>
                    p.name.toLowerCase().includes(q) ||
                    p.category.toLowerCase().includes(q),
            )
            .slice(0, MAX_RESULTS);
    }, [products, query]);

    const goToProduct = (id: string) => {
        setOpen(false);
        setQuery("");
        router.push(`/product/${id}`);
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="ค้นหาสินค้า"
                className="flex h-9 w-9 items-center justify-center gap-2 rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-primary xl:w-48 xl:justify-start xl:border xl:border-border xl:bg-muted/40 xl:px-3"
            >
                <Search className="h-5 w-5 flex-shrink-0 xl:h-4 xl:w-4" />
                <span className="hidden flex-1 text-left text-sm xl:inline">ค้นหาสินค้า</span>
                <kbd className="hidden rounded border border-border px-1.5 text-[10px] font-medium text-muted-foreground xl:inline">
                    ⌘K
                </kbd>
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    className="top-[12vh] translate-y-0 overflow-hidden p-0 sm:top-[14vh]"
                    showCloseButton={false}
                >
                    <DialogTitle className="sr-only">ค้นหาสินค้า</DialogTitle>
                    <Command shouldFilter={false} className="[&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2">
                        <CommandInput
                            value={query}
                            onValueChange={setQuery}
                            placeholder="ค้นหาสินค้าตามชื่อหรือหมวดหมู่..."
                            className="focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        <CommandList>
                            {loading ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">กำลังโหลด...</p>
                            ) : error ? (
                                <div className="flex flex-col items-center gap-3 py-6">
                                    <p className="text-center text-sm text-muted-foreground">
                                        โหลดรายการสินค้าไม่สำเร็จ
                                    </p>
                                    <button
                                        type="button"
                                        onClick={retry}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-primary"
                                    >
                                        <RotateCw className="h-4 w-4" />
                                        ลองใหม่
                                    </button>
                                </div>
                            ) : results.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">
                                    {query.trim() ? "ไม่พบสินค้าที่ค้นหา" : "ยังไม่มีสินค้า"}
                                </p>
                            ) : (
                                <CommandGroup heading={query.trim() ? "ผลการค้นหา" : "สินค้าแนะนำ"}>
                                    {results.map((p) => {
                                        const price = Number(p.price);
                                        const discount =
                                            p.discountPrice != null ? Number(p.discountPrice) : null;
                                        const hasDiscount = discount != null && discount < price;
                                        const activePrice = hasDiscount ? discount! : price;
                                        return (
                                            <CommandItem
                                                key={p.id}
                                                value={p.id}
                                                onSelect={() => goToProduct(p.id)}
                                                className="cursor-pointer gap-3"
                                            >
                                                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                                                    <Image
                                                        src={p.imageUrl || "/placeholder.jpg"}
                                                        alt={p.name}
                                                        fill
                                                        sizes="40px"
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                                                    <p className="truncate text-xs text-muted-foreground">{p.category}</p>
                                                </div>
                                                <span className="flex-shrink-0 text-sm font-semibold text-primary">
                                                    {formatCurrencyAmount(activePrice, p.currency ?? "THB", currencySettings)}
                                                </span>
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>
                </DialogContent>
            </Dialog>
        </>
    );
}
