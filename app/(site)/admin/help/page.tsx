"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
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
import {
    Eye,
    EyeOff,
    HelpCircle,
    Pencil,
    PlayCircle,
    Plus,
    Trash2,
} from "lucide-react";
import { showDeleteConfirm, showError, showSuccess } from "@/lib/swal";
import { PERMISSIONS } from "@/lib/permissions";
import { getYouTubeEmbedUrl, normalizeYouTubeVideo } from "@/lib/helpVideos";

interface HelpArticle {
    id: string;
    question: string;
    answer: string;
    category: string;
    sortOrder: number;
    isActive: boolean;
}

interface HelpVideo {
    id: string;
    title: string;
    youtubeUrl: string;
    videoId: string;
    sortOrder: number;
    isActive: boolean;
    createdAt?: string | null;
}

const CATEGORIES = [
    { value: "general", label: "ทั่วไป" },
    { value: "payment", label: "การชำระเงิน" },
    { value: "account", label: "บัญชีผู้ใช้" },
    { value: "order", label: "คำสั่งซื้อ" },
    { value: "product", label: "สินค้า" },
    { value: "security", label: "ความปลอดภัย / PIN" },
];

const emptyArticleForm = {
    question: "",
    answer: "",
    category: "general",
    sortOrder: 0,
};

const emptyVideoForm = {
    title: "",
    youtubeUrl: "",
    sortOrder: 0,
};

export default function AdminHelpPage() {
    const permissions = useAdminPermissions();
    const canEditContent = permissions.includes(PERMISSIONS.CONTENT_EDIT);
    const [articles, setArticles] = useState<HelpArticle[]>([]);
    const [videos, setVideos] = useState<HelpVideo[]>([]);
    const [loading, setLoading] = useState(true);

    const [isArticleDialogOpen, setIsArticleDialogOpen] = useState(false);
    const [editingArticle, setEditingArticle] = useState<HelpArticle | null>(null);
    const [articleForm, setArticleForm] = useState(emptyArticleForm);

    const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
    const [editingVideo, setEditingVideo] = useState<HelpVideo | null>(null);
    const [videoForm, setVideoForm] = useState(emptyVideoForm);

    const videoPreview = useMemo(
        () => normalizeYouTubeVideo(videoForm.youtubeUrl),
        [videoForm.youtubeUrl],
    );

    async function fetchHelpCenterData() {
        try {
            setLoading(true);
            const [articlesRes, videosRes] = await Promise.all([
                fetch("/api/admin/help"),
                fetch("/api/admin/help-videos"),
            ]);

            if (articlesRes.ok) {
                const data = await articlesRes.json();
                setArticles(Array.isArray(data) ? data : []);
            }

            if (videosRes.ok) {
                const data = await videosRes.json();
                setVideos(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("[HELP_CENTER_FETCH]", error);
            showError("ไม่สามารถโหลดข้อมูลศูนย์ช่วยเหลือได้");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void fetchHelpCenterData();
    }, []);

    function resetArticleDialog() {
        setEditingArticle(null);
        setArticleForm(emptyArticleForm);
    }

    function resetVideoDialog() {
        setEditingVideo(null);
        setVideoForm(emptyVideoForm);
    }

    function getCategoryLabel(value: string) {
        return CATEGORIES.find((item) => item.value === value)?.label || value;
    }

    async function handleArticleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (!canEditContent) {
            showError("คุณไม่มีสิทธิ์แก้ไขศูนย์ช่วยเหลือ");
            return;
        }

        try {
            const url = editingArticle ? `/api/admin/help/${editingArticle.id}` : "/api/admin/help";
            const method = editingArticle ? "PUT" : "POST";
            const payload = {
                title: articleForm.question,
                content: articleForm.answer,
                category: articleForm.category,
                sortOrder: articleForm.sortOrder,
                isActive: editingArticle?.isActive ?? true,
            };

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({})) as { message?: string; error?: string };
                showError(data.message || data.error || "เกิดข้อผิดพลาด");
                return;
            }

            showSuccess(editingArticle ? "แก้ไขคำถามสำเร็จ" : "เพิ่มคำถามสำเร็จ");
            setIsArticleDialogOpen(false);
            resetArticleDialog();
            await fetchHelpCenterData();
        } catch (error) {
            console.error("[HELP_ARTICLE_SUBMIT]", error);
            showError("เกิดข้อผิดพลาด");
        }
    }

    async function handleVideoSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (!canEditContent) {
            showError("คุณไม่มีสิทธิ์แก้ไขวิดีโอช่วยเหลือ");
            return;
        }

        try {
            const url = editingVideo ? `/api/admin/help-videos/${editingVideo.id}` : "/api/admin/help-videos";
            const method = editingVideo ? "PUT" : "POST";
            const payload = {
                title: videoForm.title,
                youtubeUrl: videoForm.youtubeUrl,
                sortOrder: videoForm.sortOrder,
                isActive: editingVideo?.isActive ?? true,
            };

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({})) as { message?: string; error?: string };
                showError(data.message || data.error || "เกิดข้อผิดพลาด");
                return;
            }

            showSuccess(editingVideo ? "แก้ไขคลิปช่วยเหลือสำเร็จ" : "เพิ่มคลิปช่วยเหลือสำเร็จ");
            setIsVideoDialogOpen(false);
            resetVideoDialog();
            await fetchHelpCenterData();
        } catch (error) {
            console.error("[HELP_VIDEO_SUBMIT]", error);
            showError("เกิดข้อผิดพลาด");
        }
    }

    function handleEditArticle(article: HelpArticle) {
        if (!canEditContent) {
            showError("คุณไม่มีสิทธิ์แก้ไขศูนย์ช่วยเหลือ");
            return;
        }

        setEditingArticle(article);
        setArticleForm({
            question: article.question,
            answer: article.answer,
            category: article.category,
            sortOrder: article.sortOrder,
        });
        setIsArticleDialogOpen(true);
    }

    function handleEditVideo(video: HelpVideo) {
        if (!canEditContent) {
            showError("คุณไม่มีสิทธิ์แก้ไขวิดีโอช่วยเหลือ");
            return;
        }

        setEditingVideo(video);
        setVideoForm({
            title: video.title,
            youtubeUrl: video.youtubeUrl,
            sortOrder: video.sortOrder,
        });
        setIsVideoDialogOpen(true);
    }

    async function handleDeleteArticle(id: string) {
        if (!canEditContent) {
            showError("คุณไม่มีสิทธิ์ลบคำถาม");
            return;
        }

        const confirmed = await showDeleteConfirm("คำถามนี้");
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/admin/help/${id}`, { method: "DELETE" });
            if (!response.ok) {
                showError("ลบคำถามไม่สำเร็จ");
                return;
            }

            showSuccess("ลบคำถามสำเร็จ");
            await fetchHelpCenterData();
        } catch (error) {
            console.error("[HELP_ARTICLE_DELETE]", error);
            showError("เกิดข้อผิดพลาด");
        }
    }

    async function handleDeleteVideo(id: string) {
        if (!canEditContent) {
            showError("คุณไม่มีสิทธิ์ลบคลิปช่วยเหลือ");
            return;
        }

        const confirmed = await showDeleteConfirm("คลิปช่วยเหลือนี้");
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/admin/help-videos/${id}`, { method: "DELETE" });
            if (!response.ok) {
                showError("ลบคลิปช่วยเหลือไม่สำเร็จ");
                return;
            }

            showSuccess("ลบคลิปช่วยเหลือสำเร็จ");
            await fetchHelpCenterData();
        } catch (error) {
            console.error("[HELP_VIDEO_DELETE]", error);
            showError("เกิดข้อผิดพลาด");
        }
    }

    async function handleToggleArticle(article: HelpArticle) {
        if (!canEditContent) {
            showError("คุณไม่มีสิทธิ์เปลี่ยนสถานะ");
            return;
        }

        try {
            const response = await fetch(`/api/admin/help/${article.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !article.isActive }),
            });

            if (!response.ok) {
                showError("อัปเดตสถานะไม่สำเร็จ");
                return;
            }

            showSuccess(article.isActive ? "ซ่อนคำถามแล้ว" : "แสดงคำถามแล้ว");
            await fetchHelpCenterData();
        } catch (error) {
            console.error("[HELP_ARTICLE_TOGGLE]", error);
            showError("เกิดข้อผิดพลาด");
        }
    }

    async function handleToggleVideo(video: HelpVideo) {
        if (!canEditContent) {
            showError("คุณไม่มีสิทธิ์เปลี่ยนสถานะ");
            return;
        }

        try {
            const response = await fetch(`/api/admin/help-videos/${video.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !video.isActive }),
            });

            if (!response.ok) {
                showError("อัปเดตสถานะคลิปไม่สำเร็จ");
                return;
            }

            showSuccess(video.isActive ? "ซ่อนคลิปแล้ว" : "แสดงคลิปแล้ว");
            await fetchHelpCenterData();
        } catch (error) {
            console.error("[HELP_VIDEO_TOGGLE]", error);
            showError("เกิดข้อผิดพลาด");
        }
    }

    const sortedArticles = [...articles].sort((left, right) => {
        if (left.category !== right.category) {
            return left.category.localeCompare(right.category);
        }

        return left.sortOrder - right.sortOrder;
    });

    const sortedVideos = [...videos].sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
            return left.sortOrder - right.sortOrder;
        }

        const leftCreatedAt = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightCreatedAt = right.createdAt ? new Date(right.createdAt).getTime() : 0;
        return rightCreatedAt - leftCreatedAt;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-3xl border border-border bg-white/90 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:bg-zinc-900/90">
                <div>
                    <h1 className="flex items-center gap-3 text-3xl font-bold">
                        ศูนย์ช่วยเหลือ
                        <HelpCircle className="h-8 w-8 text-blue-500" />
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        จัดการคำถามที่พบบ่อยและคลิปอธิบายวิธีแก้ปัญหาสำหรับลูกค้า
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Dialog
                        open={isVideoDialogOpen}
                        onOpenChange={(open) => {
                            setIsVideoDialogOpen(open);
                            if (!open) resetVideoDialog();
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button
                                className="gap-2"
                                disabled={!canEditContent}
                                onClick={() => {
                                    resetVideoDialog();
                                    setIsVideoDialogOpen(true);
                                }}
                            >
                                <PlayCircle className="h-4 w-4" />
                                เพิ่มคลิปช่วยเหลือ
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingVideo ? "แก้ไขคลิปช่วยเหลือ" : "เพิ่มคลิปช่วยเหลือ"}
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleVideoSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="video-title">ชื่อคลิป</Label>
                                    <Input
                                        id="video-title"
                                        value={videoForm.title}
                                        onChange={(event) =>
                                            setVideoForm((current) => ({ ...current, title: event.target.value }))
                                        }
                                        placeholder="เช่น วิธีเติมเงิน หรือ วิธีรับสินค้า"
                                        disabled={!canEditContent}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="video-url">ลิงก์ YouTube</Label>
                                    <Input
                                        id="video-url"
                                        value={videoForm.youtubeUrl}
                                        onChange={(event) =>
                                            setVideoForm((current) => ({ ...current, youtubeUrl: event.target.value }))
                                        }
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        disabled={!canEditContent}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        รองรับทั้งลิงก์ `youtube.com/watch`, `youtu.be`, และ `youtube.com/embed`
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="video-sort-order">ลำดับการแสดง</Label>
                                    <Input
                                        id="video-sort-order"
                                        type="number"
                                        min={0}
                                        value={String(videoForm.sortOrder)}
                                        onChange={(event) =>
                                            setVideoForm((current) => ({
                                                ...current,
                                                sortOrder: Number(event.target.value || 0),
                                            }))
                                        }
                                        disabled={!canEditContent}
                                    />
                                </div>
                                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
                                    <p className="mb-3 text-sm font-medium text-foreground">ตัวอย่างก่อนบันทึก</p>
                                    {videoPreview ? (
                                        <div className="space-y-3">
                                            <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-black">
                                                <iframe
                                                    src={videoPreview.embedUrl}
                                                    title="ตัวอย่างคลิปช่วยเหลือ"
                                                    className="h-full w-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                ระบบจะฝังคลิปนี้ไว้ด้านบนหน้าศูนย์ช่วยเหลือให้ลูกค้าดูได้ทันที
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            วางลิงก์ YouTube ที่ถูกต้องเพื่อดูตัวอย่างคลิป
                                        </p>
                                    )}
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setIsVideoDialogOpen(false)}>
                                        ยกเลิก
                                    </Button>
                                    <Button type="submit" disabled={!canEditContent}>
                                        {editingVideo ? "บันทึกคลิป" : "เพิ่มคลิป"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                    <Dialog
                        open={isArticleDialogOpen}
                        onOpenChange={(open) => {
                            setIsArticleDialogOpen(open);
                            if (!open) resetArticleDialog();
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                className="gap-2"
                                disabled={!canEditContent}
                                onClick={() => {
                                    resetArticleDialog();
                                    setIsArticleDialogOpen(true);
                                }}
                            >
                                <Plus className="h-4 w-4" />
                                เพิ่มคำถาม
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingArticle ? "แก้ไขคำถาม" : "เพิ่มคำถามใหม่"}
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleArticleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="article-category">หมวดหมู่</Label>
                                    <Select
                                        value={articleForm.category}
                                        onValueChange={(value) =>
                                            setArticleForm((current) => ({ ...current, category: value }))
                                        }
                                    >
                                        <SelectTrigger id="article-category" disabled={!canEditContent}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map((category) => (
                                                <SelectItem key={category.value} value={category.value}>
                                                    {category.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="article-question">คำถาม</Label>
                                    <Input
                                        id="article-question"
                                        value={articleForm.question}
                                        onChange={(event) =>
                                            setArticleForm((current) => ({ ...current, question: event.target.value }))
                                        }
                                        placeholder="เช่น สมัครสมาชิกหรือเติมเงินอย่างไร?"
                                        disabled={!canEditContent}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="article-answer">คำตอบ</Label>
                                    <Textarea
                                        id="article-answer"
                                        value={articleForm.answer}
                                        onChange={(event) =>
                                            setArticleForm((current) => ({ ...current, answer: event.target.value }))
                                        }
                                        placeholder="อธิบายขั้นตอนหรือวิธีแก้ปัญหาให้ลูกค้าเข้าใจง่าย"
                                        rows={6}
                                        disabled={!canEditContent}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="article-sort-order">ลำดับการแสดง</Label>
                                    <Input
                                        id="article-sort-order"
                                        type="number"
                                        min={0}
                                        value={String(articleForm.sortOrder)}
                                        onChange={(event) =>
                                            setArticleForm((current) => ({
                                                ...current,
                                                sortOrder: Number(event.target.value || 0),
                                            }))
                                        }
                                        disabled={!canEditContent}
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setIsArticleDialogOpen(false)}>
                                        ยกเลิก
                                    </Button>
                                    <Button type="submit" disabled={!canEditContent}>
                                        {editingArticle ? "บันทึกคำถาม" : "เพิ่มคำถาม"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <PlayCircle className="h-5 w-5 text-red-500" />
                            คลิปช่วยเหลือ ({videos.length})
                        </CardTitle>
                        <p className="mt-2 text-sm text-muted-foreground">
                            คลิปทั้งหมดที่จะแสดงไว้ด้านบนของหน้าศูนย์ช่วยเหลือ ลูกค้าจะเห็นส่วนนี้ก่อน FAQ
                        </p>
                    </div>
                    <Badge variant="secondary">
                        พร้อมแสดง {videos.filter((video) => video.isActive).length} คลิป
                    </Badge>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-8 text-center text-muted-foreground">กำลังโหลด...</div>
                    ) : sortedVideos.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border py-10 text-center text-muted-foreground">
                            ยังไม่มีคลิปช่วยเหลือ
                        </div>
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {sortedVideos.map((video) => (
                                <div
                                    key={video.id}
                                    className={`rounded-2xl border border-border p-4 ${video.isActive ? "" : "opacity-55"}`}
                                >
                                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="secondary">ลำดับ {video.sortOrder}</Badge>
                                                {!video.isActive && <Badge variant="outline">ซ่อน</Badge>}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold">{video.title}</h3>
                                                <p className="mt-2 break-all text-sm text-muted-foreground">
                                                    {video.youtubeUrl}
                                                </p>
                                            </div>
                                            {canEditContent ? (
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => void handleToggleVideo(video)}>
                                                        {video.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditVideo(video)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive"
                                                        onClick={() => void handleDeleteVideo(video.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-black">
                                            <iframe
                                                src={getYouTubeEmbedUrl(video.videoId)}
                                                title={video.title}
                                                className="h-full w-full"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>คำถามทั้งหมด ({articles.length})</CardTitle>
                        <p className="mt-2 text-sm text-muted-foreground">
                            ลูกค้าจะเห็นคำถามเหล่านี้ใต้ส่วนคลิปช่วยเหลือในหน้าศูนย์ช่วยเหลือ
                        </p>
                    </div>
                    <Badge variant="secondary">
                        พร้อมแสดง {articles.filter((article) => article.isActive).length} คำถาม
                    </Badge>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-8 text-center text-muted-foreground">กำลังโหลด...</div>
                    ) : sortedArticles.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border py-10 text-center text-muted-foreground">
                            ยังไม่มีคำถาม
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sortedArticles.map((article) => (
                                <div
                                    key={article.id}
                                    className={`rounded-2xl border border-border p-4 ${article.isActive ? "" : "opacity-55"}`}
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div className="flex-1 space-y-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="secondary">{getCategoryLabel(article.category)}</Badge>
                                                <Badge variant="outline">ลำดับ {article.sortOrder}</Badge>
                                                {!article.isActive && <Badge variant="outline">ซ่อน</Badge>}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{article.question}</h3>
                                                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                                                    {article.answer}
                                                </p>
                                            </div>
                                        </div>
                                        {canEditContent ? (
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => void handleToggleArticle(article)}>
                                                    {article.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleEditArticle(article)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive"
                                                    onClick={() => void handleDeleteArticle(article.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : null}
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
