"use client";

import { useState } from "react";
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
import { MoreHorizontal, Pencil, Trash2, Eye, Star, Copy, Gem, Package, Timer } from "lucide-react";
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

export function ProductTable({ products }: Readonly<ProductTableProps>) {
    const router = useRouter();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingFeatured, setTogglingFeatured] = useState<string | null>(null);
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

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
                    {products.map((product) => {
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
                                >
                                    <Star className={cn("h-5 w-5", product.isFeatured && "fill-current")} />
                                </Button>
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
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
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
