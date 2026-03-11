"use client";

import { useState, useEffect, useCallback } from "react";
import { showWarning, showError, showSuccess, showDeleteConfirm } from "@/lib/swal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
    Shield,
    Crown,
    X,
} from "lucide-react";
import Image from "next/image";
import { PERMISSIONS } from "@/lib/permissions";

interface Role {
    id: string;
    name: string;
    code: string;
    iconUrl: string | null;
    description: string | null;
    permissions: string | null;
    sortOrder: number;
    isSystem: boolean;
    createdAt: string;
}

const PERMISSION_GROUPS = {
    "สินค้า": [
        { key: PERMISSIONS.PRODUCT_VIEW, label: "ดูสินค้า" },
        { key: PERMISSIONS.PRODUCT_CREATE, label: "เพิ่มสินค้า" },
        { key: PERMISSIONS.PRODUCT_EDIT, label: "แก้ไขสินค้า" },
        { key: PERMISSIONS.PRODUCT_DELETE, label: "ลบสินค้า" },
    ],
    "ผู้ใช้": [
        { key: PERMISSIONS.USER_VIEW, label: "ดูผู้ใช้" },
        { key: PERMISSIONS.USER_EDIT, label: "แก้ไขผู้ใช้" },
        { key: PERMISSIONS.USER_DELETE, label: "ลบผู้ใช้" },
        { key: PERMISSIONS.USER_MANAGE_ROLE, label: "จัดการยศ" },
    ],
    "คำสั่งซื้อ": [
        { key: PERMISSIONS.ORDER_VIEW, label: "ดูคำสั่งซื้อตัวเอง" },
        { key: PERMISSIONS.ORDER_VIEW_ALL, label: "ดูคำสั่งซื้อทั้งหมด" },
    ],
    "สลิป/เติมเงิน": [
        { key: PERMISSIONS.SLIP_VIEW, label: "ดูสลิป" },
        { key: PERMISSIONS.SLIP_APPROVE, label: "อนุมัติสลิป" },
        { key: PERMISSIONS.SLIP_REJECT, label: "ปฏิเสธสลิป" },
    ],
    "ตั้งค่า": [
        { key: PERMISSIONS.SETTINGS_VIEW, label: "ดูตั้งค่า" },
        { key: PERMISSIONS.SETTINGS_EDIT, label: "แก้ไขตั้งค่า" },
    ],
    "ระบบ": [
        { key: PERMISSIONS.ADMIN_PANEL, label: "เข้าหน้าแอดมิน" },
        { key: PERMISSIONS.AUDIT_LOG_VIEW, label: "ดู Audit Log" },
        { key: PERMISSIONS.API_KEY_MANAGE, label: "จัดการ API Key" },
    ],
};

export default function AdminRolesPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        iconUrl: "",
        description: "",
        permissions: [] as string[],
        sortOrder: 0,
    });

    const fetchRoles = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/roles");
            if (res.ok) setRoles(await res.json());
        } catch (error) {
            console.error("Error fetching roles:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRoles(); }, [fetchRoles]);

    const openPanel = (role?: Role) => {
        if (role) {
            setSelectedRole(role);
            let perms: string[] = [];
            try { perms = role.permissions ? JSON.parse(role.permissions) : []; } catch { perms = []; }
            setFormData({
                name: role.name,
                code: role.code,
                iconUrl: role.iconUrl || "",
                description: role.description || "",
                permissions: perms,
                sortOrder: role.sortOrder,
            });
        } else {
            setSelectedRole(null);
            setFormData({ name: "", code: "", iconUrl: "", description: "", permissions: [], sortOrder: 0 });
        }
        setIsPanelOpen(true);
    };

    const closePanel = () => { setIsPanelOpen(false); setSelectedRole(null); };

    const togglePermission = (permission: string) => {
        setFormData((prev) => ({
            ...prev,
            permissions: prev.permissions.includes(permission)
                ? prev.permissions.filter((p) => p !== permission)
                : [...prev.permissions, permission],
        }));
    };

    const handleSave = async () => {
        if (!formData.name) { showWarning("กรุณาระบุชื่อยศ"); return; }

        setSaving(true);
        try {
            const url = selectedRole ? `/api/admin/roles/${selectedRole.id}` : "/api/admin/roles";
            const method = selectedRole ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                closePanel();
                fetchRoles();
                showSuccess(selectedRole ? "บันทึกยศเรียบร้อย" : "เพิ่มยศเรียบร้อย");
            } else {
                const data = await res.json();
                showError(data.error || "เกิดข้อผิดพลาดในการบันทึก");
            }
        } catch {
            showError("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (role: Role) => {
        if (role.isSystem) { showWarning("ไม่สามารถลบยศระบบได้"); return; }
        const confirmed = await showDeleteConfirm(role.name);
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/admin/roles/${role.id}`, { method: "DELETE" });
            if (res.ok) {
                fetchRoles();
                showSuccess("ลบยศเรียบร้อย");
            } else {
                const data = await res.json();
                showError(data.error || "เกิดข้อผิดพลาดในการลบ");
            }
        } catch {
            showError("เกิดข้อผิดพลาดในการลบ");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Shield className="h-6 w-6 text-[#1a56db]" />
                        จัดการยศแอดมิน
                    </h1>
                    <p className="text-muted-foreground mt-1">เพิ่ม แก้ไข หรือลบยศของผู้ดูแลระบบ</p>
                </div>
                <Button onClick={() => openPanel()} className="bg-[#1a56db] hover:bg-[#1e40af]">
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มยศ
                </Button>
            </div>

            {/* Table Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
                {/* Card Header */}
                <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#1a56db] rounded flex items-center justify-center">
                        <Shield className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-bold text-foreground">รายการยศ</span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : roles.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p>ยังไม่มียศ</p>
                        <Button variant="link" className="mt-2" onClick={() => openPanel()}>เพิ่มยศแรก</Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16">ไอคอน</TableHead>
                                <TableHead>ชื่อยศ</TableHead>
                                <TableHead className="hidden md:table-cell">คำอธิบาย</TableHead>
                                <TableHead className="w-24 text-center">จัดการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {roles.map((role) => (
                                <TableRow key={role.id}>
                                    <TableCell>
                                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                                            {role.iconUrl ? (
                                                <Image src={role.iconUrl} alt={role.name} fill sizes="40px" className="object-cover" />
                                            ) : (
                                                <Crown className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{role.name}</span>
                                            {role.isSystem && (
                                                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">ระบบ</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                                        {role.description || "-"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => openPanel(role)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(role)}
                                                disabled={role.isSystem}
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

            {/* Modal Overlay */}
            {isPanelOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={closePanel}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                closePanel();
                            }
                        }}
                    />
                    {/* Modal */}
                    <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 shadow-2xl rounded-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Panel Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-[#1a56db] to-[#1e40af]">
                            <div className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-white" />
                                <h2 className="text-lg font-bold text-white">
                                    {selectedRole ? "แก้ไขยศ" : "เพิ่มยศใหม่"}
                                </h2>
                            </div>
                            <button
                                onClick={closePanel}
                                className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Panel Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                            {/* Name */}
                            <div className="space-y-1.5">
                                <Label htmlFor="panel-name">ชื่อยศ *</Label>
                                <Input
                                    id="panel-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="เช่น แอดมินผู้ช่วย"
                                />
                            </div>

                            {/* Permissions */}
                            <div className="space-y-3">
                                <Label>สิทธิ์การใช้งาน</Label>
                                <div className="rounded-xl border border-border overflow-hidden">
                                    {Object.entries(PERMISSION_GROUPS).map(([group, perms], idx) => (
                                        <div key={group} className={idx > 0 ? "border-t border-border" : ""}>
                                            <div className="px-4 py-2 bg-gray-50 dark:bg-zinc-800">
                                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                    {group}
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-2 gap-0 px-4 py-2">
                                                {perms.map((perm) => (
                                                    <div
                                                        key={perm.key}
                                                        className="flex items-center gap-2 py-1.5 cursor-pointer"
                                                        onClick={() => togglePermission(perm.key)}
                                                        role="button"
                                                        tabIndex={0}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                togglePermission(perm.key);
                                                            }
                                                        }}
                                                    >
                                                        <Checkbox
                                                            id={`panel-${perm.key}`}
                                                            checked={formData.permissions.includes(perm.key)}
                                                            onCheckedChange={() => togglePermission(perm.key)}
                                                        />
                                                        <label
                                                            htmlFor={`panel-${perm.key}`}
                                                            className="text-sm cursor-pointer select-none"
                                                        >
                                                            {perm.label}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Panel Footer */}
                        <div className="px-6 py-4 border-t border-border flex gap-3 bg-gray-50 dark:bg-zinc-800">
                            <Button variant="outline" onClick={closePanel} disabled={saving} className="flex-1">
                                ยกเลิก
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 bg-[#1a56db] hover:bg-[#1e40af]"
                            >
                                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {selectedRole ? "บันทึก" : "เพิ่มยศ"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
