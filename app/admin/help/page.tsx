"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, HelpCircle, Eye, EyeOff } from "lucide-react";
import { showSuccess, showError, showDeleteConfirm } from "@/lib/swal";

interface HelpArticle {
    id: string;
    question: string;
    answer: string;
    category: string;
    isActive: boolean;
}

const CATEGORIES = [
    { value: "general", label: "ทั่วไป" },
    { value: "payment", label: "การชำระเงิน" },
    { value: "account", label: "บัญชีผู้ใช้" },
    { value: "order", label: "คำสั่งซื้อ" },
    { value: "product", label: "สินค้า" },
];

export default function AdminHelpPage() {
    const [articles, setArticles] = useState<HelpArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingArticle, setEditingArticle] = useState<HelpArticle | null>(null);
    const [formData, setFormData] = useState({
        question: "",
        answer: "",
        category: "general",
    });

    const fetchArticles = async () => {
        try {
            const res = await fetch("/api/admin/help");
            if (res.ok) {
                const data = await res.json();
                setArticles(data);
            }
        } catch (error) {
            showError("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArticles();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingArticle
                ? `/api/admin/help/${editingArticle.id}`
                : "/api/admin/help";
            const method = editingArticle ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                showSuccess(editingArticle ? "แก้ไขสำเร็จ" : "เพิ่มสำเร็จ");
                setIsDialogOpen(false);
                setEditingArticle(null);
                setFormData({ question: "", answer: "", category: "general" });
                fetchArticles();
            } else {
                showError("เกิดข้อผิดพลาด");
            }
        } catch (error) {
            showError("เกิดข้อผิดพลาด");
        }
    };

    const handleEdit = (article: HelpArticle) => {
        setEditingArticle(article);
        setFormData({
            question: article.question,
            answer: article.answer,
            category: article.category,
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        const confirmed = await showDeleteConfirm("รายการนี้");
        if (!confirmed) return;
        try {
            const res = await fetch(`/api/admin/help/${id}`, { method: "DELETE" });
            if (res.ok) {
                showSuccess("ลบสำเร็จ");
                fetchArticles();
            }
        } catch (error) {
            showError("เกิดข้อผิดพลาด");
        }
    };

    const handleToggleActive = async (article: HelpArticle) => {
        try {
            const res = await fetch(`/api/admin/help/${article.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !article.isActive }),
            });
            if (res.ok) {
                showSuccess(article.isActive ? "ซ่อนแล้ว" : "แสดงแล้ว");
                fetchArticles();
            }
        } catch (error) {
            showError("เกิดข้อผิดพลาด");
        }
    };

    const getCategoryLabel = (value: string) => {
        return CATEGORIES.find((c) => c.value === value)?.label || value;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        ศูนย์ช่วยเหลือ <HelpCircle className="h-8 w-8 text-blue-500" />
                    </h1>
                    <p className="text-muted-foreground">จัดการคำถามที่พบบ่อย (FAQ)</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) {
                        setEditingArticle(null);
                        setFormData({ question: "", answer: "", category: "general" });
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            เพิ่มคำถาม
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                {editingArticle ? "แก้ไขคำถาม" : "เพิ่มคำถามใหม่"}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>หมวดหมู่</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, category: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((cat) => (
                                            <SelectItem key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>คำถาม</Label>
                                <Input
                                    value={formData.question}
                                    onChange={(e) =>
                                        setFormData({ ...formData, question: e.target.value })
                                    }
                                    placeholder="เช่น ฉันสามารถเติมเงินได้อย่างไร?"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>คำตอบ</Label>
                                <Textarea
                                    value={formData.answer}
                                    onChange={(e) =>
                                        setFormData({ ...formData, answer: e.target.value })
                                    }
                                    placeholder="คำตอบ..."
                                    rows={5}
                                    required
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    ยกเลิก
                                </Button>
                                <Button type="submit">
                                    {editingArticle ? "บันทึก" : "เพิ่ม"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>คำถามทั้งหมด ({articles.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
                    ) : articles.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            ยังไม่มีคำถาม
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {articles.map((article) => (
                                <div
                                    key={article.id}
                                    className={`p-4 border rounded-lg ${!article.isActive ? "opacity-50" : ""}`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="secondary">
                                                    {getCategoryLabel(article.category)}
                                                </Badge>
                                                {!article.isActive && (
                                                    <Badge variant="outline">ซ่อน</Badge>
                                                )}
                                            </div>
                                            <h3 className="font-semibold mb-1">{article.question}</h3>
                                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                                {article.answer}
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleToggleActive(article)}
                                            >
                                                {article.isActive ? (
                                                    <Eye className="h-4 w-4" />
                                                ) : (
                                                    <EyeOff className="h-4 w-4" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(article)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive"
                                                onClick={() => handleDelete(article.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
