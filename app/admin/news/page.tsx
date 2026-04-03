"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Swal from "sweetalert2";
import { showError, showSuccess, showDeleteConfirm, showLoading, hideLoading } from "@/lib/swal";
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
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Newspaper,
    ExternalLink,
    Image as ImageIcon,
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

interface NewsFormValue {
    title: string;
    description: string;
    imageUrl: string;
    link: string;
    sortOrder: number;
    isActive: boolean;
}

export default function AdminNewsPage() {
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadedUrlRef = useRef<string>("");

    // Handle modal init
    const initializeNewsModalUpload = () => {
        const urlInput = document.getElementById("swal-imageUrl") as HTMLInputElement;
        const preview = document.getElementById("swal-img-preview");
        const previewImg = preview?.querySelector("img");
        
        if (urlInput) {
            urlInput.addEventListener("input", () => {
                if (urlInput.value) {
                    if (preview) preview.classList.remove("hidden");
                    if (previewImg) previewImg.src = urlInput.value;
                    uploadedUrlRef.current = urlInput.value;
                } else {
                    if (preview) preview.classList.add("hidden");
                    uploadedUrlRef.current = "";
                }
            });
        }

        const uploadBtn = document.getElementById("swal-upload-btn");
        if (uploadBtn) {
            uploadBtn.addEventListener("click", () => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/jpeg,image/png,image/webp,image/gif";
                input.onchange = () => handleNewsImageUpload(input, urlInput, preview, previewImg, uploadBtn);
                input.click();
            });
        }
    };

    // Fetch news
    const fetchNews = useCallback(async () => {
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
    }, []);

    useEffect(() => {
        fetchNews();
    }, [fetchNews]);

    // Handle image upload within Swal (must NOT call showSuccess/showError — they replace the modal)
    const handleFileUploadInSwal = async (file: File, uploadBtn?: HTMLElement): Promise<string | null> => {
        try {
            if (uploadBtn) {
                uploadBtn.textContent = "⏳ กำลังอัพโหลด...";
                (uploadBtn as HTMLButtonElement).disabled = true;
            }
            const compressed = await compressImage(file);
            const uploadFormData = new FormData();
            uploadFormData.append("file", compressed);
            const res = await fetch("/api/upload", { method: "POST", body: uploadFormData });
            const data = await res.json();
            if (data.success) {
                return data.url as string;
            } else {
                Swal.showValidationMessage(data.message || "อัพโหลดไม่สำเร็จ");
                return null;
            }
        } catch {
            Swal.showValidationMessage("เกิดข้อผิดพลาดในการอัพโหลด");
            return null;
        } finally {
            if (uploadBtn) {
                uploadBtn.textContent = "📷 อัพโหลดรูป";
                (uploadBtn as HTMLButtonElement).disabled = false;
            }
        }
    };

    const handleNewsImageUpload = async (input: HTMLInputElement, urlInput: HTMLInputElement | null, preview: HTMLElement | null, previewImg: HTMLImageElement | null | undefined, uploadBtn?: HTMLElement) => {
        const file = input.files?.[0];
        if (!file) return;
        const url = await handleFileUploadInSwal(file, uploadBtn);
        if (url) {
            uploadedUrlRef.current = url;
            if (urlInput) urlInput.value = url;
            if (preview) preview.classList.remove("hidden");
            if (previewImg) previewImg.src = url;
        }
    };

    // Open Create/Edit form in SweetAlert2
    const openDialog = (article?: NewsArticle) => {
        uploadedUrlRef.current = article?.imageUrl || "";

        Swal.fire({
            title: article ? "แก้ไขข่าวสาร" : "เพิ่มข่าวสารใหม่",
            width: "min(96vw, 560px)",
            showCancelButton: true,
            confirmButtonText: article ? "บันทึก" : "เพิ่ม",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#1a56db",
            cancelButtonColor: "#6b7280",
            reverseButtons: true,
            focusConfirm: false,
            customClass: {
                popup: "rounded-2xl text-left",
                confirmButton: "rounded-xl px-6 py-2",
                cancelButton: "rounded-xl px-6 py-2",
            },
            html: `
                <div class="space-y-4 text-left">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หัวข้อ *</label>
                        <input id="swal-title" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="เช่น โปรโมชั่นเติมเกม" value="${article?.title || ""}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รายละเอียด *</label>
                        <textarea id="swal-description" rows="3" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="รายละเอียดข่าวสารหรือโปรโมชั่น">${article?.description || ""}</textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รูปภาพ</label>
                        <div class="flex gap-2 mb-2">
                            <button id="swal-upload-btn" type="button" class="flex items-center gap-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
                                📷 อัพโหลดรูป
                            </button>
                            <span class="text-sm text-gray-400 self-center">หรือ</span>
                        </div>
                        <input id="swal-imageUrl" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="วาง URL รูปภาพ..." value="${article?.imageUrl || ""}">
                        <div id="swal-img-preview" class="mt-2 ${article?.imageUrl ? "" : "hidden"}">
                            <img src="${article?.imageUrl || ""}" class="w-full h-28 object-cover rounded-lg border" onerror="this.src='https://placehold.co/400x200/ef4444/ffffff?text=Invalid+URL'">
                        </div>
                        <p class="text-xs text-gray-400 mt-1">รองรับไฟล์ JPG, PNG, WebP, GIF สูงสุด 5MB ระบบจะย่อ บีบอัด และแปลงไฟล์ให้อัตโนมัติก่อนบันทึก · แนะนำขนาด 1280×720px (16:9)</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ลิงก์ (อ่านเพิ่มเติม)</label>
                        <input id="swal-link" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://example.com/promo" value="${article?.link || ""}">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ลำดับการแสดง</label>
                            <input id="swal-sortOrder" type="number" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value="${article?.sortOrder ?? 0}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">สถานะ</label>
                            <select id="swal-isActive" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="true" ${article?.isActive ?? true ? "selected" : ""}>แสดง</option>
                                <option value="false" ${article?.isActive === false ? "selected" : ""}>ซ่อน</option>
                            </select>
                        </div>
                    </div>
                </div>
            `,
            didOpen: initializeNewsModalUpload,
            preConfirm: () => {
                const title = (document.getElementById("swal-title") as HTMLInputElement)?.value?.trim();
                const description = (document.getElementById("swal-description") as HTMLTextAreaElement)?.value?.trim();
                const imageUrl = (document.getElementById("swal-imageUrl") as HTMLInputElement)?.value?.trim();
                const link = (document.getElementById("swal-link") as HTMLInputElement)?.value?.trim();
                const sortOrder = Number.parseInt((document.getElementById("swal-sortOrder") as HTMLInputElement)?.value) || 0;
                const isActive = (document.getElementById("swal-isActive") as HTMLSelectElement)?.value === "true";

                if (!title || !description) {
                    Swal.showValidationMessage("กรุณากรอกหัวข้อและรายละเอียด");
                    return false;
                }
                return { title, description, imageUrl, link, sortOrder, isActive };
            },
        }).then(result => handleDialogResult(result, article));
    };

    const handleDialogResult = async (result: { isConfirmed: boolean; value?: NewsFormValue }, article?: NewsArticle) => {
        if (!result.isConfirmed || !result.value) return;

        const formData = result.value;

        showLoading("กำลังบันทึก...");
        try {
            const url = article ? `/api/admin/news/${article.id}` : "/api/admin/news";
            const method = article ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            hideLoading();
            if (res.ok) {
                showSuccess(article ? "แก้ไขข่าวสารสำเร็จ!" : "เพิ่มข่าวสารสำเร็จ!");
                fetchNews();
            } else {
                const errData = await res.json().catch(() => ({}));
                showError(errData?.message || "เกิดข้อผิดพลาดในการบันทึก");
            }
        } catch {
            hideLoading();
            showError("เกิดข้อผิดพลาดในการบันทึก");
        }
    };

    // Delete news
    const handleDelete = async (article: NewsArticle) => {
        const confirmed = await showDeleteConfirm(article.title);
        if (!confirmed) return;

        showLoading("กำลังลบ...");
        try {
            const res = await fetch(`/api/admin/news/${article.id}`, { method: "DELETE" });
            hideLoading();
            if (res.ok) {
                showSuccess("ลบข่าวสารสำเร็จ!");
                fetchNews();
            } else {
                showError("เกิดข้อผิดพลาดในการลบ");
            }
        } catch {
            hideLoading();
            showError("เกิดข้อผิดพลาดในการลบ");
        }
    };

    // Toggle active status
    const toggleActive = async (article: NewsArticle) => {
        try {
            const res = await fetch(`/api/admin/news/${article.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...article, isActive: !article.isActive }),
            });
            if (res.ok) {
                fetchNews();
            }
        } catch (error) {
            console.error("Error toggling active:", error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Hidden file input (unused, kept for ref) */}
            <input ref={fileInputRef} type="file" className="hidden" />

            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Newspaper className="h-6 w-6" />
                        จัดการข่าวสารและโปรโมชั่น
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        เพิ่ม แก้ไข หรือลบข่าวสารที่แสดงบนหน้าแรก
                    </p>
                </div>
                <Button onClick={() => openDialog()} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มข่าวสาร
                </Button>
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
                {!loading && news.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>ยังไม่มีข่าวสาร</p>
                        <Button variant="link" className="mt-2" onClick={() => openDialog()}>
                            เพิ่มข่าวสารแรก
                        </Button>
                    </div>
                )}
                {!loading && news.length > 0 && (
                    <div className="overflow-x-auto">
                    <Table className="min-w-[720px]">
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
                                    <TableCell className="text-center">{article.sortOrder}</TableCell>
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
                                                aria-label={`แก้ไขข่าว ${article.title}`}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(article)}
                                                aria-label={`ลบข่าว ${article.title}`}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    </div>
                )}
            </div>
        </div>
    );
}
