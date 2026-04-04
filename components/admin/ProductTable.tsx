"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { showConfirm, showError, showSuccess } from "@/lib/swal";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Gem,
  LayoutGrid,
  MoreHorizontal,
  Package,
  Pencil,
  Search,
  Star,
  Timer,
  Trash2,
} from "lucide-react";

interface Product {
  id: string | number;
  name: string;
  description?: string | null;
  price: number;
  discountPrice?: number | null;
  imageUrl: string | null;
  category: string | null;
  isFeatured: boolean;
  isSold: boolean;
  stockCount?: number | null;
  autoDeleteAfterSale?: number | null;
  currency?: "THB" | "POINT" | null;
}

interface ProductTableProps {
  products: Product[];
}

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50] as const;

function formatAutoDelete(minutes?: number | null) {
  if (!minutes || minutes <= 0) {
    return null;
  }

  if (minutes % 10080 === 0) {
    return `${minutes / 10080} สัปดาห์`;
  }

  if (minutes % 1440 === 0) {
    return `${minutes / 1440} วัน`;
  }

  if (minutes % 60 === 0) {
    return `${minutes / 60} ชั่วโมง`;
  }

  return `${minutes} นาที`;
}

export default function ProductTable({ products }: ProductTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [loadingId, setLoadingId] = useState<string | number | null>(null);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(products.map((product) => product.category).filter(Boolean) as string[])
    );

    return ["ทั้งหมด", ...uniqueCategories];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "ทั้งหมด" || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const handleToggleFeatured = async (productId: string | number, currentFeatured: boolean) => {
    setLoadingId(productId);

    try {
      const response = await fetch(`/api/admin/products/${productId}/featured`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isFeatured: !currentFeatured }),
      });

      if (!response.ok) {
        throw new Error("ไม่สามารถอัปเดตสินค้าแนะนำได้");
      }

      showSuccess(
        currentFeatured ? "นำสินค้าออกจากสินค้าแนะนำแล้ว" : "เพิ่มสินค้าไปยังสินค้าแนะนำแล้ว"
      );
      router.refresh();
    } catch (error) {
      console.error(error);
      showError("ไม่สามารถอัปเดตสินค้าแนะนำได้");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDuplicate = async (productId: string | number) => {
    setLoadingId(productId);

    try {
      const response = await fetch(`/api/admin/products/${productId}/duplicate`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("ไม่สามารถคัดลอกสินค้าได้");
      }

      showSuccess("คัดลอกสินค้าเรียบร้อยแล้ว");
      router.refresh();
    } catch (error) {
      console.error(error);
      showError("ไม่สามารถคัดลอกสินค้าได้");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (productId: string | number, productName: string) => {
    const confirmed = await showConfirm(
      "ลบสินค้า",
      `คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า \"${productName}\"? การดำเนินการนี้ไม่สามารถย้อนกลับได้`
    );

    if (!confirmed) {
      return;
    }

    setLoadingId(productId);

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("ไม่สามารถลบสินค้าได้");
      }

      showSuccess("ลบสินค้าเรียบร้อยแล้ว");
      router.refresh();
    } catch (error) {
      console.error(error);
      showError("ไม่สามารถลบสินค้าได้");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <LayoutGrid className="h-4 w-4 text-slate-400" />
            <span>หมวดหมู่</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const isActive = selectedCategory === category;
              const count =
                category === "ทั้งหมด"
                  ? products.length
                  : products.filter((product) => product.category === category).length;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(category);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                    isActive
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  )}
                >
                  <span>{category}</span>
                  <span className={cn("text-xs", isActive ? "text-blue-100" : "text-slate-400")}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-[260px] flex-1 sm:min-w-[320px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อสินค้า..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 text-sm text-slate-500">
            <span>แสดง</span>
            <select
              value={itemsPerPage}
              onChange={(event) => {
                setItemsPerPage(Number(event.target.value));
                setCurrentPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span>รายการ</span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="w-20 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                รูป
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                ชื่อสินค้า
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                หมวดหมู่
              </TableHead>
              <TableHead className="text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                ราคา
              </TableHead>
              <TableHead className="text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                สต็อก
              </TableHead>
              <TableHead className="text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                สถานะ
              </TableHead>
              <TableHead className="text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                แนะนำ
              </TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                จัดการ
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center text-slate-500">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                    <div className="rounded-full bg-slate-100 p-3 text-slate-400">
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-700">ไม่พบสินค้าที่ตรงเงื่อนไข</p>
                      <p className="mt-1 text-sm text-slate-500">ลองค้นหาด้วยชื่ออื่นหรือเปลี่ยนหมวดหมู่ที่เลือก</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedProducts.map((product, index) => {
                const hasDiscount =
                  product.discountPrice !== null &&
                  product.discountPrice !== undefined &&
                  product.discountPrice < product.price;
                const displayStockCount = product.stockCount ?? (product.isSold ? 0 : 1);
                const autoDeleteLabel = formatAutoDelete(product.autoDeleteAfterSale);
                const isPointProduct = product.currency === "POINT";
                const activePrice = hasDiscount ? product.discountPrice : product.price;

                return (
                  <TableRow
                    key={product.id}
                    className={cn(
                      "border-slate-200 transition hover:bg-blue-50/40",
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/35"
                    )}
                  >
                    <TableCell>
                      <Avatar className="h-11 w-11 rounded-xl border border-slate-200 shadow-sm">
                        <AvatarImage src={product.imageUrl || undefined} alt={product.name} className="object-cover" />
                        <AvatarFallback className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 text-xs font-semibold text-blue-700">
                          {product.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{product.name}</p>
                        <p className="line-clamp-1 max-w-[280px] text-sm text-slate-500">
                          {product.description || "ไม่มีรายละเอียดเพิ่มเติม"}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary" className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                        {product.category || "ทั่วไป"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5 text-base font-semibold text-slate-900">
                          {isPointProduct ? <Gem className="h-4 w-4 text-violet-500" /> : null}
                          <span>
                            {isPointProduct
                              ? Number(activePrice).toLocaleString()
                              : `฿${Number(activePrice).toLocaleString()}`}
                          </span>
                        </div>
                        {hasDiscount ? (
                          <>
                            <p className="text-xs text-slate-400 line-through">
                              {isPointProduct
                                ? `${Number(product.price).toLocaleString()} พอยท์`
                                : `฿${Number(product.price).toLocaleString()}`}
                            </p>
                            <Badge className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">
                              ลดราคา
                            </Badge>
                          </>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className="inline-flex items-center gap-1 rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700"
                      >
                        <Package className="h-3.5 w-3.5 text-slate-400" />
                        {displayStockCount}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Badge
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                            product.isSold
                              ? "bg-rose-100 text-rose-700 hover:bg-rose-100"
                              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          )}
                        >
                          {product.isSold ? "ขายแล้ว" : "พร้อมขาย"}
                        </Badge>
                        {autoDeleteLabel ? (
                          <Badge
                            variant="outline"
                            className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700"
                          >
                            <Timer className="mr-1 h-3 w-3" />
                            {autoDeleteLabel}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={loadingId === product.id}
                        onClick={() => handleToggleFeatured(product.id, product.isFeatured)}
                        className={cn(
                          "mx-auto rounded-full border transition",
                          product.isFeatured
                            ? "border-amber-200 bg-amber-50 text-amber-500 hover:bg-amber-100"
                            : "border-transparent text-slate-400 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-600"
                        )}
                      >
                        <Star className={cn("h-4 w-4", product.isFeatured ? "fill-current" : "")} />
                      </Button>
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="rounded-full border border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href={`/product/${product.id}`} className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              ดูสินค้า
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/products/${product.id}/edit`} className="flex items-center gap-2">
                              <Pencil className="h-4 w-4" />
                              แก้ไขสินค้า
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(product.id)}
                            disabled={loadingId === product.id}
                            className="flex items-center gap-2"
                          >
                            <Copy className="h-4 w-4" />
                            คัดลอกสินค้า
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(product.id, product.name)}
                            disabled={loadingId === product.id}
                            className="flex items-center gap-2 text-rose-600 focus:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                            ลบสินค้า
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

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            แสดง {filteredProducts.length === 0 ? 0 : startIndex + 1} ถึง {Math.min(startIndex + itemsPerPage, filteredProducts.length)} จาก {filteredProducts.length} รายการ
          </p>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safeCurrentPage === 1}
              className="h-9 w-9 rounded-xl border-slate-200 bg-white disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .slice(Math.max(0, safeCurrentPage - 2), Math.max(3, safeCurrentPage + 1))
                .map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    type="button"
                    variant={pageNumber === safeCurrentPage ? "default" : "outline"}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={cn(
                      "h-9 min-w-9 rounded-xl px-3",
                      pageNumber === safeCurrentPage
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {pageNumber}
                  </Button>
                ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={safeCurrentPage === totalPages}
              className="h-9 w-9 rounded-xl border-slate-200 bg-white disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
