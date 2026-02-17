"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Ticket, Loader2, Trash2, Pencil, Copy } from "lucide-react";
import { showDeleteConfirm, showSuccess, showError } from "@/lib/swal";

interface PromoCode {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    minPurchase: number | null;
    maxDiscount: number | null;
    usageLimit: number | null;
    usedCount: number;
    startsAt: string;
    expiresAt: string | null;
    isActive: boolean;
    createdAt: string;
}

export default function AdminPromoCodesPage() {
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        code: "",
        discountType: "PERCENTAGE",
        discountValue: "",
        minPurchase: "",
        maxDiscount: "",
        usageLimit: "",
        expiresAt: "",
        isActive: true,
    });

    const fetchPromoCodes = useCallback(async () => {
        try {
            const response = await fetch("/api/admin/promo-codes");
            const data = await response.json();
            if (data.success) {
                setPromoCodes(data.data);
            }
        } catch (error) {
            showError("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPromoCodes();
    }, [fetchPromoCodes]);

    const resetForm = () => {
        setFormData({
            code: "",
            discountType: "PERCENTAGE",
            discountValue: "",
            minPurchase: "",
            maxDiscount: "",
            usageLimit: "",
            expiresAt: "",
            isActive: true,
        });
        setEditingCode(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (promoCode: PromoCode) => {
        setEditingCode(promoCode);
        setFormData({
            code: promoCode.code,
            discountType: promoCode.discountType,
            discountValue: promoCode.discountValue.toString(),
            minPurchase: promoCode.minPurchase?.toString() || "",
            maxDiscount: promoCode.maxDiscount?.toString() || "",
            usageLimit: promoCode.usageLimit?.toString() || "",
            expiresAt: promoCode.expiresAt ? promoCode.expiresAt.split("T")[0] : "",
            isActive: promoCode.isActive,
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const url = editingCode
                ? `/api/admin/promo-codes/${editingCode.id}`
                : "/api/admin/promo-codes";
            const method = editingCode ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                showSuccess(editingCode ? "แก้ไขสำเร็จ!" : "สร้างโค้ดส่วนลดสำเร็จ!");
                setIsDialogOpen(false);
                resetForm();
                fetchPromoCodes();
            } else {
                showError(data.message || "เกิดข้อผิดพลาด");
            }
        } catch (error) {
            showError("ไม่สามารถบันทึกได้");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await showDeleteConfirm("โค้ดนี้");
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/admin/promo-codes/${id}`, {
                method: "DELETE",
            });
            const data = await response.json();

            if (data.success) {
                showSuccess("ลบโค้ดสำเร็จ!");
                fetchPromoCodes();
            } else {
                showError(data.message || "ไม่สามารถลบได้");
            }
        } catch (error) {
            showError("เกิดข้อผิดพลาด");
        }
    };

    const handleToggleActive = async (promoCode: PromoCode) => {
        try {
            const response = await fetch(`/api/admin/promo-codes/${promoCode.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !promoCode.isActive }),
            });
            const data = await response.json();

            if (data.success) {
                showSuccess(promoCode.isActive ? "ปิดใช้งานแล้ว" : "เปิดใช้งานแล้ว");
                fetchPromoCodes();
            }
        } catch (error) {
            showError("เกิดข้อผิดพลาด");
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        showSuccess(`คัดลอก ${code} แล้ว!`);
    };

    const formatDiscount = (code: PromoCode) => {
        if (code.discountType === "PERCENTAGE") {
            return `${code.discountValue}%`;
        }
        return `฿${code.discountValue.toLocaleString()}`;
    };

    const isExpired = (expiresAt: string | null) => {
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        โค้ดส่วนลด <span className="text-3xl">🎟️</span>
                    </h1>
                    <p className="text-muted-foreground">จัดการโค้ดโปรโมชั่นและส่วนลด</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenCreate} className="gap-2">
                            <Plus className="h-4 w-4" />
                            สร้างโค้ดใหม่
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {editingCode ? "แก้ไขโค้ดส่วนลด" : "สร้างโค้ดส่วนลดใหม่"}
                            </DialogTitle>
                            <DialogDescription>
                                กรอกรายละเอียดโค้ดส่วนลด
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Code */}
                            <div className="space-y-2">
                                <Label htmlFor="code">โค้ด *</Label>
                                <Input
                                    id="code"
                                    placeholder="เช่น SALE50"
                                    value={formData.code}
                                    onChange={(e) =>
                                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                                    }
                                    required
                                />
                            </div>

                            {/* Discount Type & Value */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>ประเภทส่วนลด</Label>
                                    <Select
                                        value={formData.discountType}
                                        onValueChange={(value) =>
                                            setFormData({ ...formData, discountType: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PERCENTAGE">เปอร์เซ็นต์ (%)</SelectItem>
                                            <SelectItem value="FIXED">จำนวนเงิน (฿)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="discountValue">
                                        {formData.discountType === "PERCENTAGE" ? "เปอร์เซ็นต์ *" : "จำนวนเงิน *"}
                                    </Label>
                                    <Input
                                        id="discountValue"
                                        type="number"
                                        placeholder={formData.discountType === "PERCENTAGE" ? "10" : "50"}
                                        value={formData.discountValue}
                                        onChange={(e) =>
                                            setFormData({ ...formData, discountValue: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                            </div>

                            {/* Min Purchase & Max Discount */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="minPurchase">ยอดขั้นต่ำ (฿)</Label>
                                    <Input
                                        id="minPurchase"
                                        type="number"
                                        placeholder="ไม่บังคับ"
                                        value={formData.minPurchase}
                                        onChange={(e) =>
                                            setFormData({ ...formData, minPurchase: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="maxDiscount">ส่วนลดสูงสุด (฿)</Label>
                                    <Input
                                        id="maxDiscount"
                                        type="number"
                                        placeholder="ไม่จำกัด"
                                        value={formData.maxDiscount}
                                        onChange={(e) =>
                                            setFormData({ ...formData, maxDiscount: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            {/* Usage Limit & Expires */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="usageLimit">จำกัดการใช้</Label>
                                    <Input
                                        id="usageLimit"
                                        type="number"
                                        placeholder="ไม่จำกัด"
                                        value={formData.usageLimit}
                                        onChange={(e) =>
                                            setFormData({ ...formData, usageLimit: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="expiresAt">หมดอายุ</Label>
                                    <Input
                                        id="expiresAt"
                                        type="date"
                                        value={formData.expiresAt}
                                        onChange={(e) =>
                                            setFormData({ ...formData, expiresAt: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            {/* Active Toggle */}
                            <div className="flex items-center justify-between">
                                <Label>เปิดใช้งาน</Label>
                                <Switch
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, isActive: checked })
                                    }
                                />
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={isSaving} className="w-full">
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            กำลังบันทึก...
                                        </>
                                    ) : editingCode ? (
                                        "บันทึกการแก้ไข"
                                    ) : (
                                        "สร้างโค้ด"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Promo Codes Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Ticket className="h-5 w-5" />
                        รายการโค้ดทั้งหมด ({promoCodes.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {promoCodes.length === 0 ? (
                        <div className="py-12 text-center">
                            <Ticket className="mx-auto h-12 w-12 text-muted-foreground/50" />
                            <p className="mt-4 text-muted-foreground">ยังไม่มีโค้ดส่วนลด</p>
                            <Button onClick={handleOpenCreate} className="mt-4 gap-2">
                                <Plus className="h-4 w-4" />
                                สร้างโค้ดแรก
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>โค้ด</TableHead>
                                    <TableHead>ส่วนลด</TableHead>
                                    <TableHead>การใช้งาน</TableHead>
                                    <TableHead>หมดอายุ</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead className="text-right">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {promoCodes.map((code) => (
                                    <TableRow key={code.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <code className="bg-muted px-2 py-1 rounded font-mono text-sm">
                                                    {code.code}
                                                </code>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => copyCode(code.code)}
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {formatDiscount(code)}
                                            </Badge>
                                            {code.minPurchase && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    ขั้นต่ำ ฿{code.minPurchase.toLocaleString()}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium">{code.usedCount}</span>
                                            {code.usageLimit && (
                                                <span className="text-muted-foreground">
                                                    /{code.usageLimit}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {code.expiresAt ? (
                                                <span className={isExpired(code.expiresAt) ? "text-red-500" : ""}>
                                                    {new Date(code.expiresAt).toLocaleDateString("th-TH")}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">ไม่หมดอายุ</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={code.isActive && !isExpired(code.expiresAt)}
                                                onCheckedChange={() => handleToggleActive(code)}
                                                disabled={isExpired(code.expiresAt)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenEdit(code)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(code.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
