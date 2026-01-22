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
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

interface Product {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    category: string;
    isSold: boolean;
}

interface ProductTableProps {
    products: Product[];
}

export function ProductTable({ products }: ProductTableProps) {
    const router = useRouter();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            const res = await fetch(`/api/products/${id}`, {
                method: "DELETE",
            });
            const data = await res.json();

            if (data.success) {
                toast.success("ลบสินค้าสำเร็จ");
                router.refresh();
            } else {
                toast.error(data.message || "เกิดข้อผิดพลาด");
            }
        } catch (error) {
            toast.error("ไม่สามารถลบสินค้าได้");
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
