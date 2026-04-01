"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, ExternalLink, Loader2, Link as LinkIcon, GripVertical } from "lucide-react";
import Swal from "sweetalert2";
import { showSuccess, showError, showDeleteConfirm } from "@/lib/swal";

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

export default function FooterLinksAdminPage() {
    const [settings, setSettings] = useState<FooterSettings | null>(null);
    const [links, setLinks] = useState<FooterLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form states
    const [newLabel, setNewLabel] = useState("");
    const [newHref, setNewHref] = useState("");
    const [newOpenInNewTab, setNewOpenInNewTab] = useState(false);




    const fetchData = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/footer-links");
            const data = await res.json();
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
        fetchData();
    }, [fetchData]);

    const handleToggleActive = async (isActive: boolean) => {
        try {
            const res = await fetch("/api/admin/footer-links/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive }),
            });
            if (res.ok) {
                const updated = await res.json();
                setSettings(updated);
                showSuccess(isActive ? "เปิดการแสดงผลแล้ว" : "ปิดการแสดงผลแล้ว");
            }
        } catch (error) {
            console.error("Error toggling active:", error);
            showError("ไม่สามารถอัปเดตได้");
        }
    };

    const handleAddLink = async (e: React.FormEvent) => {
        e.preventDefault();
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
                const newLink = await res.json();
                setLinks([...links, newLink]);
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

    const handleConfirmEdit = async (result: { isConfirmed: boolean; value?: Record<string, unknown> }, link: FooterLink) => {
        if (!result.isConfirmed || !result.value) return;
        if (!result.value.label || !result.value.href) { showError("กรุณากรอกข้อมูลให้ครบ"); return; }
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/footer-links/${link.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(result.value),
            });
            if (res.ok) {
                const updated = await res.json();
                setLinks(prev => prev.map(l => l.id === updated.id ? updated : l));
                showSuccess("แก้ไขลิงก์เรียบร้อย");
            } else { showError("ไม่สามารถแก้ไขลิงก์ได้"); }
        } catch { showError("เกิดข้อผิดพลาด"); }
        finally { setSaving(false); }
    };

    const openEditModal = (link: FooterLink) => {
        Swal.fire({
            title: "แก้ไขลิงก์",
            width: "min(96vw, 480px)",
            showCancelButton: true,
            confirmButtonText: "บันทึก",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#1a56db",
            cancelButtonColor: "#6b7280",
            reverseButtons: true,
            focusConfirm: false,
            customClass: { popup: "rounded-2xl text-left", confirmButton: "rounded-xl px-6 py-2", cancelButton: "rounded-xl px-6 py-2" },
            html: `
                <div class="space-y-4 text-left">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">ข้อความที่โชว์</label>
                        <input id="swal-label" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value="${link.label}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">ลิงก์ไปที่</label>
                        <input id="swal-href" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value="${link.href}">
                    </div>
                    <div class="flex items-center gap-3">
                        <input id="swal-newtab" type="checkbox" class="w-4 h-4" ${link.openInNewTab ? "checked" : ""}>
                        <label for="swal-newtab" class="text-sm">เปิดแท็บใหม่</label>
                    </div>
                    <div class="flex items-center gap-3">
                        <input id="swal-active" type="checkbox" class="w-4 h-4" ${link.isActive ? "checked" : ""}>
                        <label for="swal-active" class="text-sm">แสดงผลลิงก์นี้</label>
                    </div>
                </div>
            `,
            preConfirm: () => ({
                label: (document.getElementById("swal-label") as HTMLInputElement)?.value?.trim(),
                href: (document.getElementById("swal-href") as HTMLInputElement)?.value?.trim(),
                openInNewTab: (document.getElementById("swal-newtab") as HTMLInputElement)?.checked,
                isActive: (document.getElementById("swal-active") as HTMLInputElement)?.checked,
            }),
        }).then((result) => handleConfirmEdit(result, link));
    };



    const handleDeleteLink = async (link: FooterLink) => {
        const confirmed = await showDeleteConfirm(link.label);
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/admin/footer-links/${link.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setLinks(links.filter((l) => l.id !== link.id));
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
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <LinkIcon className="h-6 w-6 text-[#1a56db]" />
                    จัดการเมนูลัดส่วนท้าย
                </h1>
                <p className="text-muted-foreground mt-1">เพิ่ม แก้ไข หรือลบลิงก์ที่แสดงในส่วนท้ายของเว็บไซต์</p>
            </div>

            {/* Toggle Active */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="font-medium">แสดงผลบนหน้าเว็บ</p>
                    <p className="text-sm text-muted-foreground">เปิดเพื่อโชว์เมนูนี้ให้ลูกค้าเห็น</p>
                </div>
                <Switch
                    checked={settings?.isActive ?? false}
                    onCheckedChange={handleToggleActive}
                />
            </div>

            {/* Add New Link Form */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#1a56db] rounded flex items-center justify-center">
                        <Plus className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-bold">เพิ่มลิงก์ใหม่</span>
                </div>
                <form onSubmit={handleAddLink} className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="newLabel">ข้อความที่โชว์</Label>
                            <Input id="newLabel" placeholder="เช่น วิธีเติมเงิน, ติดต่อเรา" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newHref">ลิงก์ไปที่</Label>
                            <Input id="newHref" placeholder="เช่น /how-to-topup" value={newHref} onChange={(e) => setNewHref(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="newOpenInNewTab" checked={newOpenInNewTab} onCheckedChange={(checked) => setNewOpenInNewTab(checked === true)} />
                            <Label htmlFor="newOpenInNewTab" className="text-sm font-normal cursor-pointer">เปิดแท็บใหม่ (สำหรับลิงก์ออกไปเว็บอื่น)</Label>
                        </div>
                        <Button type="submit" disabled={saving} className="w-full bg-[#1a56db] hover:bg-[#1e40af] sm:w-auto">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            เพิ่มลิงก์
                        </Button>
                    </div>
                </form>
            </div>

            {/* Links List */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#1a56db] rounded flex items-center justify-center">
                        <LinkIcon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-bold">รายการลิงก์ ({links.length})</span>
                </div>
                {links.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">ยังไม่มีลิงก์ เพิ่มลิงก์แรกของคุณด้านบน</div>
                ) : (
                    <div className="overflow-x-auto">
                    <Table className="min-w-[760px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>ข้อความ</TableHead>
                                <TableHead>ลิงก์</TableHead>
                                <TableHead className="text-center">แท็บใหม่</TableHead>
                                <TableHead className="text-center">สถานะ</TableHead>
                                <TableHead className="text-right">จัดการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {links.map((link) => (
                                <TableRow key={link.id}>
                                    <TableCell>
                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {link.label}
                                    </TableCell>
                                    <TableCell>
                                        <a
                                            href={link.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline group max-w-[250px]"
                                        >
                                            <span className="truncate">{link.href}</span>
                                            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {link.openInNewTab && (
                                            <ExternalLink className="h-4 w-4 mx-auto text-blue-500" />
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span
                                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${link.isActive
                                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                                                }`}
                                        >
                                            {link.isActive ? "แสดง" : "ซ่อน"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditModal(link)}
                                                aria-label={`แก้ไขลิงก์ ${link.label}`}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleDeleteLink(link)}
                                                aria-label={`ลบลิงก์ ${link.label}`}
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
