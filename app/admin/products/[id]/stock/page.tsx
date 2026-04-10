"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Loader2,
    Package,
    Eye,
    Plus,
    Pencil,
    Trash2,
    Check,
    X,
    Save,
} from "lucide-react";
import { showSuccess, showError } from "@/lib/swal";
import { splitStock } from "@/lib/stock";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { PERMISSIONS } from "@/lib/permissions";

export default function StockManagementPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params.id as string;
    const permissions = useAdminPermissions();
    const canEditProduct = permissions.includes(PERMISSIONS.PRODUCT_EDIT);

    const [isFetching, setIsFetching] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [productName, setProductName] = useState("");
    const [secretData, setSecretData] = useState("");
    const [originalData, setOriginalData] = useState("");

    const [takenUsers, setTakenUsers] = useState<Record<string, string>>({});
    const [singleUser, setSingleUser] = useState("");
    const [singlePass, setSinglePass] = useState("");
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editUser, setEditUser] = useState("");
    const [editPass, setEditPass] = useState("");

    const stockItems = useMemo(() => {
        return splitStock(secretData, "newline");
    }, [secretData]);

    const hasChanges = secretData !== originalData;

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const [productRes, takenRes] = await Promise.all([
                    fetch(`/api/products/${productId}`),
                    fetch(`/api/products/${productId}/stock`),
                ]);

                const data = await productRes.json();
                if (data.success && data.data) {
                    setProductName(data.data.name || "");
                    const displayData = data.data.isSold ? "" : (data.data.secretData || "");
                    setSecretData(displayData);
                    setOriginalData(displayData);
                } else {
                    showError("ไม่พบสินค้า");
                    router.push("/admin/products");
                }

                const takenData = await takenRes.json();
                if (takenData.success) setTakenUsers(takenData.takenUsers ?? {});
            } catch {
                showError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
                router.push("/admin/products");
            } finally {
                setIsFetching(false);
            }
        };

        fetchProduct();
    }, [productId, router]);

    const rebuildSecretData = (items: string[]) => {
        setSecretData(items.join("\n"));
    };

    const handleAddSingleStock = () => {
        if (!canEditProduct) {
            showError("คุณไม่มีสิทธิ์แก้ไขสินค้า");
            return;
        }

        if (!singleUser.trim() || !singlePass.trim()) {
            showError("กรุณากรอก User และ Pass");
            return;
        }

        const newUser = singleUser.trim();
        const isDuplicate = stockItems.some((item) => item.split(" / ")[0]?.trim() === newUser);
        if (isDuplicate) {
            showError(`User "${newUser}" มีในสต็อกอยู่แล้ว`);
            return;
        }

        if (takenUsers[newUser]) {
            showError(`User "${newUser}" มีอยู่ในสต็อกของสินค้า "${takenUsers[newUser]}" แล้ว`);
            return;
        }

        const newEntry = `${newUser} / ${singlePass.trim()}`;
        setSecretData((prev) => (prev ? `${prev}\n${newEntry}` : newEntry));
        setSingleUser("");
        setSinglePass("");
        showSuccess("เพิ่มสต็อกสำเร็จ");
    };

    const handleEditStock = (index: number, item: string) => {
        if (!canEditProduct) {
            showError("คุณไม่มีสิทธิ์แก้ไขสินค้า");
            return;
        }

        const parts = item.split(" / ");
        setEditUser(parts[0]?.trim() || item);
        setEditPass(parts[1]?.trim() || "");
        setEditingIndex(index);
    };

    const handleSaveEditStock = () => {
        if (!canEditProduct) {
            showError("คุณไม่มีสิทธิ์แก้ไขสินค้า");
            return;
        }

        if (editingIndex === null) return;

        if (!editUser.trim() || !editPass.trim()) {
            showError("กรุณากรอก User และ Pass");
            return;
        }

        const updatedUser = editUser.trim();
        const isDuplicate = stockItems.some((item, index) =>
            index !== editingIndex && item.split(" / ")[0]?.trim() === updatedUser
        );

        if (isDuplicate) {
            showError(`User "${updatedUser}" มีในสต็อกอยู่แล้ว`);
            return;
        }

        if (takenUsers[updatedUser]) {
            showError(`User "${updatedUser}" มีอยู่ในสต็อกของสินค้า "${takenUsers[updatedUser]}" แล้ว`);
            return;
        }

        const items = [...stockItems];
        items[editingIndex] = `${updatedUser} / ${editPass.trim()}`;
        rebuildSecretData(items);
        setEditingIndex(null);
        setEditUser("");
        setEditPass("");
        showSuccess("แก้ไขสำเร็จ");
    };

    const handleDeleteStock = (index: number) => {
        if (!canEditProduct) {
            showError("คุณไม่มีสิทธิ์แก้ไขสินค้า");
            return;
        }

        const items = stockItems.filter((_, itemIndex) => itemIndex !== index);
        rebuildSecretData(items);
        if (editingIndex === index) setEditingIndex(null);
        showSuccess("ลบสต็อกสำเร็จ");
    };

    const handleSave = async () => {
        if (!canEditProduct) {
            showError("คุณไม่มีสิทธิ์แก้ไขสินค้า");
            return;
        }

        setIsSaving(true);

        try {
            const response = await fetch(`/api/products/${productId}/stock`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ secretData }),
            });

            const data = await response.json();
            if (data.success) {
                setOriginalData(secretData);
                showSuccess("บันทึกสต็อกสำเร็จ");
            } else {
                showError(data.message || "เกิดข้อผิดพลาด");
            }
        } catch {
            showError("ไม่สามารถบันทึกได้");
        } finally {
            setIsSaving(false);
        }
    };

    if (isFetching) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <Link
                        href="/admin/products"
                        className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        กลับไปรายการสินค้า
                    </Link>
                    <h1 className="flex items-center gap-2 text-2xl font-bold">
                        <Package className="h-6 w-6 text-amber-600" />
                        จัดการสต็อก
                    </h1>
                    <p className="mt-1 text-muted-foreground">{productName}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <Badge variant="secondary" className="px-3 py-1 text-base">
                        {stockItems.length} รายการ
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="border-amber-200 bg-amber-50/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base text-amber-700">
                            <Plus className="h-5 w-5" />
                            เพิ่มสต็อก
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="singleUser">User</Label>
                                <Input
                                    id="singleUser"
                                    placeholder="เช่น username123"
                                    value={singleUser}
                                    onChange={(e) => setSingleUser(e.target.value)}
                                    disabled={!canEditProduct}
                                    className="font-mono"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="singlePass">Pass</Label>
                                <Input
                                    id="singlePass"
                                    placeholder="เช่น password456"
                                    value={singlePass}
                                    onChange={(e) => setSinglePass(e.target.value)}
                                    disabled={!canEditProduct}
                                    className="font-mono"
                                />
                            </div>

                            <Button
                                type="button"
                                className="w-full gap-2"
                                onClick={handleAddSingleStock}
                                disabled={!canEditProduct}
                            >
                                <Plus className="h-4 w-4" />
                                เพิ่มสต็อก
                            </Button>

                            <p className="text-xs text-amber-600">
                                กรุณากรอก User และ Pass ให้ครบทั้งสองช่อง
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base text-blue-700">
                            <Eye className="h-5 w-5" />
                            รายการสต็อก
                            <Badge variant="secondary" className="ml-auto">
                                {stockItems.length} รายการ
                            </Badge>
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        {stockItems.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                <Package className="mx-auto mb-2 h-10 w-10 opacity-30" />
                                <p>ยังไม่มีสต็อก</p>
                                <p className="mt-1 text-xs">เพิ่มข้อมูลทางด้านซ้าย</p>
                            </div>
                        ) : (
                            <div className="max-h-[500px] space-y-2 overflow-y-auto">
                                {stockItems.map((item, index) => (
                                    <div
                                        key={`${item}-${index}`}
                                        className="rounded-lg border bg-card p-3 text-sm"
                                    >
                                        {editingIndex === index ? (
                                            <div className="space-y-2">
                                                <div className="mb-2 flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        #{index + 1}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">กำลังแก้ไข</span>
                                                </div>

                                                <Input
                                                    placeholder="User"
                                                    value={editUser}
                                                    onChange={(e) => setEditUser(e.target.value)}
                                                    disabled={!canEditProduct}
                                                    className="h-8 font-mono text-xs"
                                                />
                                                <Input
                                                    placeholder="Pass"
                                                    value={editPass}
                                                    onChange={(e) => setEditPass(e.target.value)}
                                                    disabled={!canEditProduct}
                                                    className="h-8 font-mono text-xs"
                                                />

                                                <div className="flex gap-1">
                                                    <Button type="button" size="sm" className="h-7 gap-1 text-xs" onClick={handleSaveEditStock} disabled={!canEditProduct}>
                                                        <Check className="h-3 w-3" /> บันทึก
                                                    </Button>
                                                    <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingIndex(null)}>
                                                        <X className="h-3 w-3" /> ยกเลิก
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mb-1 flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        #{index + 1}
                                                    </Badge>
                                                    {index === 0 && (
                                                        <Badge className="border-green-200 bg-green-100 text-xs text-green-700">
                                                            จะถูกส่งก่อน
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="mt-1 space-y-1 font-mono text-xs">
                                                    <div className="flex gap-2">
                                                        <span className="w-10 shrink-0 text-muted-foreground">User:</span>
                                                        <span className="text-foreground">{item.split(" / ")[0] || item}</span>
                                                    </div>
                                                    {item.includes(" / ") && (
                                                        <div className="flex gap-2">
                                                            <span className="w-10 shrink-0 text-muted-foreground">Pass:</span>
                                                            <span className="text-foreground">{item.split(" / ")[1]}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-1.5 text-xs"
                                                        onClick={() => handleEditStock(index, item)}
                                                        disabled={!canEditProduct}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                        แก้ไข
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-1.5 border-red-200 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                                        onClick={() => handleDeleteStock(index)}
                                                        disabled={!canEditProduct}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        ลบ
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={!canEditProduct || isSaving || !hasChanges}
                    className="w-full gap-2 sm:w-auto"
                >
                    {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    บันทึก
                </Button>
            </div>
        </div>
    );
}
