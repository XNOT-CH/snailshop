"use client";

import React, { useState, useEffect, useRef } from "react";
import { showWarning, showError, showSuccess } from "@/lib/swal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    Newspaper,
    ExternalLink,
    Image as ImageIcon,
    Upload,
    X,
} from "lucide-react";
import Image from "next/image";

interface NewsArticle {
    id: string;
    title: string;
    description: string;
    imageUrl: string | null;
    link: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
}

export default function AdminNewsPage() {
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedNews, setSelectedNews] = useState<NewsArticle | null>(null);
    const [saving, setSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        imageUrl: "",
        link: "",
        sortOrder: 0,
        isActive: true,
    });

    // Fetch news
    const fetchNews = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/news");
            if (res.ok) {
                const data = await res.json();
                setNews(data);
            }
        } catch (error) {
            console.error("Error fetching news:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, []);

    // Open dialog for create/edit
    const openDialog = (article?: NewsArticle) => {
        if (article) {
            setSelectedNews(article);
            setFormData({
                title: article.title,
                description: article.description,
                imageUrl: article.imageUrl || "",
                link: article.link || "",
                sortOrder: article.sortOrder,
                isActive: article.isActive,
            });
        } else {
            setSelectedNews(null);
            setFormData({
                title: "",
                description: "",
                imageUrl: "",
                link: "",
                sortOrder: 0,
                isActive: true,
            });
        }
        setIsDialogOpen(true);
    };

    // Save news
    const handleSave = async () => {
        if (!formData.title || !formData.description) {
            showWarning("กรุณากรอกหัวข้อและรายละเอียด");
            return;
        }

        setSaving(true);
        try {
            const url = selectedNews
                ? `/api/admin/news/${selectedNews.id}`
                : "/api/admin/news";
            const method = selectedNews ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setIsDialogOpen(false);
                fetchNews();
            } else {
                showError("เกิดข้อผิดพลาดในการบันทึก");
            }
        } catch (error) {
            console.error("Error saving news:", error);
            showError("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setSaving(false);
        }
    };

    // Delete news
    const handleDelete = async () => {
        if (!selectedNews) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/admin/news/${selectedNews.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setIsDeleteDialogOpen(false);
                setSelectedNews(null);
                fetchNews();
            } else {
                showError("เกิดข้อผิดพลาดในการลบ");
            }
        } catch (error) {
            console.error("Error deleting news:", error);
            showError("เกิดข้อผิดพลาดในการลบ");
        } finally {
            setSaving(false);
        }
    };

    // Toggle active status
    const toggleActive = async (article: NewsArticle) => {
        try {
            const res = await fetch(`/api/admin/news/${article.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...article,
                    isActive: !article.isActive,
                }),
            });

            if (res.ok) {
                fetchNews();
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
                        <Newspaper className="h-6 w-6" />
                        จัดการข่าวสารและโปรโมชั่น
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        เพิ่ม แก้ไข หรือลบข่าวสารที่แสดงบนหน้าแรก
                    </p>
                </div>
                <Button onClick={() => openDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มข่าวสาร
                </Button>
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : news.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>ยังไม่มีข่าวสาร</p>
                        <Button
                            variant="link"
                            className="mt-2"
                            onClick={() => openDialog()}
                        >
                            เพิ่มข่าวสารแรก
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16">รูป</TableHead>
                                <TableHead>หัวข้อ</TableHead>
                                <TableHead className="hidden md:table-cell">รายละเอียด</TableHead>
                                <TableHead className="w-20 text-center">ลำดับ</TableHead>
                                <TableHead className="w-20 text-center">สถานะ</TableHead>
                                <TableHead className="w-24 text-center">จัดการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {news.map((article) => (
                                <TableRow key={article.id}>
                                    <TableCell>
                                        {article.imageUrl ? (
                                            <div className="relative w-12 h-8 rounded overflow-hidden">
                                                <Image
                                                    src={article.imageUrl}
                                                    alt={article.title}
                                                    fill
                                                    sizes="48px"
                                                    className="object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src =
                                                            "https://placehold.co/100x60/3b82f6/ffffff?text=N";
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-8 rounded bg-muted flex items-center justify-center">
                                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{article.title}</div>
                                        {article.link && (
                                            <a
                                                href={article.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                                ลิงก์
                                            </a>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <p className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                                            {article.description}
                                        </p>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {article.sortOrder}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch
                                            checked={article.isActive}
                                            onCheckedChange={() => toggleActive(article)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openDialog(article)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => {
                                                    setSelectedNews(article);
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
                            {selectedNews ? "แก้ไขข่าวสาร" : "เพิ่มข่าวสารใหม่"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">หัวข้อ *</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) =>
                                    setFormData({ ...formData, title: e.target.value })
                                }
                                placeholder="เช่น โปรโมชั่นเติมเกม"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">รายละเอียด *</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                placeholder="รายละเอียดข่าวสารหรือโปรโมชั่น"
                                rows={3}
                            />
                        </div>

                        <div className="space-y-3">
                            <Label>รูปภาพ</Label>

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

                            {/* Preview */}
                            {formData.imageUrl && (
                                <div className="relative w-full h-32 rounded-lg overflow-hidden mt-2 border">
                                    <Image
                                        src={formData.imageUrl}
                                        alt="Preview"
                                        fill
                                        sizes="100%"
                                        className="object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src =
                                                "https://placehold.co/400x200/ef4444/ffffff?text=Invalid+URL";
                                        }}
                                    />
                                </div>
                            )}

                            <p className="text-xs text-muted-foreground">
                                รองรับไฟล์ JPG, PNG, WebP, GIF (สูงสุด 5MB)
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="link">ลิงก์ (อ่านเพิ่มเติม)</Label>
                            <Input
                                id="link"
                                value={formData.link}
                                onChange={(e) =>
                                    setFormData({ ...formData, link: e.target.value })
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
                            {selectedNews ? "บันทึก" : "เพิ่ม"}
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
                        คุณต้องการลบข่าวสาร &quot;{selectedNews?.title}&quot; ใช่หรือไม่?
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
