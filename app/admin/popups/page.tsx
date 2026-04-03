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
    Megaphone,
    ExternalLink,
    Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";

function isValidUrl(url: string): boolean {
    if (!url || url.length < 5) return false;
    try {
        new URL(url);
        return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/");
    } catch {
        return url.startsWith("/");
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

interface PopupFormValue {
    title: string | null;
    imageUrl: string;
    linkUrl: string | null;
    sortOrder: number;
    isActive: boolean;
    dismissOption: string;
}

export default function AdminPopupsPage() {
    const [popups, setPopups] = useState<AnnouncementPopup[]>([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const initializePopupModalUpload = () => {
        const urlInput = document.getElementById("swal-imageUrl") as HTMLInputElement;
        const preview = document.getElementById("swal-img-preview");
        const previewImg = preview?.querySelector("img");

        if (urlInput) {
            urlInput.addEventListener("input", () => {
                if (urlInput.value) {
                    if (preview) preview.classList.remove("hidden");
                    if (previewImg) previewImg.src = urlInput.value;
                } else if (preview) {
                    preview.classList.add("hidden");
                }
            });
        }

        const uploadBtn = document.getElementById("swal-upload-btn");
        if (uploadBtn) {
            uploadBtn.addEventListener("click", () => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/jpeg,image/png,image/webp,image/gif";
                input.onchange = () => handlePopupImageUpload(input, urlInput, preview, previewImg);
                input.click();
            });
        }
    };

    const fetchPopups = useCallback(async () => {
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
    }, []);

    useEffect(() => {
        fetchPopups();
    }, [fetchPopups]);

    // Handle image upload inside Swal
    const handleFileUploadInSwal = async (file: File): Promise<string | null> => {
        try {
            showLoading("กำลังอัพโหลดรูป...");
            const compressed = await compressImage(file);
            const uploadFormData = new FormData();
            uploadFormData.append("file", compressed);
            const res = await fetch("/api/upload", { method: "POST", body: uploadFormData });
            const data = await res.json();
            hideLoading();
            if (data.success) {
                showSuccess("อัพโหลดรูปสำเร็จ!");
                return data.url as string;
            } else {
                showError(data.message || "อัพโหลดไม่สำเร็จ");
                return null;
            }
        } catch {
            hideLoading();
            showError("เกิดข้อผิดพลาดในการอัพโหลด");
            return null;
        }
    };

    const handlePopupImageUpload = async (input: HTMLInputElement, urlInput: HTMLInputElement | null, preview: HTMLElement | null, previewImg: HTMLImageElement | null | undefined) => {
        const file = input.files?.[0];
        if (!file) return;
        const url = await handleFileUploadInSwal(file);
        if (url) {
            if (urlInput) urlInput.value = url;
            if (preview) preview.classList.remove("hidden");
            if (previewImg) previewImg.src = url;
        }
    };

    // Open Create/Edit form in SweetAlert2
    const openDialog = (popup?: AnnouncementPopup) => {
        Swal.fire({
            title: popup ? "แก้ไข Pop-up" : "เพิ่ม Pop-up ใหม่",
            width: "min(96vw, 560px)",
            showCancelButton: true,
            confirmButtonText: popup ? "บันทึก" : "เพิ่ม",
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
                        <label class="block text-sm font-medium text-gray-700 mb-1">ชื่อ (สำหรับ admin)</label>
                        <input id="swal-title" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="เช่น โปรโมชั่นวาเลนไทน์" value="${popup?.title || ""}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">รูปภาพ *</label>
                        <div class="flex gap-2 mb-2">
                            <button id="swal-upload-btn" type="button" class="flex items-center gap-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
                                📷 อัพโหลดรูป
                            </button>
                            <span class="text-sm text-gray-400 self-center">หรือ</span>
                        </div>
                        <input id="swal-imageUrl" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="วาง URL รูปภาพ..." value="${popup?.imageUrl || ""}">
                        <p class="text-xs text-gray-400 mt-1">รองรับไฟล์ JPG, PNG, WebP, GIF สูงสุด 5MB ระบบจะย่อ บีบอัด และแปลงไฟล์ให้อัตโนมัติก่อนบันทึก • แนะนำขนาด 1500x1500px</p>
                        <div id="swal-img-preview" class="mt-2 ${popup?.imageUrl ? "" : "hidden"}">
                            <img src="${popup?.imageUrl || ""}" class="w-40 h-40 object-cover rounded-lg border mx-auto" onerror="this.src='https://placehold.co/200x200/ef4444/ffffff?text=Invalid+URL'">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">ลิงก์ (เมื่อคลิก)</label>
                        <input id="swal-linkUrl" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://example.com/promo" value="${popup?.linkUrl || ""}">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">ลำดับการแสดง</label>
                            <input id="swal-sortOrder" type="number" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value="${popup?.sortOrder ?? 0}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
                            <select id="swal-isActive" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="true" ${popup?.isActive ?? true ? "selected" : ""}>แสดง</option>
                                <option value="false" ${popup?.isActive === false ? "selected" : ""}>ซ่อน</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">เมื่อปิด Popup</label>
                        <select id="swal-dismissOption" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="show_always" ${(popup?.dismissOption ?? "show_always") === "show_always" ? "selected" : ""}>แสดงทุกครั้งเมื่อเข้าเว็บ</option>
                            <option value="hide_1_hour" ${popup?.dismissOption === "hide_1_hour" ? "selected" : ""}>ปิดการแจ้งเตือน 1 ชั่วโมง</option>
                        </select>
                        <p class="text-xs text-gray-400 mt-1">กำหนดว่าเมื่อผู้ใช้ปิด popup จะแสดงอีกครั้งเมื่อไหร่</p>
                    </div>
                </div>
            `,
            didOpen: initializePopupModalUpload,
            preConfirm: () => {
                const imageUrl = (document.getElementById("swal-imageUrl") as HTMLInputElement)?.value?.trim();
                if (!imageUrl) {
                    Swal.showValidationMessage("กรุณาระบุ URL รูปภาพ");
                    return false;
                }
                return {
                    title: (document.getElementById("swal-title") as HTMLInputElement)?.value?.trim() || null,
                    imageUrl,
                    linkUrl: (document.getElementById("swal-linkUrl") as HTMLInputElement)?.value?.trim() || null,
                    sortOrder: Number.parseInt((document.getElementById("swal-sortOrder") as HTMLInputElement)?.value) || 0,
                    isActive: (document.getElementById("swal-isActive") as HTMLSelectElement)?.value === "true",
                    dismissOption: (document.getElementById("swal-dismissOption") as HTMLSelectElement)?.value || "show_always",
                };
            },
        }).then(result => handleDialogResult(result, popup));
    };

    const handleDialogResult = async (result: { isConfirmed: boolean; value?: PopupFormValue }, popup?: AnnouncementPopup) => {
        if (!result.isConfirmed || !result.value) return;

        showLoading("กำลังบันทึก...");
        try {
            const url = popup ? `/api/admin/popups/${popup.id}` : "/api/admin/popups";
            const method = popup ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(result.value),
            });
            hideLoading();
            if (res.ok) {
                showSuccess(popup ? "แก้ไข Pop-up สำเร็จ!" : "เพิ่ม Pop-up สำเร็จ!");
                fetchPopups();
            } else {
                showError("เกิดข้อผิดพลาดในการบันทึก");
            }
        } catch {
            hideLoading();
            showError("เกิดข้อผิดพลาดในการบันทึก");
        }
    };

    // Delete popup
    const handleDelete = async (popup: AnnouncementPopup) => {
        const confirmed = await showDeleteConfirm(popup.title || "Pop-up ไม่มีชื่อ");
        if (!confirmed) return;

        showLoading("กำลังลบ...");
        try {
            const res = await fetch(`/api/admin/popups/${popup.id}`, { method: "DELETE" });
            hideLoading();
            if (res.ok) {
                showSuccess("ลบ Pop-up สำเร็จ!");
                fetchPopups();
            } else {
                showError("เกิดข้อผิดพลาดในการลบ");
            }
        } catch {
            hideLoading();
            showError("เกิดข้อผิดพลาดในการลบ");
        }
    };

    // Toggle active status
    const toggleActive = async (popup: AnnouncementPopup) => {
        try {
            const res = await fetch(`/api/admin/popups/${popup.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...popup, isActive: !popup.isActive }),
            });
            if (res.ok) fetchPopups();
        } catch (error) {
            console.error("Error toggling active:", error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Hidden file input ref (unused, kept for TS) */}
            <input ref={fileInputRef} type="file" className="hidden" />

            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Megaphone className="h-6 w-6" />
                        จัดการ Pop-up ประชาสัมพันธ์
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        เพิ่ม แก้ไข หรือลบ Pop-up ที่แสดงเมื่อเข้าเว็บไซต์
                    </p>
                </div>
                <Button onClick={() => openDialog()} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่ม Pop-up
                </Button>
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
                {!loading && popups.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>ยังไม่มี Pop-up</p>
                        <Button variant="link" className="mt-2" onClick={() => openDialog()}>
                            เพิ่ม Pop-up แรก
                        </Button>
                    </div>
                )}
                {!loading && popups.length > 0 && (
                    <div className="overflow-x-auto">
                    <Table className="min-w-[720px]">
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
                                    <TableCell className="text-center">{popup.sortOrder}</TableCell>
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
                                                aria-label={`แก้ไข Pop-up ${popup.title || popup.id}`}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(popup)}
                                                aria-label={`ลบ Pop-up ${popup.title || popup.id}`}
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
