"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import {
    showDeleteConfirm,
    showError,
    showLoading,
    showSuccess,
    hideLoading,
} from "@/lib/swal";
import { compressImage } from "@/lib/compressImage";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ArrowDown,
    ArrowUp,
    ExternalLink,
    Image as ImageIcon,
    Link2,
    Loader2,
    Newspaper,
    Pencil,
    Plus,
    Trash2,
} from "lucide-react";
import Image from "next/image";
import { PERMISSIONS } from "@/lib/permissions";

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

interface NewsFormValue {
    title: string;
    description: string;
    imageUrl: string;
    link: string;
    sortOrder: number;
    isActive: boolean;
}

function getExcerpt(text: string, maxLength = 100) {
    const normalized = text.trim().replace(/\s+/g, " ");
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength).trim()}...`;
}

export default function AdminNewsPage() {
    const permissions = useAdminPermissions();
    const canEditContent = permissions.includes(PERMISSIONS.CONTENT_EDIT);
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [reorderingId, setReorderingId] = useState<string | null>(null);
    const uploadedUrlRef = useRef("");

    const initializeNewsModalUpload = () => {
        const urlInput = document.getElementById("swal-imageUrl") as HTMLInputElement | null;
        const preview = document.getElementById("swal-img-preview");
        const previewImg = preview?.querySelector("img") as HTMLImageElement | null;
        const linkInput = document.getElementById("swal-link") as HTMLInputElement | null;
        const linkPreview = document.getElementById("swal-link-preview") as HTMLAnchorElement | null;
        const linkHint = document.getElementById("swal-link-hint");

        if (urlInput) {
            urlInput.addEventListener("input", () => {
                const nextUrl = urlInput.value.trim();
                uploadedUrlRef.current = nextUrl;
                if (preview) preview.classList.toggle("hidden", !nextUrl);
                if (previewImg && nextUrl) previewImg.src = nextUrl;
            });
        }

        const uploadBtn = document.getElementById("swal-upload-btn");
        if (uploadBtn) {
            uploadBtn.addEventListener("click", () => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/jpeg,image/png,image/webp,image/gif";
                input.onchange = () =>
                    void handleNewsImageUpload(input, urlInput, preview, previewImg, uploadBtn);
                input.click();
            });
        }

        if (linkInput) {
            const syncLinkPreview = () => {
                const nextLink = linkInput.value.trim();
                if (!linkPreview || !linkHint) return;

                if (!nextLink) {
                    linkPreview.classList.add("hidden");
                    linkHint.textContent = "ใส่เฉพาะเมื่อต้องการให้ลูกค้ากดอ่านต่อหรือออกไปยังหน้าภายนอก";
                    return;
                }

                linkPreview.href = nextLink;
                linkPreview.classList.remove("hidden");
                linkHint.textContent = "ทดสอบปลายทางได้ทันทีเพื่อเช็กว่าลิงก์ถูกต้อง";
            };

            linkInput.addEventListener("input", syncLinkPreview);
            syncLinkPreview();
        }
    };

    const fetchNews = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/news");
            if (res.ok) {
                const data = (await res.json()) as NewsArticle[];
                setNews(data);
            }
        } catch (error) {
            console.error("Error fetching news:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchNews();
    }, [fetchNews]);

    const handleFileUploadInSwal = async (
        file: File,
        uploadBtn?: HTMLElement,
    ): Promise<string | null> => {
        try {
            if (uploadBtn) {
                uploadBtn.textContent = "กำลังอัปโหลด...";
                (uploadBtn as HTMLButtonElement).disabled = true;
            }

            const compressed = await compressImage(file);
            const uploadFormData = new FormData();
            uploadFormData.append("file", compressed);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: uploadFormData,
            });

            const data = (await res.json()) as {
                success: boolean;
                url?: string;
                message?: string;
            };

            if (data.success && data.url) {
                return data.url;
            }

            Swal.showValidationMessage(data.message || "อัปโหลดรูปไม่สำเร็จ");
            return null;
        } catch {
            Swal.showValidationMessage("เกิดข้อผิดพลาดในการอัปโหลดรูป");
            return null;
        } finally {
            if (uploadBtn) {
                uploadBtn.textContent = "อัปโหลดรูป";
                (uploadBtn as HTMLButtonElement).disabled = false;
            }
        }
    };

    const handleNewsImageUpload = async (
        input: HTMLInputElement,
        urlInput: HTMLInputElement | null,
        preview: HTMLElement | null,
        previewImg: HTMLImageElement | null,
        uploadBtn?: HTMLElement,
    ) => {
        const file = input.files?.[0];
        if (!file) return;

        const url = await handleFileUploadInSwal(file, uploadBtn);
        if (!url) return;

        uploadedUrlRef.current = url;
        if (urlInput) urlInput.value = url;
        if (preview) preview.classList.remove("hidden");
        if (previewImg) previewImg.src = url;
    };

    const openDialog = (article?: NewsArticle) => {
        if (!canEditContent) {
            showError("คุณไม่มีสิทธิ์แก้ไขข่าวสาร");
            return;
        }
        uploadedUrlRef.current = article?.imageUrl || "";

        void Swal.fire({
            title: article ? "แก้ไขข่าวสาร" : "เพิ่มข่าวสารใหม่",
            width: "min(96vw, 620px)",
            showCancelButton: true,
            confirmButtonText: article ? "บันทึก" : "เพิ่มข่าวสาร",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#1d4ed8",
            cancelButtonColor: "#6b7280",
            reverseButtons: true,
            focusConfirm: false,
            customClass: {
                popup: "overflow-hidden rounded-[28px] text-left",
                confirmButton: "rounded-xl px-6 py-2.5",
                cancelButton: "rounded-xl px-6 py-2.5",
                actions: "mt-6 border-t border-gray-100 px-0 pt-4",
            },
            html: `
                <div class="space-y-4 text-left">
                    <div class="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white px-4 py-3">
                        <p class="text-sm font-semibold text-blue-700">${article ? "อัปเดตรายละเอียดข่าวเดิม" : "สร้างข่าวหรือโปรโมชันใหม่"}</p>
                        <p class="mt-1 text-xs leading-5 text-slate-500">แก้ไขหัวข้อ คำโปรย รูปภาพ และลิงก์ปลายทางให้พร้อมแสดงบนหน้าแรก</p>
                    </div>
                    <div>
                        <label class="mb-1.5 block text-sm font-medium text-gray-700">หัวข้อ *</label>
                        <input
                            id="swal-title"
                            class="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="เช่น โปรโมชันเติมเกมสุดคุ้ม"
                            value="${article?.title || ""}"
                        />
                    </div>
                    <div>
                        <label class="mb-1.5 block text-sm font-medium text-gray-700">คำโปรย / รายละเอียด *</label>
                        <textarea
                            id="swal-description"
                            rows="4"
                            class="w-full resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="สรุปข่าวสารหรือโปรโมชันแบบสั้น กระชับ และอ่านง่าย"
                        >${article?.description || ""}</textarea>
                    </div>
                    <div>
                        <label class="mb-1.5 block text-sm font-medium text-gray-700">รูปภาพหน้าปก</label>
                        <div class="rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
                            <div class="mb-3 flex items-center gap-2">
                                <button
                                    id="swal-upload-btn"
                                    type="button"
                                    class="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                                >
                                    อัปโหลดรูป
                                </button>
                                <span class="text-xs text-gray-400">หรือวาง URL รูปภาพด้านล่าง</span>
                            </div>
                            <input
                                id="swal-imageUrl"
                                class="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="https://example.com/news-cover.webp"
                                value="${article?.imageUrl || ""}"
                            />
                            <div id="swal-img-preview" class="mt-3 ${article?.imageUrl ? "" : "hidden"}">
                                <img
                                    src="${article?.imageUrl || ""}"
                                    class="h-36 w-full rounded-xl border border-gray-200 object-cover"
                                    onerror="this.src='https://placehold.co/960x540/e5e7eb/64748b?text=Preview'"
                                />
                            </div>
                            <p class="mt-2 text-xs text-gray-500">
                                รองรับ JPG, PNG, WebP, GIF สูงสุด 5MB ระบบจะย่อ บีบอัด และแปลงไฟล์ให้อัตโนมัติก่อนบันทึก
                            </p>
                        </div>
                    </div>
                    <div>
                        <label class="mb-1.5 block text-sm font-medium text-gray-700">ลิงก์ปลายทาง</label>
                        <div class="rounded-2xl border border-gray-200 bg-gray-50/60 p-3">
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <input
                                    id="swal-link"
                                    class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="https://example.com/promo"
                                    value="${article?.link || ""}"
                                />
                                <a
                                    id="swal-link-preview"
                                    href="${article?.link || "#"}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="${article?.link ? "inline-flex" : "hidden"} items-center justify-center rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                                >
                                    เปิดลิงก์
                                </a>
                            </div>
                            <p id="swal-link-hint" class="mt-2 text-xs text-gray-500">
                                ใส่เฉพาะเมื่อต้องการให้ลูกค้ากดอ่านต่อหรือออกไปยังหน้าภายนอก
                            </p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="mb-1.5 block text-sm font-medium text-gray-700">ลำดับการแสดง</label>
                            <input
                                id="swal-sortOrder"
                                type="number"
                                class="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value="${article?.sortOrder ?? 0}"
                            />
                        </div>
                        <div>
                            <label class="mb-1.5 block text-sm font-medium text-gray-700">สถานะ</label>
                            <select
                                id="swal-isActive"
                                class="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="true" ${(article?.isActive ?? true) ? "selected" : ""}>แสดง</option>
                                <option value="false" ${article?.isActive === false ? "selected" : ""}>ซ่อน</option>
                            </select>
                        </div>
                    </div>
                    <div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 px-4 py-3">
                        <p class="text-xs font-medium text-slate-700">พร้อมบันทึกเมื่อกรอกหัวข้อและคำโปรยครบแล้ว</p>
                        <p class="mt-1 text-xs leading-5 text-slate-500">ตรวจสอบรูปตัวอย่าง ลิงก์ปลายทาง และลำดับการแสดงอีกครั้งก่อนกดบันทึก</p>
                    </div>
                </div>
            `,
            didOpen: initializeNewsModalUpload,
            preConfirm: () => {
                const title = (document.getElementById("swal-title") as HTMLInputElement)?.value?.trim();
                const description = (
                    document.getElementById("swal-description") as HTMLTextAreaElement
                )?.value?.trim();
                const imageUrl = (
                    document.getElementById("swal-imageUrl") as HTMLInputElement
                )?.value?.trim();
                const link = (document.getElementById("swal-link") as HTMLInputElement)?.value?.trim();
                const sortOrder =
                    Number.parseInt(
                        (document.getElementById("swal-sortOrder") as HTMLInputElement)?.value,
                        10,
                    ) || 0;
                const isActive =
                    (document.getElementById("swal-isActive") as HTMLSelectElement)?.value ===
                    "true";

                if (!title || !description) {
                    Swal.showValidationMessage("กรุณากรอกหัวข้อและรายละเอียดให้ครบ");
                    return false;
                }

                return { title, description, imageUrl, link, sortOrder, isActive };
            },
        }).then((result) => void handleDialogResult(result, article));
    };

    const handleDialogResult = async (
        result: { isConfirmed: boolean; value?: NewsFormValue },
        article?: NewsArticle,
    ) => {
        if (!result.isConfirmed || !result.value) return;

        showLoading("กำลังบันทึก...");
        try {
            const url = article ? `/api/admin/news/${article.id}` : "/api/admin/news";
            const method = article ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(result.value),
            });

            hideLoading();

            if (res.ok) {
                showSuccess(article ? "แก้ไขข่าวสารสำเร็จ!" : "เพิ่มข่าวสารสำเร็จ!");
                void fetchNews();
                return;
            }

            const errData = (await res.json().catch(() => ({}))) as { message?: string };
            showError(errData.message || "เกิดข้อผิดพลาดในการบันทึก");
        } catch {
            hideLoading();
            showError("เกิดข้อผิดพลาดในการบันทึก");
        }
    };

    const handleDelete = async (article: NewsArticle) => {
        if (!canEditContent) {
            showError("คุณไม่มีสิทธิ์ลบข่าวสาร");
            return;
        }
        const confirmed = await showDeleteConfirm(article.title);
        if (!confirmed) return;

        showLoading("กำลังลบ...");
        try {
            const res = await fetch(`/api/admin/news/${article.id}`, { method: "DELETE" });
            hideLoading();

            if (res.ok) {
                showSuccess("ลบข่าวสารสำเร็จ!");
                void fetchNews();
                return;
            }

            showError("เกิดข้อผิดพลาดในการลบ");
        } catch {
            hideLoading();
            showError("เกิดข้อผิดพลาดในการลบ");
        }
    };

    const toggleActive = async (article: NewsArticle) => {
        if (!canEditContent) {
            showError("คุณไม่มีสิทธิ์เปลี่ยนสถานะข่าวสาร");
            return;
        }
        try {
            const res = await fetch(`/api/admin/news/${article.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...article, isActive: !article.isActive }),
            });

            if (res.ok) {
                void fetchNews();
            }
        } catch (error) {
            console.error("Error toggling active:", error);
        }
    };

    const sortedNews = [...news].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const handleReorder = async (articleId: string, direction: "up" | "down") => {
        if (!canEditContent) {
            showError("คุณไม่มีสิทธิ์จัดลำดับข่าวสาร");
            return;
        }
        const currentIndex = sortedNews.findIndex((item) => item.id === articleId);
        if (currentIndex === -1) return;

        const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= sortedNews.length) return;

        const reordered = [...sortedNews];
        [reordered[currentIndex], reordered[targetIndex]] = [
            reordered[targetIndex],
            reordered[currentIndex],
        ];

        const updates = reordered
            .map((item, index) => ({ id: item.id, sortOrder: index }))
            .filter((item, index) => item.sortOrder !== sortedNews[index]?.sortOrder);

        if (updates.length === 0) return;

        setReorderingId(articleId);
        try {
            await Promise.all(
                updates.map((item) =>
                    fetch(`/api/admin/news/${item.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ sortOrder: item.sortOrder }),
                    }),
                ),
            );
            await fetchNews();
        } catch {
            showError("เกิดข้อผิดพลาดในการจัดลำดับข่าว");
        } finally {
            setReorderingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-3 text-2xl font-bold text-foreground">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-[#eef4ff] text-[#145de7]">
                            <Newspaper className="h-5 w-5" />
                        </span>
                        จัดการข่าวสารและโปรโมชัน
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        เพิ่ม แก้ไข หรือซ่อนข่าวสารที่แสดงบนหน้าแรกของร้าน
                    </p>
                </div>
                <Button onClick={() => openDialog()} className="w-full rounded-xl sm:w-auto" disabled={!canEditContent}>
                    <Plus className="mr-2 h-4 w-4" />
                    เพิ่มข่าวสาร
                </Button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-foreground">
                            ข่าวทั้งหมด {news.length} รายการ
                        </p>
                        <p className="text-xs text-muted-foreground">
                            แสดงรายการข่าวพร้อมสถานะ ลำดับ และทางลัดสำหรับจัดการ
                        </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        พร้อมแสดง {news.filter((item) => item.isActive).length} รายการ
                    </div>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-14">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}

                {!loading && news.length === 0 && (
                    <div className="py-14 text-center text-muted-foreground">
                        <Newspaper className="mx-auto mb-4 h-12 w-12 opacity-40" />
                        <p>ยังไม่มีข่าวสารในระบบ</p>
                        <Button variant="link" className="mt-2" onClick={() => openDialog()} disabled={!canEditContent}>
                            เพิ่มข่าวสารรายการแรก
                        </Button>
                    </div>
                )}

                {!loading && news.length > 0 && (
                    <>
                        <div className="space-y-3 p-4 md:hidden">
                            {sortedNews.map((article, index) => (
                                <div
                                    key={article.id}
                                    className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                                >
                                    <div className="flex items-start gap-3">
                                        {article.imageUrl ? (
                                            <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
                                                <Image
                                                    src={article.imageUrl}
                                                    alt={article.title}
                                                    fill
                                                    sizes="96px"
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground">
                                                <ImageIcon className="h-4 w-4" />
                                            </div>
                                        )}

                                        <div className="min-w-0 flex-1 space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-semibold text-foreground">
                                                    {article.title}
                                                </p>
                                                <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                                                    ลำดับ {index + 1}
                                                </span>
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
                                                        article.isActive
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : "bg-slate-100 text-slate-500"
                                                    }`}
                                                >
                                                    {article.isActive ? "แสดง" : "ซ่อน"}
                                                </span>
                                            </div>
                                            <p className="text-sm leading-6 text-muted-foreground">
                                                {getExcerpt(article.description, 120)}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                                                    <span>เปิด/ปิด</span>
                                                    <Switch
                                                        checked={article.isActive}
                                                        onCheckedChange={() =>
                                                            void toggleActive(article)
                                                        }
                                                        disabled={!canEditContent}
                                                    />
                                                </div>
                                                {article.link ? (
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="sm"
                                                        className="rounded-xl"
                                                    >
                                                        <a
                                                            href={article.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <ExternalLink className="mr-1.5 h-4 w-4" />
                                                            เปิดลิงก์
                                                        </a>
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted"
                                                disabled={!canEditContent || index === 0 || reorderingId === article.id}
                                                onClick={() => void handleReorder(article.id, "up")}
                                                aria-label={`เลื่อน ${article.title} ขึ้น`}
                                            >
                                                {reorderingId === article.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <ArrowUp className="h-4 w-4" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted"
                                                disabled={
                                                    !canEditContent ||
                                                    index === sortedNews.length - 1 ||
                                                    reorderingId === article.id
                                                }
                                                onClick={() => void handleReorder(article.id, "down")}
                                                aria-label={`เลื่อน ${article.title} ลง`}
                                            >
                                                {reorderingId === article.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <ArrowDown className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {canEditContent ? (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="rounded-xl text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                                                        onClick={() => openDialog(article)}
                                                        aria-label={`แก้ไขข่าว ${article.title}`}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="rounded-xl text-muted-foreground hover:bg-red-50 hover:text-red-600"
                                                        onClick={() => void handleDelete(article)}
                                                        aria-label={`ลบข่าว ${article.title}`}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto md:block">
                            <Table className="min-w-[860px]">
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="w-[110px]">รูป</TableHead>
                                    <TableHead className="min-w-[240px]">หัวข้อ</TableHead>
                                    <TableHead className="min-w-[280px]">คำโปรย</TableHead>
                                    <TableHead className="w-20 text-center">ลำดับ</TableHead>
                                    <TableHead className="w-24 text-center">สถานะ</TableHead>
                                    <TableHead className="w-[170px] text-center">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedNews.map((article, index) => (
                                    <TableRow key={article.id} className="hover:bg-muted/20">
                                        <TableCell>
                                            {article.imageUrl ? (
                                                <div className="relative h-12 w-20 overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
                                                    <Image
                                                        src={article.imageUrl}
                                                        alt={article.title}
                                                        fill
                                                        sizes="80px"
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex h-12 w-20 items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground">
                                                    <ImageIcon className="h-4 w-4" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <p className="font-semibold text-foreground">
                                                    {article.title}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-xs text-muted-foreground">
                                                        ลำดับปัจจุบัน {article.sortOrder}
                                                    </p>
                                                    {article.link ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                                            <Link2 className="h-3 w-3" />
                                                            มีลิงก์
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                                            ไม่มีลิงก์
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="max-w-md text-sm leading-6 text-muted-foreground">
                                                {getExcerpt(article.description)}
                                            </p>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted"
                                                    disabled={!canEditContent || index === 0 || reorderingId === article.id}
                                                    onClick={() => void handleReorder(article.id, "up")}
                                                    aria-label={`เลื่อน ${article.title} ขึ้น`}
                                                >
                                                    {reorderingId === article.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <ArrowUp className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <span className="min-w-6 text-center text-sm font-semibold text-foreground">
                                                    {index + 1}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted"
                                                    disabled={
                                                        !canEditContent ||
                                                        index === sortedNews.length - 1 ||
                                                        reorderingId === article.id
                                                    }
                                                    onClick={() => void handleReorder(article.id, "down")}
                                                    aria-label={`เลื่อน ${article.title} ลง`}
                                                >
                                                    {reorderingId === article.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <ArrowDown className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-center">
                                                <Switch
                                                    checked={article.isActive}
                                                    onCheckedChange={() => void toggleActive(article)}
                                                    disabled={!canEditContent}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-center gap-1.5">
                                                {article.link ? (
                                                    <Button
                                                        asChild
                                                        variant="ghost"
                                                        size="icon"
                                                        className="rounded-lg text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                                                    >
                                                        <a
                                                            href={article.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            aria-label={`เปิดลิงก์ข่าว ${article.title}`}
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    </Button>
                                                ) : null}
                                                {canEditContent ? (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="rounded-lg text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                                                            onClick={() => openDialog(article)}
                                                            aria-label={`แก้ไขข่าว ${article.title}`}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"
                                                            onClick={() => void handleDelete(article)}
                                                            aria-label={`ลบข่าว ${article.title}`}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
