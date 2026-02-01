"use client";

import { useState } from "react";
import Image from "next/image";
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, Pencil, Trash2, Eye, Star, Copy } from "lucide-react";
import { showSuccess, showError, showDeleteConfirm } from "@/lib/swal";
import { cn } from "@/lib/utils";

interface Product {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    category: string;
    isSold: boolean;
    isFeatured: boolean;
}

interface ProductTableProps {
    products: Product[];
}

export function ProductTable({ products }: ProductTableProps) {
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
            showError("ไม่สามารถลบสินค้าได้");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">รูป</TableHead>
                        <TableHead>ชื่อสินค้า</TableHead>
                        <TableHead>หมวดหมู่</TableHead>
                        <TableHead className="text-right">ราคา</TableHead>
                        <TableHead className="text-center">สถานะ</TableHead>
                        <TableHead className="text-center">แนะนำ</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map((product) => (
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
                            <TableCell>
                                <Badge variant="secondary">{product.category}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                ฿{product.price.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center">
                                {product.isSold ? (
                                    <Badge variant="destructive">ขายแล้ว</Badge>
                                ) : (
                                    <Badge variant="default" className="bg-green-600">พร้อมขาย</Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-center">
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
                                        <DropdownMenuItem
                                            onClick={() => handleDuplicate(product.id)}
                                            disabled={duplicatingId === product.id}
                                            className="cursor-pointer"
                                        >
                                            <Copy className="h-4 w-4 mr-2" />
                                            {duplicatingId === product.id ? "กำลังคัดลอก..." : "คัดลอกสินค้า"}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem
                                                    onSelect={(e) => e.preventDefault()}
                                                    className="text-destructive focus:text-destructive cursor-pointer"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    ลบ
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>ยืนยันการลบ?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        คุณต้องการลบ "{product.name}" ใช่หรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDelete(product.id)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        {deletingId === product.id ? "กำลังลบ..." : "ลบ"}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
