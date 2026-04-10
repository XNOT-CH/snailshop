"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    GripVertical,
    Link as LinkIcon,
    Loader2,
    Pencil,
    Plus,
    Trash2,
} from "lucide-react";
import { showDeleteConfirm, showError, showSuccess } from "@/lib/swal";
import { PERMISSIONS } from "@/lib/permissions";

interface FooterLink {
    id: string;
    label: string;
    href: string;
    openInNewTab: boolean;
    sortOrder: number;
    isActive: boolean;
}

interface FooterSettings {
    id: string;
    isActive: boolean;
    title: string;
}

function getDomainLabel(href: string) {
    if (href.startsWith("/")) return "ลิงก์ภายในเว็บ";
    try {
        return new URL(href).hostname.replace(/^www\./, "");
    } catch {
        return "ลิงก์ภายนอก";
    }
}

export default function FooterLinksAdminPage() {
    const permissions = useAdminPermissions();
    const canEditSettings = permissions.includes(PERMISSIONS.SETTINGS_EDIT);
    const [settings, setSettings] = useState<FooterSettings | null>(null);
    const [links, setLinks] = useState<FooterLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [newLabel, setNewLabel] = useState("");
    const [newHref, setNewHref] = useState("");
    const [newOpenInNewTab, setNewOpenInNewTab] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/footer-links");
            const data = (await res.json()) as {
                settings: FooterSettings;
                links: FooterLink[];
            };
            setSettings(data.settings);
            setLinks(data.links);
        } catch (error) {
            console.error("Error fetching data:", error);
            showError("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const sortedLinks = useMemo(
        () =>
            [...links].sort((a, b) => {
                if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
                return a.label.localeCompare(b.label);
            }),
        [links],
    );

    const handleToggleActive = async (isActive: boolean) => {
        if (!canEditSettings) {
            showError("คุณไม่มีสิทธิ์แก้ไขลิงก์ส่วนท้าย");
            return;
        }
        try {
            const res = await fetch("/api/admin/footer-links/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive }),
            });

            if (res.ok) {
                const updated = (await res.json()) as FooterSettings;
                setSettings(updated);
                showSuccess(isActive ? "เปิดการแสดงผลแล้ว" : "ปิดการแสดงผลแล้ว");
            }
        } catch (error) {
            console.error("Error toggling active:", error);
            showError("ไม่สามารถอัปเดตสถานะได้");
        }
    };

    const handleAddLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canEditSettings) {
            showError("คุณไม่มีสิทธิ์เพิ่มลิงก์");
            return;
        }
        if (!newLabel.trim() || !newHref.trim()) {
            showError("กรุณากรอกข้อมูลให้ครบ");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/admin/footer-links", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    label: newLabel.trim(),
                    href: newHref.trim(),
                    openInNewTab: newOpenInNewTab,
                }),
            });

            if (res.ok) {
                const newLink = (await res.json()) as FooterLink;
                setLinks((prev) => [...prev, newLink]);
                setNewLabel("");
                setNewHref("");
                setNewOpenInNewTab(false);
                showSuccess("เพิ่มลิงก์เรียบร้อย");
            } else {
                showError("ไม่สามารถเพิ่มลิงก์ได้");
            }
        } catch (error) {
            console.error("Error adding link:", error);
            showError("เกิดข้อผิดพลาด");
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmEdit = async (
        result: { isConfirmed: boolean; value?: Record<string, unknown> },
        link: FooterLink,
    ) => {
        if (!canEditSettings) {
            showError("คุณไม่มีสิทธิ์แก้ไขลิงก์");
            return;
        }
        if (!result.isConfirmed || !result.value) return;
        if (!result.value.label || !result.value.href) {
            showError("กรุณากรอกข้อมูลให้ครบ");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`/api/admin/footer-links/${link.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(result.value),
            });

            if (res.ok) {
                const updated = (await res.json()) as FooterLink;
                setLinks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
                showSuccess("แก้ไขลิงก์เรียบร้อย");
            } else {
                showError("ไม่สามารถแก้ไขลิงก์ได้");
            }
        } catch {
            showError("เกิดข้อผิดพลาด");
        } finally {
            setSaving(false);
        }
    };

    const openEditModal = (link: FooterLink) => {
        if (!canEditSettings) {
            showError("คุณไม่มีสิทธิ์แก้ไขลิงก์");
            return;
        }
        void Swal.fire({
            title: "แก้ไขลิงก์",
            width: "min(96vw, 540px)",
            showCancelButton: true,
            confirmButtonText: "บันทึก",
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
                        <p class="text-sm font-semibold text-blue-700">ปรับข้อมูลลิงก์เมนูลัด</p>
                        <p class="mt-1 text-xs leading-5 text-slate-500">แก้ไขข้อความที่โชว์ ลิงก์ปลายทาง และวิธีเปิดลิงก์ให้ตรงกับสิ่งที่ต้องการ</p>
                    </div>
                    <div>
                        <label class="mb-1.5 block text-sm font-medium text-gray-700">ข้อความที่โชว์</label>
                        <input
                            id="swal-label"
                            class="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value="${link.label}"
                        />
                    </div>
                    <div>
                        <label class="mb-1.5 block text-sm font-medium text-gray-700">ลิงก์ปลายทาง</label>
                        <div class="rounded-2xl border border-gray-200 bg-gray-50/60 p-3">
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <input
                                    id="swal-href"
                                    class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value="${link.href}"
                                />
                                <a
                                    href="${link.href}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                                >
                                    เปิดลิงก์
                                </a>
                            </div>
                            <p class="mt-2 text-xs text-gray-500">ตรวจสอบปลายทางก่อนบันทึกได้ทันที</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <label class="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
                            <input id="swal-newtab" type="checkbox" class="h-4 w-4" ${
                                link.openInNewTab ? "checked" : ""
                            }>
                            <span class="text-sm text-slate-700">เปิดในแท็บใหม่</span>
                        </label>
                        <label class="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
                            <input id="swal-active" type="checkbox" class="h-4 w-4" ${
                                link.isActive ? "checked" : ""
                            }>
                            <span class="text-sm text-slate-700">แสดงลิงก์นี้</span>
                        </label>
                    </div>
                </div>
            `,
            preConfirm: () => ({
                label: (document.getElementById("swal-label") as HTMLInputElement)?.value?.trim(),
                href: (document.getElementById("swal-href") as HTMLInputElement)?.value?.trim(),
                openInNewTab: (document.getElementById("swal-newtab") as HTMLInputElement)?.checked,
                isActive: (document.getElementById("swal-active") as HTMLInputElement)?.checked,
            }),
        }).then((result) => void handleConfirmEdit(result, link));
    };

    const handleDeleteLink = async (link: FooterLink) => {
        if (!canEditSettings) {
            showError("คุณไม่มีสิทธิ์ลบลิงก์");
            return;
        }
        const confirmed = await showDeleteConfirm(link.label);
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/admin/footer-links/${link.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setLinks((prev) => prev.filter((item) => item.id !== link.id));
                showSuccess("ลบลิงก์เรียบร้อย");
            } else {
                showError("ไม่สามารถลบลิงก์ได้");
            }
        } catch (error) {
            console.error("Error deleting link:", error);
            showError("เกิดข้อผิดพลาด");
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="flex items-center gap-3 text-2xl font-bold text-foreground">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-[#eef4ff] text-[#145de7]">
                        <LinkIcon className="h-5 w-5" />
                    </span>
                    จัดการเมนูลัดส่วนท้าย
                </h1>
                <p className="mt-2 text-muted-foreground">
                    เพิ่ม แก้ไข หรือซ่อนลิงก์ที่แสดงในส่วนท้ายของเว็บไซต์
                </p>
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">แสดงผลบนหน้าเว็บ</p>
                            <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                    settings?.isActive
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-slate-100 text-slate-500"
                                }`}
                            >
                                {settings?.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            เปิดเพื่อให้เมนูลัดชุดนี้แสดงในส่วนท้ายเว็บไซต์
                        </p>
                    </div>
                    <Switch
                        checked={settings?.isActive ?? false}
                        onCheckedChange={handleToggleActive}
                        disabled={!canEditSettings}
                    />
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-5 py-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#145de7] text-white">
                            <Plus className="h-4 w-4" />
                        </span>
                        <p className="font-semibold text-foreground">เพิ่มลิงก์ใหม่</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        สร้างเมนูลัดที่ช่วยพาลูกค้าไปยังหน้าสำคัญหรือปลายทางภายนอก
                    </p>
                </div>
                <form onSubmit={handleAddLink} className="space-y-4 p-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.2fr,1.2fr,auto]">
                        <div className="space-y-2">
                            <Label htmlFor="newLabel">ข้อความที่โชว์</Label>
                            <Input
                                id="newLabel"
                                placeholder="เช่น วิธีเติมเงิน, ติดต่อเรา"
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                disabled={!canEditSettings}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newHref">ลิงก์ปลายทาง</Label>
                            <Input
                                id="newHref"
                                placeholder="เช่น /how-to-topup หรือ https://facebook.com/..."
                                value={newHref}
                                onChange={(e) => setNewHref(e.target.value)}
                                disabled={!canEditSettings}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button
                                type="submit"
                                disabled={saving || !canEditSettings}
                                className="w-full rounded-xl bg-[#145de7] hover:bg-[#1048b8] md:w-auto"
                            >
                                {saving ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="mr-2 h-4 w-4" />
                                )}
                                เพิ่มลิงก์
                            </Button>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-3">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="newOpenInNewTab"
                                checked={newOpenInNewTab}
                                onCheckedChange={(checked) => setNewOpenInNewTab(checked === true)}
                                disabled={!canEditSettings}
                            />
                            <Label
                                htmlFor="newOpenInNewTab"
                                className="cursor-pointer text-sm font-normal"
                            >
                                เปิดแท็บใหม่สำหรับลิงก์ที่ออกไปเว็บไซต์ภายนอก
                            </Label>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            ถ้าเป็นลิงก์ภายในเว็บมักไม่จำเป็นต้องเปิดแท็บใหม่
                        </p>
                    </div>
                </form>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-foreground">
                            รายการลิงก์ {links.length} รายการ
                        </p>
                        <p className="text-xs text-muted-foreground">
                            ตรวจสอบลิงก์ที่ใช้งานอยู่ พร้อมสถานะและรูปแบบการเปิดลิงก์
                        </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        พร้อมแสดง {links.filter((item) => item.isActive).length} รายการ
                    </div>
                </div>

                {links.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                        ยังไม่มีลิงก์ในส่วนท้าย เพิ่มรายการแรกได้จากฟอร์มด้านบน
                    </div>
                ) : (
                    <>
                        <div className="space-y-3 p-4 md:hidden">
                            {sortedLinks.map((link) => (
                                <div
                                    key={link.id}
                                    className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-semibold text-foreground">
                                                    {link.label}
                                                </p>
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
                                                        link.isActive
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : "bg-slate-100 text-slate-500"
                                                    }`}
                                                >
                                                    {link.isActive ? "แสดง" : "ซ่อน"}
                                                </span>
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
                                                        link.openInNewTab
                                                            ? "bg-blue-100 text-blue-700"
                                                            : "bg-slate-100 text-slate-500"
                                                    }`}
                                                >
                                                    {link.openInNewTab
                                                        ? "เปิดแท็บใหม่"
                                                        : "แท็บเดิม"}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {getDomainLabel(link.href)}
                                            </p>
                                        </div>
                                        <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                    </div>

                                    <div className="mt-3 rounded-2xl bg-muted/30 px-3 py-2.5">
                                        <a
                                            href={link.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex max-w-full items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                            <span className="truncate">{link.href}</span>
                                            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                                        </a>
                                    </div>

                                    {canEditSettings ? (
                                        <div className="mt-4 flex items-center justify-end gap-1.5">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="rounded-xl text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                                                onClick={() => openEditModal(link)}
                                                aria-label={`แก้ไขลิงก์ ${link.label}`}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="rounded-xl text-muted-foreground hover:bg-red-50 hover:text-red-600"
                                                onClick={() => void handleDeleteLink(link)}
                                                aria-label={`ลบลิงก์ ${link.label}`}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto md:block">
                            <Table className="min-w-[860px]">
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead className="min-w-[220px]">ข้อความ</TableHead>
                                    <TableHead className="min-w-[280px]">ลิงก์</TableHead>
                                    <TableHead className="w-[130px] text-center">แท็บใหม่</TableHead>
                                    <TableHead className="w-[100px] text-center">สถานะ</TableHead>
                                    <TableHead className="w-[130px] text-right">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedLinks.map((link) => (
                                    <TableRow key={link.id} className="hover:bg-muted/20">
                                        <TableCell>
                                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <p className="font-semibold text-foreground">
                                                    {link.label}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {getDomainLabel(link.href)}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <a
                                                href={link.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex max-w-[300px] items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                                <span className="truncate">{link.href}</span>
                                                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                                            </a>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span
                                                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                                    link.openInNewTab
                                                        ? "bg-blue-100 text-blue-700"
                                                        : "bg-slate-100 text-slate-500"
                                                }`}
                                            >
                                                {link.openInNewTab ? "เปิดแท็บใหม่" : "แท็บเดิม"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span
                                                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                                    link.isActive
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : "bg-slate-100 text-slate-500"
                                                }`}
                                            >
                                                {link.isActive ? "แสดง" : "ซ่อน"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {canEditSettings ? (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="rounded-lg text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                                                        onClick={() => openEditModal(link)}
                                                        aria-label={`แก้ไขลิงก์ ${link.label}`}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"
                                                        onClick={() => void handleDeleteLink(link)}
                                                        aria-label={`ลบลิงก์ ${link.label}`}
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
            </div>
        </div>
    );
}
