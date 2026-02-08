"use client";

import React, { useState, useEffect, useRef } from "react";
import { showWarning, showError, showSuccess } from "@/lib/swal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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
import {
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Megaphone,
    ExternalLink,
    Image as ImageIcon,
    Upload,
    X,
} from "lucide-react";
import Image from "next/image";

// Helper function to check if a URL is valid
function isValidUrl(url: string): boolean {
    if (!url || url.length < 5) return false;
    try {
        new URL(url);
        return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/");
    } catch {
        return url.startsWith("/"); // Allow relative paths starting with /
    }
}

interface AnnouncementPopup {
    id: string;
    title: string | null;
    imageUrl: string;
    linkUrl: string | null;
    sortOrder: number;
    isActive: boolean;
    dismissOption: string;
    createdAt: string;
}

export default function AdminPopupsPage() {
    const [popups, setPopups] = useState<AnnouncementPopup[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedPopup, setSelectedPopup] = useState<AnnouncementPopup | null>(null);
    const [saving, setSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        imageUrl: "",
        linkUrl: "",
        sortOrder: 0,
        isActive: true,
        dismissOption: "show_always",
    });

    // Fetch popups
    const fetchPopups = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/popups");
            if (res.ok) {
                const data = await res.json();
                setPopups(data);
            }
        } catch (error) {
            console.error("Error fetching popups:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPopups();
    }, []);

    // Open dialog for create/edit
    const openDialog = (popup?: AnnouncementPopup) => {
        if (popup) {
            setSelectedPopup(popup);
            setFormData({
                title: popup.title || "",
                imageUrl: popup.imageUrl,
                linkUrl: popup.linkUrl || "",
                sortOrder: popup.sortOrder,
                isActive: popup.isActive,
                dismissOption: popup.dismissOption || "show_always",
            });
        } else {
            setSelectedPopup(null);
            setFormData({
                title: "",
                imageUrl: "",
                linkUrl: "",
                sortOrder: 0,
                isActive: true,
                dismissOption: "show_always",
            });
        }
        setIsDialogOpen(true);
    };

    // Save popup
    const handleSave = async () => {
        if (!formData.imageUrl) {
            showWarning("กรุณาระบุ URL รูปภาพ");
            return;
        }

        setSaving(true);
        try {
            const url = selectedPopup
                ? `/api/admin/popups/${selectedPopup.id}`
                : "/api/admin/popups";
            const method = selectedPopup ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setIsDialogOpen(false);
                fetchPopups();
            } else {
                showError("เกิดข้อผิดพลาดในการบันทึก");
            }
        } catch (error) {
            console.error("Error saving popup:", error);
            showError("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setSaving(false);
        }
    };

    // Delete popup
    const handleDelete = async () => {
        if (!selectedPopup) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/admin/popups/${selectedPopup.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setIsDeleteDialogOpen(false);
                setSelectedPopup(null);
                fetchPopups();
            } else {
                showError("เกิดข้อผิดพลาดในการลบ");
            }
        } catch (error) {
            console.error("Error deleting popup:", error);
            showError("เกิดข้อผิดพลาดในการลบ");
        } finally {
            setSaving(false);
        }
    };

    // Toggle active status
    const toggleActive = async (popup: AnnouncementPopup) => {
        try {
            const res = await fetch(`/api/admin/popups/${popup.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...popup,
                    isActive: !popup.isActive,
                }),
            });

            if (res.ok) {
                fetchPopups();
            }
        } catch (error) {
            console.error("Error toggling active:", error);
        }
    };

    // Handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const uploadFormData = new FormData();
            uploadFormData.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: uploadFormData,
            });

            const data = await res.json();
            if (data.success) {
                setFormData((prev) => ({ ...prev, imageUrl: data.url }));
                showSuccess("อัพโหลดรูปสำเร็จ!");
            } else {
                showError(data.message || "อัพโหลดไม่สำเร็จ");
            }
        } catch {
            showError("เกิดข้อผิดพลาดในการอัพโหลด");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Megaphone className="h-6 w-6" />
                        จัดการ Pop-up ประชาสัมพันธ์
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        เพิ่ม แก้ไข หรือลบ Pop-up ที่แสดงเมื่อเข้าเว็บไซต์
                    </p>
                </div>
                <Button onClick={() => openDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่ม Pop-up
                </Button>
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : popups.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>ยังไม่มี Pop-up</p>
                        <Button
                            variant="link"
                            className="mt-2"
                            onClick={() => openDialog()}
                        >
                            เพิ่ม Pop-up แรก
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-20">รูป</TableHead>
                                <TableHead>ชื่อ</TableHead>
                                <TableHead className="hidden md:table-cell">ลิงก์</TableHead>
                                <TableHead className="w-20 text-center">ลำดับ</TableHead>
                                <TableHead className="w-20 text-center">สถานะ</TableHead>
                                <TableHead className="w-24 text-center">จัดการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {popups.map((popup) => (
                                <TableRow key={popup.id}>
                                    <TableCell>
                                        <div className="relative w-16 h-16 rounded overflow-hidden bg-muted flex items-center justify-center">
                                            {isValidUrl(popup.imageUrl) ? (
                                                <Image
                                                    src={popup.imageUrl}
                                                    alt={popup.title || "Popup"}
                                                    fill
                                                    sizes="64px"
                                                    className="object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src =
                                                            "https://placehold.co/100x100/3b82f6/ffffff?text=P";
                                                    }}
                                                />
                                            ) : (
                                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">
                                            {popup.title || <span className="text-muted-foreground italic">ไม่มีชื่อ</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        {popup.linkUrl ? (
                                            <a
                                                href={popup.linkUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-primary hover:underline flex items-center gap-1"
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                                เปิดลิงก์
                                            </a>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {popup.sortOrder}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch
                                            checked={popup.isActive}
                                            onCheckedChange={() => toggleActive(popup)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openDialog(popup)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => {
                                                    setSelectedPopup(popup);
                                                    setIsDeleteDialogOpen(true);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedPopup ? "แก้ไข Pop-up" : "เพิ่ม Pop-up ใหม่"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">ชื่อ (สำหรับ admin)</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) =>
                                    setFormData({ ...formData, title: e.target.value })
                                }
                                placeholder="เช่น โปรโมชั่นวาเลนไทน์"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label>รูปภาพ *</Label>

                            {/* File Upload */}
                            <div className="flex gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    {isUploading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Upload className="h-4 w-4" />
                                    )}
                                    {isUploading ? "กำลังอัพโหลด..." : "อัพโหลด"}
                                </Button>
                                <span className="text-sm text-muted-foreground self-center">หรือ</span>
                            </div>

                            {/* URL Input */}
                            <div className="flex gap-2">
                                <Input
                                    id="imageUrl"
                                    value={formData.imageUrl}
                                    onChange={(e) =>
                                        setFormData({ ...formData, imageUrl: e.target.value })
                                    }
                                    placeholder="วาง URL รูปภาพ..."
                                    className="flex-1"
                                />
                                {formData.imageUrl && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setFormData(prev => ({ ...prev, imageUrl: "" }))}
                                        className="text-red-500 hover:text-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            <p className="text-xs text-muted-foreground">
                                รองรับไฟล์ JPG, PNG, WebP, GIF (สูงสุด 5MB) • แนะนำขนาด 1500x1500px
                            </p>

                            {/* Preview */}
                            {formData.imageUrl && isValidUrl(formData.imageUrl) && (
                                <div className="relative w-full aspect-square max-w-[200px] rounded-lg overflow-hidden mt-2 mx-auto border">
                                    <Image
                                        src={formData.imageUrl}
                                        alt="Preview"
                                        fill
                                        sizes="200px"
                                        className="object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src =
                                                "https://placehold.co/400x400/ef4444/ffffff?text=Invalid+URL";
                                        }}
                                    />
                                </div>
                            )}
                            {formData.imageUrl && !isValidUrl(formData.imageUrl) && (
                                <div className="flex items-center gap-2 mt-2 text-amber-500 text-xs">
                                    <ImageIcon className="h-4 w-4" />
                                    กรุณาใส่ URL ที่ถูกต้อง (เริ่มต้นด้วย http:// หรือ https://)
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="linkUrl">ลิงก์ (เมื่อคลิก)</Label>
                            <Input
                                id="linkUrl"
                                value={formData.linkUrl}
                                onChange={(e) =>
                                    setFormData({ ...formData, linkUrl: e.target.value })
                                }
                                placeholder="https://example.com/promo"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sortOrder">ลำดับการแสดง</Label>
                                <Input
                                    id="sortOrder"
                                    type="number"
                                    value={formData.sortOrder}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            sortOrder: parseInt(e.target.value) || 0,
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>สถานะ</Label>
                                <div className="flex items-center gap-2 h-9">
                                    <Switch
                                        checked={formData.isActive}
                                        onCheckedChange={(checked) =>
                                            setFormData({ ...formData, isActive: checked })
                                        }
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        {formData.isActive ? "แสดง" : "ซ่อน"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>เมื่อปิด Popup</Label>
                            <select
                                value={formData.dismissOption}
                                onChange={(e) =>
                                    setFormData({ ...formData, dismissOption: e.target.value })
                                }
                                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="show_always">แสดงทุกครั้งเมื่อเข้าเว็บ</option>
                                <option value="hide_1_hour">ปิดการแจ้งเตือน 1 ชั่วโมง</option>
                            </select>
                            <p className="text-xs text-muted-foreground">
                                กำหนดว่าเมื่อผู้ใช้ปิด popup จะแสดงอีกครั้งเมื่อไหร่
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            disabled={saving}
                        >
                            ยกเลิก
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {selectedPopup ? "บันทึก" : "เพิ่ม"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ยืนยันการลบ</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground">
                        คุณต้องการลบ Pop-up &quot;{selectedPopup?.title || "ไม่มีชื่อ"}&quot; ใช่หรือไม่?
                    </p>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            disabled={saving}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={saving}
                        >
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            ลบ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
