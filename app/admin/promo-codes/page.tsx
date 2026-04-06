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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Copy, Loader2, Pencil, Plus, Ticket, Trash2 } from "lucide-react";
import { showDeleteConfirm, showError, showSuccess } from "@/lib/swal";

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

type PromoFormState = {
    code: string;
    discountType: string;
    discountValue: string;
    minPurchase: string;
    maxDiscount: string;
    usageLimit: string;
    expiresAt: string;
    isActive: boolean;
};

const initialFormData: PromoFormState = {
    code: "",
    discountType: "PERCENTAGE",
    discountValue: "",
    minPurchase: "",
    maxDiscount: "",
    usageLimit: "",
    expiresAt: "",
    isActive: true,
};

export default function AdminPromoCodesPage() {
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<PromoFormState>(initialFormData);

    const fetchPromoCodes = useCallback(async () => {
        try {
            const response = await fetch("/api/admin/promo-codes");
            const data = await response.json();

            if (data.success) {
                setPromoCodes(data.data);
            }
        } catch (error) {
            console.error("[PROMO_CODE_FETCH]", error);
            showError("ไม่สามารถโหลดข้อมูลโค้ดส่วนลดได้");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPromoCodes();
    }, [fetchPromoCodes]);

    const resetForm = () => {
        setFormData(initialFormData);
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

    const normalizeDateForApi = (value: string) =>
        value ? new Date(`${value}T23:59:59.000+07:00`).toISOString() : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const url = editingCode
                ? `/api/admin/promo-codes/${editingCode.id}`
                : "/api/admin/promo-codes";
            const method = editingCode ? "PUT" : "POST";

            const payload = editingCode
                ? {
                    ...formData,
                    expiresAt: normalizeDateForApi(formData.expiresAt),
                }
                : {
                    code: formData.code,
                    discountType: formData.discountType,
                    discountValue: formData.discountValue,
                    minOrderAmount: formData.minPurchase || 0,
                    maxDiscount: formData.maxDiscount || 0,
                    maxUses: formData.usageLimit || 0,
                    usagePerUser: 0,
                    startsAt: null,
                    expiresAt: normalizeDateForApi(formData.expiresAt),
                    applicableCategories: [],
                    excludedCategories: [],
                    isNewUserOnly: false,
                    isActive: formData.isActive,
                };

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await response.json();

            if (data.success) {
                showSuccess(editingCode ? "แก้ไขโค้ดสำเร็จ" : "สร้างโค้ดส่วนลดสำเร็จ");
                setIsDialogOpen(false);
                resetForm();
                fetchPromoCodes();
                return;
            }

            showError(data.message || "เกิดข้อผิดพลาด");
        } catch (error) {
            console.error("[PROMO_CODE_SUBMIT]", error);
            showError("ไม่สามารถบันทึกข้อมูลได้");
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
                showSuccess("ลบโค้ดสำเร็จ");
                fetchPromoCodes();
                return;
            }

            showError(data.message || "ไม่สามารถลบโค้ดได้");
        } catch (error) {
            console.error("[PROMO_CODE_DELETE]", error);
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
            console.error("[PROMO_CODE_TOGGLE]", error);
            showError("เกิดข้อผิดพลาด");
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        showSuccess(`คัดลอก ${code} แล้ว`);
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

    const formatExpireDate = (expiresAt: string | null) => {
        if (!expiresAt) return "ไม่หมดอายุ";
        return new Date(expiresAt).toLocaleDateString("th-TH");
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
                        โค้ดส่วนลด <span className="text-2xl sm:text-3xl">🎟️</span>
                    </h1>
                    <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                        จัดการโปรโมชั่นและส่วนลด พร้อมเปิดปิดการใช้งานได้จากหน้านี้
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <Button onClick={handleOpenCreate} className="w-full gap-2 sm:w-auto">
                        <Plus className="h-4 w-4" />
                        สร้างโค้ดใหม่
                    </Button>

                    <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto p-4 sm:max-w-md sm:p-6">
                        <DialogHeader>
                            <DialogTitle>
                                {editingCode ? "แก้ไขโค้ดส่วนลด" : "สร้างโค้ดส่วนลดใหม่"}
                            </DialogTitle>
                            <DialogDescription>
                                กรอกรายละเอียดโค้ดส่วนลดและกำหนดเงื่อนไขเบื้องต้น
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="code">โค้ด</Label>
                                <Input
                                    id="code"
                                    placeholder="เช่น SALE50"
                                    value={formData.code}
                                    onChange={(e) =>
                                        setFormData((current) => ({
                                            ...current,
                                            code: e.target.value.toUpperCase(),
                                        }))
                                    }
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>ประเภทส่วนลด</Label>
                                    <Select
                                        value={formData.discountType}
                                        onValueChange={(value) =>
                                            setFormData((current) => ({
                                                ...current,
                                                discountType: value,
                                            }))
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
                                        {formData.discountType === "PERCENTAGE" ? "เปอร์เซ็นต์" : "จำนวนเงิน"}
                                    </Label>
                                    <Input
                                        id="discountValue"
                                        type="number"
                                        placeholder={formData.discountType === "PERCENTAGE" ? "10" : "50"}
                                        value={formData.discountValue}
                                        onChange={(e) =>
                                            setFormData((current) => ({
                                                ...current,
                                                discountValue: e.target.value,
                                            }))
                                        }
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="minPurchase">ยอดขั้นต่ำ (฿)</Label>
                                    <Input
                                        id="minPurchase"
                                        type="number"
                                        placeholder="ไม่บังคับ"
                                        value={formData.minPurchase}
                                        onChange={(e) =>
                                            setFormData((current) => ({
                                                ...current,
                                                minPurchase: e.target.value,
                                            }))
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
                                            setFormData((current) => ({
                                                ...current,
                                                maxDiscount: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="usageLimit">จำกัดการใช้</Label>
                                    <Input
                                        id="usageLimit"
                                        type="number"
                                        placeholder="ไม่จำกัด"
                                        value={formData.usageLimit}
                                        onChange={(e) =>
                                            setFormData((current) => ({
                                                ...current,
                                                usageLimit: e.target.value,
                                            }))
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
                                            setFormData((current) => ({
                                                ...current,
                                                expiresAt: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 px-4 py-3">
                                <Label htmlFor="promo-active">เปิดใช้งาน</Label>
                                <Switch
                                    id="promo-active"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) =>
                                        setFormData((current) => ({
                                            ...current,
                                            isActive: checked,
                                        }))
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

            <Card>
                <CardHeader className="space-y-2">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-lg sm:text-xl">
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
                        <>
                            <div className="space-y-3 md:hidden">
                                {promoCodes.map((code) => (
                                    <div
                                        key={code.id}
                                        className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                                                        {code.code}
                                                    </code>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => copyCode(code.code)}
                                                        aria-label={`คัดลอกโค้ด ${code.code}`}
                                                    >
                                                        <Copy className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                                <Badge variant="secondary">{formatDiscount(code)}</Badge>
                                            </div>

                                            <Switch
                                                checked={code.isActive && !isExpired(code.expiresAt)}
                                                onCheckedChange={() => handleToggleActive(code)}
                                                disabled={isExpired(code.expiresAt)}
                                            />
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                            <div className="rounded-xl bg-muted/40 p-3">
                                                <p className="text-xs text-muted-foreground">การใช้งาน</p>
                                                <p className="mt-1 font-medium">
                                                    {code.usedCount}
                                                    {code.usageLimit ? (
                                                        <span className="text-muted-foreground">
                                                            /{code.usageLimit}
                                                        </span>
                                                    ) : null}
                                                </p>
                                            </div>

                                            <div className="rounded-xl bg-muted/40 p-3">
                                                <p className="text-xs text-muted-foreground">หมดอายุ</p>
                                                <p
                                                    className={[
                                                        "mt-1 font-medium",
                                                        isExpired(code.expiresAt) ? "text-red-500" : "",
                                                    ].join(" ")}
                                                >
                                                    {formatExpireDate(code.expiresAt)}
                                                </p>
                                            </div>
                                        </div>

                                        {code.minPurchase ? (
                                            <p className="mt-3 text-xs text-muted-foreground">
                                                ขั้นต่ำ ฿{code.minPurchase.toLocaleString()}
                                            </p>
                                        ) : null}

                                        <div className="mt-4 flex gap-2">
                                            <Button
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => handleOpenEdit(code)}
                                                aria-label={`แก้ไขโค้ด ${code.code}`}
                                            >
                                                <Pencil className="mr-2 h-4 w-4" />
                                                แก้ไข
                                            </Button>

                                            <Button
                                                variant="outline"
                                                className="flex-1 text-red-500 hover:text-red-600"
                                                onClick={() => handleDelete(code.id)}
                                                aria-label={`ลบโค้ด ${code.code}`}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                ลบ
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
                                <Table className="min-w-[760px]">
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
                                                        <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                                                            {code.code}
                                                        </code>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => copyCode(code.code)}
                                                            aria-label={`คัดลอกโค้ด ${code.code}`}
                                                        >
                                                            <Copy className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <Badge variant="secondary">{formatDiscount(code)}</Badge>
                                                    {code.minPurchase ? (
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            ขั้นต่ำ ฿{code.minPurchase.toLocaleString()}
                                                        </p>
                                                    ) : null}
                                                </TableCell>

                                                <TableCell>
                                                    <span className="font-medium">{code.usedCount}</span>
                                                    {code.usageLimit ? (
                                                        <span className="text-muted-foreground">/{code.usageLimit}</span>
                                                    ) : null}
                                                </TableCell>

                                                <TableCell>
                                                    <span className={isExpired(code.expiresAt) ? "text-red-500" : ""}>
                                                        {formatExpireDate(code.expiresAt)}
                                                    </span>
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
                                                        aria-label={`แก้ไขโค้ด ${code.code}`}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(code.id)}
                                                        aria-label={`ลบโค้ด ${code.code}`}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
