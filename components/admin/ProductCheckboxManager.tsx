"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/constants/apiRoutes";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { showDeleteConfirm, showError, showSuccess } from "@/lib/swal";
import { CheckSquare, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

interface ProductCheckboxRow {
    id: string;
    title: string;
    description: string | null;
    isRequired: boolean;
}

interface ProductCheckboxManagerProps {
    productId: string;
    canEdit: boolean;
}

const emptyForm = { title: "", description: "", isRequired: true };

export function ProductCheckboxManager({ productId, canEdit }: Readonly<ProductCheckboxManagerProps>) {
    const [checkboxes, setCheckboxes] = useState<ProductCheckboxRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);

    const loadCheckboxes = useCallback(async () => {
        try {
            const response = await fetch(API_ROUTES.adminProductCheckboxes(productId), { cache: "no-store" });
            const data = await response.json();
            setCheckboxes(data.success ? data.checkboxes ?? [] : []);
        } catch {
            showError("ไม่สามารถโหลดช่องติ๊กได้");
        } finally {
            setIsLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        void loadCheckboxes();
    }, [loadCheckboxes]);

    const resetForm = () => {
        setEditingId(null);
        setForm(emptyForm);
    };

    const handleSubmit = async () => {
        if (!form.title.trim()) {
            showError("กรุณากรอกหัวข้อช่องติ๊ก");
            return;
        }

        setIsSaving(true);
        try {
            const url = editingId
                ? API_ROUTES.adminProductCheckbox(productId, editingId)
                : API_ROUTES.adminProductCheckboxes(productId);
            const response = await fetchWithCsrf(url, {
                method: editingId ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: form.title.trim(),
                    description: form.description.trim(),
                    isRequired: form.isRequired,
                }),
            });
            const data = await response.json();

            if (!data.success) {
                showError(data.message ?? "ไม่สามารถบันทึกช่องติ๊กได้");
                return;
            }

            showSuccess(data.message ?? "บันทึกแล้ว");
            resetForm();
            await loadCheckboxes();
        } catch {
            showError("ไม่สามารถบันทึกช่องติ๊กได้");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (checkbox: ProductCheckboxRow) => {
        const confirmed = await showDeleteConfirm(checkbox.title);
        if (!confirmed) return;

        try {
            const response = await fetchWithCsrf(API_ROUTES.adminProductCheckbox(productId, checkbox.id), {
                method: "DELETE",
            });
            const data = await response.json();

            if (!data.success) {
                showError(data.message ?? "ไม่สามารถลบช่องติ๊กได้");
                return;
            }

            showSuccess(data.message ?? "ลบแล้ว");
            if (editingId === checkbox.id) {
                resetForm();
            }
            await loadCheckboxes();
        } catch {
            showError("ไม่สามารถลบช่องติ๊กได้");
        }
    };

    const startEdit = (checkbox: ProductCheckboxRow) => {
        setEditingId(checkbox.id);
        setForm({
            title: checkbox.title,
            description: checkbox.description ?? "",
            isRequired: checkbox.isRequired,
        });
    };

    return (
        <Card className="admin-product-checkbox-card overflow-hidden border-slate-200/80 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.22)] dark:border-[#2d4362] dark:bg-[#0f1927]">
            <CardHeader className="border-b border-slate-200/80 px-6 py-5 dark:border-[#2d4362]">
                <CardTitle className="flex items-center gap-3 text-xl text-slate-900 dark:text-[#eef4ff]">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <CheckSquare className="h-5 w-5" />
                    </span>
                    ช่องติ๊กก่อนซื้อ
                    {checkboxes.length > 0 && (
                        <Badge className="ml-auto rounded-full bg-primary/10 px-3 py-1 text-primary hover:bg-primary/10">
                            {checkboxes.length} ช่อง
                        </Badge>
                    )}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    ช่องที่ตั้งเป็น &quot;จำเป็น&quot; ลูกค้าต้องติ๊กก่อนจึงจะกดซื้อหรือชำระเงินได้
                </p>
            </CardHeader>

            <CardContent className="space-y-5 p-6">
                {isLoading ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        กำลังโหลด...
                    </p>
                ) : checkboxes.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                        ยังไม่มีช่องติ๊กสำหรับสินค้านี้
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {checkboxes.map((checkbox) => (
                            <li
                                key={checkbox.id}
                                className="flex items-start gap-3 rounded-2xl border border-border/70 px-4 py-3"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                                        {checkbox.title}
                                        <Badge
                                            variant="outline"
                                            className={
                                                checkbox.isRequired
                                                    ? "border-primary/40 text-primary"
                                                    : "border-border/70 text-muted-foreground"
                                            }
                                        >
                                            {checkbox.isRequired ? "จำเป็น" : "ไม่บังคับ"}
                                        </Badge>
                                    </p>
                                    {checkbox.description && (
                                        <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                                            {checkbox.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex shrink-0 gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`แก้ไขช่องติ๊ก ${checkbox.title}`}
                                        disabled={!canEdit}
                                        onClick={() => startEdit(checkbox)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`ลบช่องติ๊ก ${checkbox.title}`}
                                        disabled={!canEdit}
                                        onClick={() => void handleDelete(checkbox)}
                                        className="text-red-500 hover:text-red-600"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="space-y-4 rounded-2xl border border-border/70 p-4">
                    <p className="font-medium text-foreground">
                        {editingId ? "แก้ไขช่องติ๊ก" : "เพิ่มช่องติ๊ก"}
                    </p>

                    <div className="space-y-2">
                        <Label htmlFor="product-checkbox-title">หัวข้อ</Label>
                        <Input
                            id="product-checkbox-title"
                            value={form.title}
                            maxLength={255}
                            placeholder="เช่น ใช้แล้วไม่คืนเงิน"
                            disabled={!canEdit || isSaving}
                            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="product-checkbox-description">รายละเอียด (ไม่บังคับ)</Label>
                        <Textarea
                            id="product-checkbox-description"
                            value={form.description}
                            maxLength={1000}
                            rows={2}
                            placeholder="เช่น ใช้แล้วไม่คืนเงินทุกกรณี ตรวจสอบก่อนใช้งาน"
                            disabled={!canEdit || isSaving}
                            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                        />
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 px-4 py-3">
                        <div>
                            <Label htmlFor="product-checkbox-required" className="font-medium">
                                จำเป็นต้องติ๊กไหม
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                เปิดไว้ = ลูกค้าต้องติ๊กก่อนสั่งซื้อสินค้านี้
                            </p>
                        </div>
                        <Switch
                            id="product-checkbox-required"
                            checked={form.isRequired}
                            disabled={!canEdit || isSaving}
                            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isRequired: checked }))}
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            className="flex-1 gap-2"
                            disabled={!canEdit || isSaving}
                            onClick={() => void handleSubmit()}
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            {editingId ? "บันทึกช่องติ๊ก" : "เพิ่มช่องติ๊ก"}
                        </Button>
                        {editingId && (
                            <Button type="button" variant="outline" className="gap-2" disabled={isSaving} onClick={resetForm}>
                                <X className="h-4 w-4" />
                                ยกเลิก
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
