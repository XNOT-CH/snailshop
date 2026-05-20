"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Navigation, GripVertical } from "lucide-react";
import { showSuccess, showError, showDeleteConfirm } from "@/lib/swal";
import { PERMISSIONS } from "@/lib/permissions";

interface NavItem {
    id: string;
    label: string;
    href: string;
    icon: string | null;
    sortOrder: number;
    isActive: boolean;
}

export default function NavItemsAdminPage() {
    const permissions = useAdminPermissions();
    const canEditSettings = permissions.includes(PERMISSIONS.SETTINGS_EDIT);
    const [items, setItems] = useState<NavItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form states
    const [newLabel, setNewLabel] = useState("");
    const [newHref, setNewHref] = useState("");

    // Edit modal
    const [editingItem, setEditingItem] = useState<NavItem | null>(null);
    const [editLabel, setEditLabel] = useState("");
    const [editHref, setEditHref] = useState("");
    const [editSortOrder, setEditSortOrder] = useState(0);



    const fetchData = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/nav-items");
            const data = await res.json();
            setItems(data);
        } catch (error) {
            console.error("Error fetching data:", error);
            showError("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggleActive = async (item: NavItem) => {
        if (!canEditSettings) {
            showError("คุณไม่มีสิทธิ์แก้ไขเมนู");
            return;
        }
        try {
            const res = await fetch(`/api/admin/nav-items/${item.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !item.isActive }),
            });
            if (res.ok) {
                const updated = await res.json();
                setItems(items.map((i) => (i.id === updated.id ? updated : i)));
                showSuccess(updated.isActive ? "แสดงเมนูแล้ว" : "ซ่อนเมนูแล้ว");
            }
        } catch (error) {
            console.error("Error toggling active:", error);
            showError("ไม่สามารถอัปเดตได้");
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canEditSettings) {
            showError("คุณไม่มีสิทธิ์เพิ่มเมนู");
            return;
        }
        if (!newLabel.trim() || !newHref.trim()) {
            showError("กรุณากรอกข้อมูลให้ครบ");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/admin/nav-items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    label: newLabel.trim(),
                    href: newHref.trim(),
                }),
            });

            if (res.ok) {
                const newItem = await res.json();
                setItems([...items, newItem]);
                setNewLabel("");
                setNewHref("");
                showSuccess("เพิ่มเมนูเรียบร้อย");
            } else {
                showError("ไม่สามารถเพิ่มเมนูได้");
            }
        } catch (error) {
            console.error("Error adding item:", error);
            showError("เกิดข้อผิดพลาด");
        } finally {
            setSaving(false);
        }
    };

    const openEditModal = (item: NavItem) => {
        if (!canEditSettings) {
            showError("คุณไม่มีสิทธิ์แก้ไขเมนู");
            return;
        }
        setEditingItem(item);
        setEditLabel(item.label);
        setEditHref(item.href);
        setEditSortOrder(item.sortOrder);
    };

    const handleEditItem = async () => {
        if (!canEditSettings) {
            showError("คุณไม่มีสิทธิ์แก้ไขเมนู");
            return;
        }
        if (!editingItem || !editLabel.trim() || !editHref.trim()) {
            showError("กรุณากรอกข้อมูลให้ครบ");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`/api/admin/nav-items/${editingItem.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    label: editLabel.trim(),
                    href: editHref.trim(),
                    sortOrder: editSortOrder,
                }),
            });

            if (res.ok) {
                const updated = await res.json();
                setItems(items.map((i) => (i.id === updated.id ? updated : i)));
                setEditingItem(null);
                showSuccess("แก้ไขเมนูเรียบร้อย");
            } else {
                showError("ไม่สามารถแก้ไขเมนูได้");
            }
        } catch (error) {
            console.error("Error editing item:", error);
            showError("เกิดข้อผิดพลาด");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteItem = async (item: NavItem) => {
        if (!canEditSettings) {
            showError("คุณไม่มีสิทธิ์ลบเมนู");
            return;
        }
        const confirmed = await showDeleteConfirm(item.label);
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/admin/nav-items/${item.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setItems(items.filter((i) => i.id !== item.id));
                showSuccess("ลบเมนูเรียบร้อย");
            } else {
                showError("ไม่สามารถลบเมนูได้");
            }
        } catch (error) {
            console.error("Error deleting item:", error);
            showError("เกิดข้อผิดพลาด");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">การจัดการแถบนำทางหลัก</h1>
                <p className="text-muted-foreground">
                    กำหนดรายการและสถานะการแสดงผลของเมนูบนแถบหัวเว็บ
                </p>
            </div>

            {/* Add New Item Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        เพิ่มเมนูใหม่
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddItem} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="newLabel">ชื่อเมนูที่แสดง</Label>
                                <Input
                                    id="newLabel"
                                    placeholder="เช่น หน้าแรก, ร้านค้า"
                                    value={newLabel}
                                    onChange={(e) => setNewLabel(e.target.value)}
                                    disabled={!canEditSettings}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newHref">เส้นทาง URL</Label>
                                <Input
                                    id="newHref"
                                    placeholder="เช่น /, /shop, /help"
                                    value={newHref}
                                    onChange={(e) => setNewHref(e.target.value)}
                                    disabled={!canEditSettings}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={saving || !canEditSettings} className="w-full sm:w-auto">
                                {saving ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Plus className="h-4 w-4 mr-2" />
                                )}
                                เพิ่มเมนู
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Items List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Navigation className="h-5 w-5" />
                        รายการเมนู ({items.length})
                    </CardTitle>
                    <CardDescription>
                        เรียงตามลำดับการแสดงผล (Sort Order)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {items.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            ยังไม่มีเมนู เพิ่มเมนูแรกของคุณด้านบน
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3 md:hidden">
                                {[...items]
                                    .sort((a, b) => a.sortOrder - b.sortOrder)
                                    .map((item) => (
                                        <div key={item.id} className="rounded-xl border border-border p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                        <p className="font-medium">{item.label}</p>
                                                    </div>
                                                    <p className="mt-2 break-all text-sm text-muted-foreground">
                                                        {item.href}
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={item.isActive}
                                                    onCheckedChange={() => handleToggleActive(item)}
                                                    disabled={!canEditSettings}
                                                />
                                            </div>

                                            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                                <div className="rounded-lg bg-muted/40 p-3">
                                                    <p className="text-xs text-muted-foreground">
                                                        ลำดับการแสดงผล
                                                    </p>
                                                    <p className="mt-1 font-medium">{item.sortOrder}</p>
                                                </div>
                                                <div className="rounded-lg bg-muted/40 p-3">
                                                    <p className="text-xs text-muted-foreground">
                                                        สถานะการมองเห็น
                                                    </p>
                                                    <span
                                                        className={`mt-1 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${item.isActive
                                                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                                                            }`}
                                                    >
                                                        {item.isActive ? "แสดง" : "ซ่อน"}
                                                    </span>
                                                </div>
                                            </div>

                                            {canEditSettings ? (
                                                <div className="mt-4 flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1"
                                                        onClick={() => openEditModal(item)}
                                                    >
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        แก้ไข
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1 text-destructive hover:text-destructive"
                                                        onClick={() => handleDeleteItem(item)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        ลบ
                                                    </Button>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
                                <Table className="min-w-[760px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]"></TableHead>
                                            <TableHead>ชื่อเมนูที่แสดง</TableHead>
                                            <TableHead>เส้นทาง URL</TableHead>
                                            <TableHead className="text-center">ลำดับการแสดงผล</TableHead>
                                            <TableHead className="text-center">สถานะการมองเห็น</TableHead>
                                            <TableHead className="text-center">แสดงผล / ซ่อน</TableHead>
                                            <TableHead className="text-right">จัดการ</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {[...items]
                                            .sort((a, b) => a.sortOrder - b.sortOrder)
                                            .map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {item.label}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {item.href}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {item.sortOrder}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span
                                                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${item.isActive
                                                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                                                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                                                                }`}
                                                        >
                                                            {item.isActive ? "แสดง" : "ซ่อน"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Switch
                                                            checked={item.isActive}
                                                            onCheckedChange={() => handleToggleActive(item)}
                                                            disabled={!canEditSettings}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {canEditSettings ? (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => openEditModal(item)}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-destructive hover:text-destructive"
                                                                    onClick={() => handleDeleteItem(item)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">ดูได้อย่างเดียว</span>
                                                        )}
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

            {/* Edit Modal */}
            <Dialog open={Boolean(editingItem)} onOpenChange={() => setEditingItem(null)}>
                <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto p-4 sm:max-w-md sm:p-6">
                    <DialogHeader>
                        <DialogTitle>แก้ไขเมนู</DialogTitle>
                        <DialogDescription>
                            แก้ไขข้อมูลเมนูด้านล่าง
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="editLabel">ชื่อเมนูที่แสดง</Label>
                            <Input
                                id="editLabel"
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                disabled={!canEditSettings}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="editHref">เส้นทาง URL</Label>
                            <Input
                                id="editHref"
                                value={editHref}
                                onChange={(e) => setEditHref(e.target.value)}
                                disabled={!canEditSettings}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="editSortOrder">ลำดับการแสดงผล</Label>
                            <Input
                                id="editSortOrder"
                                type="number"
                                value={editSortOrder}
                                onChange={(e) => setEditSortOrder(Number.parseInt(e.target.value) || 0)}
                                disabled={!canEditSettings}
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-col gap-2 sm:flex-row">
                        <Button variant="outline" onClick={() => setEditingItem(null)} className="w-full sm:w-auto">
                            ยกเลิก
                        </Button>
                        <Button onClick={handleEditItem} disabled={saving || !canEditSettings} className="w-full sm:w-auto">
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            บันทึก
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


        </div>
    );
}
