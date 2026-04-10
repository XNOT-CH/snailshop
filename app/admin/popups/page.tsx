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
    ExternalLink,
    Link2,
    Loader2,
    Megaphone,
    Pencil,
    Plus,
    Trash2,
} from "lucide-react";
import Image from "next/image";
import { PERMISSIONS } from "@/lib/permissions";

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

const DISMISS_OPTIONS = [
    { value: "show_always", label: "แสดงทุกครั้งเมื่อเข้าเว็บไซต์" },
    { value: "hide_1_hour", label: "ซ่อนชั่วคราว 1 ชั่วโมงหลังปิด" },
];

function getDismissLabel(value: string) {
    return (
        DISMISS_OPTIONS.find((option) => option.value === value)?.label ||
        "แสดงทุกครั้งเมื่อเข้าเว็บไซต์"
    );
}

export default function AdminPopupsPage() {
    const permissions = useAdminPermissions();
    const canEditContent = permissions.includes(PERMISSIONS.CONTENT_EDIT);
    const [popups, setPopups] = useState<AnnouncementPopup[]>([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const initializePopupModalUpload = () => {
        const urlInput = document.getElementById("swal-imageUrl") as HTMLInputElement | null;
        const preview = document.getElementById("swal-img-preview");
        const previewImg = preview?.querySelector("img") as HTMLImageElement | null;
        const linkInput = document.getElementById("swal-linkUrl") as HTMLInputElement | null;
        const linkPreview = document.getElementById("swal-link-preview") as HTMLAnchorElement | null;
        const linkHint = document.getElementById("swal-link-hint");

        if (urlInput) {
            urlInput.addEventListener("input", () => {
                const nextUrl = urlInput.value.trim();
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
                    void handlePopupImageUpload(input, urlInput, preview, previewImg, uploadBtn);
                input.click();
            });
        }

        if (linkInput) {
            const syncLinkPreview = () => {
                const nextLink = linkInput.value.trim();
                if (!linkPreview || !linkHint) return;

                if (!nextLink) {
                    linkPreview.classList.add("hidden");
                    linkHint.textContent = "ใส่เฉพาะเมื่ออยากให้ลูกค้าคลิกไปยังหน้าโปรโมชันหรือปลายทางภายนอก";
                    return;
                }

                linkPreview.href = nextLink;
                linkPreview.classList.remove("hidden");
                linkHint.textContent = "กดเปิดลิงก์เพื่อเช็กปลายทางก่อนบันทึกได้ทันที";
            };

            linkInput.addEventListener("input", syncLinkPreview);
            syncLinkPreview();
        }
    };

    const fetchPopups = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/popups");
            if (res.ok) {
                const data = (await res.json()) as AnnouncementPopup[];
                setPopups(data);
            }
        } catch (error) {
            console.error("Error fetching popups:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchPopups();
    }, [fetchPopups]);

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

            const res = await fetch("/api/upload", { method: "POST", body: uploadFormData });
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

    const handlePopupImageUpload = async (
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

        if (urlInput) urlInput.value = url;
        if (preview) preview.classList.remove("hidden");
        if (previewImg) previewImg.src = url;
    };

    const openDialog = (popup?: AnnouncementPopup) => {
        if (!canEditContent) {
            showError("คุณไม่มีสิทธิ์แก้ไข Pop-up");
            return;
        }
        void Swal.fire({
            title: popup ? "แก้ไข Pop-up" : "เพิ่ม Pop-up ใหม่",
            width: "min(96vw, 620px)",
            showCancelButton: true,
            confirmButtonText: popup ? "บันทึก" : "เพิ่ม Pop-up",
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
                        <p class="text-sm font-semibold text-blue-700">${popup ? "อัปเดต Pop-up เดิม" : "สร้าง Pop-up ใหม่"}</p>
                        <p class="mt-1 text-xs leading-5 text-slate-500">ตั้งค่ารูปหลัก ลิงก์ปลายทาง ลำดับการแสดง และพฤติกรรมเมื่อผู้ใช้กดปิด</p>
                    </div>
                    <div>
                        <label class="mb-1.5 block text-sm font-medium text-gray-700">ชื่อสำหรับหลังบ้าน</label>
                        <input
                            id="swal-title"
                            class="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="เช่น โปรโมชันหน้าฝน"
                            value="${popup?.title || ""}"
                        />
                    </div>
                    <div>
                        <label class="mb-1.5 block text-sm font-medium text-gray-700">รูปภาพ Pop-up *</label>
                        <div class="rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
                            <div class="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center">
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
                                placeholder="https://example.com/popup-cover.webp"
                                value="${popup?.imageUrl || ""}"
                            />
                            <div id="swal-img-preview" class="mt-3 ${popup?.imageUrl ? "" : "hidden"}">
                                <img
                                    src="${popup?.imageUrl || ""}"
                                    class="mx-auto h-40 w-40 rounded-2xl border border-gray-200 object-cover"
                                    onerror="this.src='https://placehold.co/300x300/e5e7eb/64748b?text=Preview'"
                                />
                            </div>
                            <p class="mt-2 text-xs text-gray-500">
                                รองรับ JPG, PNG, WebP, GIF สูงสุด 5MB ระบบจะย่อ บีบอัด และแปลงไฟล์ให้อัตโนมัติก่อนบันทึก
                            </p>
                        </div>
                    </div>
                    <div>
                        <label class="mb-1.5 block text-sm font-medium text-gray-700">ลิงก์เมื่อคลิก Pop-up</label>
                        <div class="rounded-2xl border border-gray-200 bg-gray-50/60 p-3">
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <input
                                    id="swal-linkUrl"
                                    class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="https://example.com/promo"
                                    value="${popup?.linkUrl || ""}"
                                />
                                <a
                                    id="swal-link-preview"
                                    href="${popup?.linkUrl || "#"}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="${popup?.linkUrl ? "inline-flex" : "hidden"} items-center justify-center rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                                >
                                    เปิดลิงก์
                                </a>
                            </div>
                            <p id="swal-link-hint" class="mt-2 text-xs text-gray-500">
                                ใส่เฉพาะเมื่ออยากให้ลูกค้าคลิกไปยังหน้าโปรโมชันหรือปลายทางภายนอก
                            </p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label class="mb-1.5 block text-sm font-medium text-gray-700">ลำดับการแสดง</label>
                            <input
                                id="swal-sortOrder"
                                type="number"
                                class="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value="${popup?.sortOrder ?? 0}"
                            />
                        </div>
                        <div>
                            <label class="mb-1.5 block text-sm font-medium text-gray-700">สถานะ</label>
                            <select
                                id="swal-isActive"
                                class="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="true" ${(popup?.isActive ?? true) ? "selected" : ""}>แสดง</option>
                                <option value="false" ${popup?.isActive === false ? "selected" : ""}>ซ่อน</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="mb-1.5 block text-sm font-medium text-gray-700">เมื่อผู้ใช้กดปิด Pop-up</label>
                        <select
                            id="swal-dismissOption"
                            class="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            ${DISMISS_OPTIONS.map(
                                (option) =>
                                    `<option value="${option.value}" ${
                                        (popup?.dismissOption ?? "show_always") === option.value
                                            ? "selected"
                                            : ""
                                    }>${option.label}</option>`,
                            ).join("")}
                        </select>
                        <p class="mt-1 text-xs text-gray-500">
                            กำหนดว่าหลังผู้ใช้กดปิดแล้ว Pop-up นี้จะกลับมาแสดงอีกเมื่อไร
                        </p>
                    </div>
                    <div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 px-4 py-3">
                        <p class="text-xs font-medium text-slate-700">พร้อมบันทึกเมื่อมีรูปภาพและตั้งค่าสถานะเรียบร้อยแล้ว</p>
                        <p class="mt-1 text-xs leading-5 text-slate-500">เช็กภาพตัวอย่าง ลิงก์ปลายทาง และรูปแบบการซ่อนก่อนกดบันทึกอีกครั้ง</p>
                    </div>
                </div>
            `,
            didOpen: initializePopupModalUpload,
            preConfirm: () => {
                const imageUrl = (
                    document.getElementById("swal-imageUrl") as HTMLInputElement
                )?.value?.trim();

                if (!imageUrl) {
                    Swal.showValidationMessage("กรุณาใส่รูปภาพ Pop-up");
                    return false;
                }

                return {
                    title:
                        (document.getElementById("swal-title") as HTMLInputElement)?.value?.trim() ||
                        null,
                    imageUrl,
                    linkUrl:
                        (document.getElementById("swal-linkUrl") as HTMLInputElement)?.value?.trim() ||
                        null,
                    sortOrder:
                        Number.parseInt(
                            (document.getElementById("swal-sortOrder") as HTMLInputElement)?.value,
                            10,
                        ) || 0,
                    isActive:
                        (document.getElementById("swal-isActive") as HTMLSelectElement)?.value ===
                        "true",
                    dismissOption:
                        (document.getElementById("swal-dismissOption") as HTMLSelectElement)?.value ||
                        "show_always",
                };
            },
        }).then((result) => void handleDialogResult(result, popup));
    };

    const handleDialogResult = async (
        result: { isConfirmed: boolean; value?: PopupFormValue },
        popup?: AnnouncementPopup,
    ) => {
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
                void fetchPopups();
                return;
            }

            showError("เกิดข้อผิดพลาดในการบันทึก");
        } catch {
            hideLoading();
            showError("เกิดข้อผิดพลาดในการบันทึก");
        }
    };

    const handleDelete = async (popup: AnnouncementPopup) => {
        if (!canEditContent) {
            showError("คุณไม่มีสิทธิ์ลบ Pop-up");
            return;
        }
        const confirmed = await showDeleteConfirm(popup.title || "Pop-up ไม่มีชื่อ");
        if (!confirmed) return;

        showLoading("กำลังลบ...");
        try {
            const res = await fetch(`/api/admin/popups/${popup.id}`, { method: "DELETE" });
            hideLoading();

            if (res.ok) {
                showSuccess("ลบ Pop-up สำเร็จ!");
                void fetchPopups();
                return;
            }

            showError("เกิดข้อผิดพลาดในการลบ");
        } catch {
            hideLoading();
            showError("เกิดข้อผิดพลาดในการลบ");
        }
    };

    const toggleActive = async (popup: AnnouncementPopup) => {
        if (!canEditContent) {
            showError("คุณไม่มีสิทธิ์เปลี่ยนสถานะ Pop-up");
            return;
        }
        try {
            const res = await fetch(`/api/admin/popups/${popup.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...popup, isActive: !popup.isActive }),
            });

            if (res.ok) {
                void fetchPopups();
            }
        } catch (error) {
            console.error("Error toggling active:", error);
        }
    };

    const sortedPopups = [...popups].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return (
        <div className="space-y-6">
            <input ref={fileInputRef} type="file" className="hidden" />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-3 text-2xl font-bold text-foreground">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-[#eef4ff] text-[#145de7]">
                            <Megaphone className="h-5 w-5" />
                        </span>
                        จัดการ Pop-up ประชาสัมพันธ์
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        เพิ่ม แก้ไข หรือซ่อน Pop-up ที่แสดงเมื่อผู้ใช้เข้าเว็บไซต์
                    </p>
                </div>
                <Button onClick={() => openDialog()} className="w-full rounded-xl sm:w-auto" disabled={!canEditContent}>
                    <Plus className="mr-2 h-4 w-4" />
                    เพิ่ม Pop-up
                </Button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-foreground">
                            Pop-up ทั้งหมด {popups.length} รายการ
                        </p>
                        <p className="text-xs text-muted-foreground">
                            จัดการรูปภาพ ลิงก์ปลายทาง ลำดับ และรูปแบบการซ่อนของแต่ละ Pop-up
                        </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        พร้อมแสดง {popups.filter((item) => item.isActive).length} รายการ
                    </div>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-14">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}

                {!loading && popups.length === 0 && (
                    <div className="py-14 text-center text-muted-foreground">
                        <Megaphone className="mx-auto mb-4 h-12 w-12 opacity-40" />
                        <p>ยังไม่มี Pop-up ในระบบ</p>
                        <Button variant="link" className="mt-2" onClick={() => openDialog()} disabled={!canEditContent}>
                            เพิ่ม Pop-up รายการแรก
                        </Button>
                    </div>
                )}

                {!loading && popups.length > 0 && (
                    <>
                        <div className="space-y-3 p-4 md:hidden">
                            {sortedPopups.map((popup) => (
                                <div key={popup.id} className="rounded-xl border border-border p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
                                            <Image
                                                src={popup.imageUrl}
                                                alt={popup.title || "Popup"}
                                                fill
                                                sizes="64px"
                                                className="object-cover"
                                                unoptimized
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <p className="font-semibold text-foreground">
                                                {popup.title?.trim() || "ไม่มีชื่อ"}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {popup.linkUrl ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                                        <Link2 className="h-3 w-3" />
                                                        มีลิงก์
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                                        ไม่มีลิงก์
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Switch
                                            checked={popup.isActive}
                                            onCheckedChange={() => void toggleActive(popup)}
                                            disabled={!canEditContent}
                                        />
                                    </div>

                                    <div className="mt-4 space-y-1.5">
                                        {popup.linkUrl ? (
                                            <a
                                                href={popup.linkUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex max-w-full items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                                <span className="truncate">{popup.linkUrl}</span>
                                                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                                            </a>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">
                                                ไม่มีลิงก์ปลายทาง
                                            </span>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            {getDismissLabel(popup.dismissOption)}
                                        </p>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                        <div className="rounded-lg bg-muted/40 p-3">
                                            <p className="text-xs text-muted-foreground">ลำดับ</p>
                                            <p className="mt-1 font-medium">{popup.sortOrder}</p>
                                        </div>
                                        <div className="rounded-lg bg-muted/40 p-3">
                                            <p className="text-xs text-muted-foreground">สถานะ</p>
                                            <p className="mt-1 font-medium">
                                                {popup.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex gap-2">
                                        {canEditContent ? (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    className="flex-1"
                                                    onClick={() => openDialog(popup)}
                                                    aria-label={`แก้ไข Pop-up ${popup.title || "ไม่มีชื่อ"}`}
                                                >
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    แก้ไข
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="flex-1 text-red-500 hover:text-red-600"
                                                    onClick={() => void handleDelete(popup)}
                                                    aria-label={`ลบ Pop-up ${popup.title || "ไม่มีชื่อ"}`}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    ลบ
                                                </Button>
                                            </>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto md:block">
                            <Table className="min-w-[860px]">
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="w-[110px]">รูป</TableHead>
                                    <TableHead className="min-w-[240px]">ชื่อ</TableHead>
                                    <TableHead className="min-w-[260px]">ลิงก์ / พฤติกรรม</TableHead>
                                    <TableHead className="w-20 text-center">ลำดับ</TableHead>
                                    <TableHead className="w-24 text-center">สถานะ</TableHead>
                                    <TableHead className="w-[150px] text-center">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedPopups.map((popup) => (
                                    <TableRow key={popup.id} className="hover:bg-muted/20">
                                        <TableCell>
                                            <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
                                                <Image
                                                    src={popup.imageUrl}
                                                    alt={popup.title || "Popup"}
                                                    fill
                                                    sizes="64px"
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <p className="font-semibold text-foreground">
                                                    {popup.title?.trim() || "ไม่มีชื่อ"}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {popup.linkUrl ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                                            <Link2 className="h-3 w-3" />
                                                            มีลิงก์
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                                            ไม่มีลิงก์
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1.5">
                                                {popup.linkUrl ? (
                                                    <a
                                                        href={popup.linkUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex max-w-[250px] items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                                    >
                                                        <span className="truncate">{popup.linkUrl}</span>
                                                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                                                    </a>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">
                                                        ไม่มีลิงก์ปลายทาง
                                                    </span>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    {getDismissLabel(popup.dismissOption)}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-medium">
                                            {popup.sortOrder}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-center">
                                                <Switch
                                                    checked={popup.isActive}
                                                    onCheckedChange={() => void toggleActive(popup)}
                                                    disabled={!canEditContent}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-center gap-1.5">
                                                {canEditContent ? (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="rounded-lg text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                                                            onClick={() => openDialog(popup)}
                                                            aria-label={`แก้ไข Pop-up ${popup.title || "ไม่มีชื่อ"}`}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"
                                                            onClick={() => void handleDelete(popup)}
                                                            aria-label={`ลบ Pop-up ${popup.title || "ไม่มีชื่อ"}`}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-slate-400">ดูได้อย่างเดียว</span>
                                                )}
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
