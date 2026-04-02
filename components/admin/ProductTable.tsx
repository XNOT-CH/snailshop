"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, Pencil, Trash2, Eye, Star, Copy, Gem, Package, Timer, Search, LayoutGrid, ChevronLeft, ChevronRight } from "lucide-react";
import { showSuccess, showError, showDeleteConfirm } from "@/lib/swal";
import { cn } from "@/lib/utils";

interface Product {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    category: string;
    currency?: string;
    isSold: boolean;
    isFeatured: boolean;
    stockCount?: number;
    autoDeleteAfterSale?: number | null;
}

interface ProductTableProps {
    products: Product[];
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function ProductTable({ products }: Readonly<ProductTableProps>) {
    const router = useRouter();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingFeatured, setTogglingFeatured] = useState<string | null>(null);
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    // Extract unique categories with counts
    const categoryStats = useMemo(() => {
        const map = new Map<string, number>();
        for (const p of products) {
            map.set(p.category, (map.get(p.category) ?? 0) + 1);
        }
        // Sort alphabetically
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [products]);

    // Filter products
    const filteredProducts = useMemo(() => {
        let list = products;
        if (selectedCategory) {
            list = list.filter((p) => p.category === selectedCategory);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (p) =>
                    p.name.toLowerCase().includes(q) ||
                    p.category.toLowerCase().includes(q)
            );
        }
        return list;
    }, [products, selectedCategory, searchQuery]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / perPage));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedProducts = filteredProducts.slice(
        (safePage - 1) * perPage,
        safePage * perPage
    );

    const handleCategoryChange = (cat: string | null) => {
        setSelectedCategory(cat);
        setCurrentPage(1);
    };

    const handleToggleFeatured = async (id: string, isFeatured: boolean) => {
        setTogglingFeatured(id);
        try {
            const res = await fetch(`/api/admin/products/${id}/featured`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isFeatured }),
            });
            if (res.ok) {
                showSuccess(isFeatured ? "เพิ่มสินค้าแนะนำ" : "ยกเลิกสินค้าแนะนำ");
                router.refresh();
            } else {
                showError("เกิดข้อผิดพลาด");
            }
        } catch (error) {
            console.error("[PRODUCT_FEATURED_TOGGLE]", error);
            showError("เกิดข้อผิดพลาด");
        } finally {
            setTogglingFeatured(null);
        }
    };

    const handleDuplicate = async (id: string) => {
        setDuplicatingId(id);
        try {
            const res = await fetch(`/api/admin/products/${id}/duplicate`, { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                showSuccess(`คัดลอกสำเร็จ: ${data.product.name}`);
                router.refresh();
            } else {
                showError("ไม่สามารถคัดลอกสินค้าได้");
            }
        } catch (error) {
            console.error("[PRODUCT_DUPLICATE]", error);
            showError("เกิดข้อผิดพลาด");
        } finally {
            setDuplicatingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            const res = await fetch(`/api/products/${id}`, {
                method: "DELETE",
            });
            const data = await res.json();

            if (data.success) {
                showSuccess("ลบสินค้าสำเร็จ");
                router.refresh();
            } else {
                showError(data.message || "เกิดข้อผิดพลาด");
            }
        } catch (error) {
            console.error("[PRODUCT_DELETE]", error);
            showError("ไม่สามารถลบสินค้าได้");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-0">
            {/* ── Category Filter + Search Bar ── */}
            <div className="flex flex-col gap-3 mb-4">
                {/* Category pills */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground mr-1">
                        <LayoutGrid className="h-4 w-4" />
                        หมวดหมู่
                    </div>
                    <button
                        onClick={() => handleCategoryChange(null)}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
                            selectedCategory === null
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                        )}
                    >
                        ทั้งหมด ({products.length})
                    </button>
                    {categoryStats.map(([cat, count]) => (
                        <button
                            key={cat}
                            onClick={() => handleCategoryChange(cat)}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
                                selectedCategory === cat
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                    : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                            )}
                        >
                            {cat} ({count})
                        </button>
                    ))}
                </div>

                {/* Search + per page */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <input
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="ค้นหาชื่อสินค้า..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>แสดง</span>
                        <select
                            value={perPage}
                            onChange={(e) => {
                                setPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="border border-border rounded-md px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            {PER_PAGE_OPTIONS.map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                        <span>รายการ</span>
                    </div>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="rounded-lg border overflow-x-auto">
                <Table className="min-w-[700px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">รูป</TableHead>
                            <TableHead>ชื่อสินค้า</TableHead>
                            <TableHead className="hidden md:table-cell">หมวดหมู่</TableHead>
                            <TableHead className="text-right">ราคา</TableHead>
                            <TableHead className="text-center">สต็อก</TableHead>
                            <TableHead className="text-center">สถานะ</TableHead>
                            <TableHead className="text-center hidden md:table-cell">แนะนำ</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                    <Package className="mx-auto h-8 w-8 opacity-30 mb-2" />
                                    {searchQuery ? "ไม่พบสินค้าที่ค้นหา" : "ไม่มีสินค้าในหมวดนี้"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedProducts.map((product) => {
                                let statusBadge;
                                if (product.isSold) {
                                    statusBadge = <Badge variant="destructive">ขายแล้ว</Badge>;
                                } else if (product.stockCount === 0) {
                                    statusBadge = <Badge variant="destructive">หมดสต็อก</Badge>;
                                } else {
                                    statusBadge = <Badge variant="default" className="bg-green-600">พร้อมขาย</Badge>;
                                }

                                const autoDeleteBadge = product.autoDeleteAfterSale ? (
                                    <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300 text-xs">
                                        <Timer className="h-3 w-3" />
                                        {product.autoDeleteAfterSale >= 1440
                                            ? `${Math.round(product.autoDeleteAfterSale / 1440)}ว.`
                                            : product.autoDeleteAfterSale >= 60
                                            ? `${Math.round(product.autoDeleteAfterSale / 60)}ชม.`
                                            : `${product.autoDeleteAfterSale}น.`}
                                    </Badge>
                                ) : null;

                                return (
                                    <TableRow key={product.id}>
                                    <TableCell>
                                        <Avatar className="rounded-lg">
                                            <AvatarImage
                                                src={product.imageUrl || ""}
                                                alt={product.name}
                                                className="object-cover"
                                            />
                                            <AvatarFallback className="rounded-lg bg-muted">
                                                {product.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {product.name}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <Badge variant="secondary">{product.category}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {product.currency === "POINT" ? (
                                            <span className="flex items-center justify-end gap-1 text-purple-600">
                                                <Gem className="h-4 w-4" />
                                                {product.price.toLocaleString()}
                                            </span>
                                        ) : (
                                            <span>฿{product.price.toLocaleString()}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {product.stockCount === undefined ? (
                                            <span className="text-muted-foreground">-</span>
                                        ) : (
                                            <Badge variant={product.stockCount > 0 ? "secondary" : "destructive"} className="gap-1">
                                                <Package className="h-3 w-3" />
                                                {product.stockCount}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            {statusBadge}
                                            {autoDeleteBadge}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center hidden md:table-cell">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleToggleFeatured(product.id, !product.isFeatured)}
                                            disabled={togglingFeatured === product.id}
                                            className={cn("transition-colors", product.isFeatured && "text-amber-500 hover:text-amber-600")}
                                            aria-label={product.isFeatured ? `ยกเลิกสินค้าแนะนำ ${product.name}` : `ตั้ง ${product.name} เป็นสินค้าแนะนำ`}
                                        >
                                            <Star className={cn("h-5 w-5", product.isFeatured && "fill-current")} />
                                        </Button>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" aria-label={`เปิดเมนูจัดการ ${product.name}`}>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/product/${product.id}`} className="flex items-center gap-2 cursor-pointer">
                                                        <Eye className="h-4 w-4" />
                                                        ดูรายละเอียด
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/admin/products/${product.id}/edit`} className="flex items-center gap-2 cursor-pointer">
                                                        <Pencil className="h-4 w-4" />
                                                        แก้ไข
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/admin/products/${product.id}/stock`} className="flex items-center gap-2 cursor-pointer">
                                                        <Package className="h-4 w-4" />
                                                        จัดการสต็อก
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDuplicate(product.id)}
                                                    disabled={duplicatingId === product.id}
                                                    className="cursor-pointer"
                                                >
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    {duplicatingId === product.id ? "กำลังคัดลอก..." : "คัดลอกสินค้า"}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={async () => {
                                                        const confirmed = await showDeleteConfirm(product.name);
                                                        if (confirmed) {
                                                            handleDelete(product.id);
                                                        }
                                                    }}
                                                    disabled={deletingId === product.id}
                                                    className="text-destructive focus:text-destructive cursor-pointer"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    {deletingId === product.id ? "กำลังลบ..." : "ลบ"}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ── Pagination ── */}
            {filteredProducts.length > perPage && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-4 text-sm text-muted-foreground">
                    <span>
                        แสดง {filteredProducts.length === 0 ? 0 : (safePage - 1) * perPage + 1} ถึง{" "}
                        {Math.min(safePage * perPage, filteredProducts.length)} จาก {filteredProducts.length} รายการ
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={safePage === 1}
                            className="p-2 rounded-lg border border-border hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                            .reduce<(number | "...")[]>((acc, p, i, arr) => {
                                if (i > 0 && p - (arr[i - 1] ?? 0) > 1) acc.push("...");
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((p, i) =>
                                p === "..." ? (
                                    <span key={`dots-${i}`} className="px-2 text-muted-foreground/50">
                                        …
                                    </span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => setCurrentPage(p as number)}
                                        className={cn(
                                            "min-w-[36px] h-9 rounded-lg border text-xs font-medium transition",
                                            p === safePage
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "border-border hover:bg-muted"
                                        )}
                                    >
                                        {p}
                                    </button>
                                )
                            )}
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safePage === totalPages}
                            className="p-2 rounded-lg border border-border hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

