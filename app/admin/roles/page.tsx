"use client";

import { useState, useEffect } from "react";
import { showWarning, showError, showSuccess, showConfirm } from "@/lib/swal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
    Shield,
    Crown,
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

// Permission groups for better UI
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
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        iconUrl: "",
        description: "",
        permissions: [] as string[],
        sortOrder: 0,
    });

    // Fetch roles
    const fetchRoles = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/roles");
            if (res.ok) {
                const data = await res.json();
                setRoles(data);
            }
        } catch (error) {
            console.error("Error fetching roles:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    // Open dialog for create/edit
    const openDialog = (role?: Role) => {
        if (role) {
            setSelectedRole(role);
            let perms: string[] = [];
            try {
                perms = role.permissions ? JSON.parse(role.permissions) : [];
            } catch {
                perms = [];
            }
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
            setFormData({
                name: "",
                code: "",
                iconUrl: "",
                description: "",
                permissions: [],
                sortOrder: 0,
            });
        }
        setIsDialogOpen(true);
    };

    // Toggle permission
    const togglePermission = (permission: string) => {
        setFormData((prev) => ({
            ...prev,
            permissions: prev.permissions.includes(permission)
                ? prev.permissions.filter((p) => p !== permission)
                : [...prev.permissions, permission],
        }));
    };

    // Save role
    const handleSave = async () => {
        if (!formData.name) {
            showWarning("กรุณาระบุชื่อยศ");
            return;
        }

        setSaving(true);
        try {
            const url = selectedRole
                ? `/api/admin/roles/${selectedRole.id}`
                : "/api/admin/roles";
            const method = selectedRole ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setIsDialogOpen(false);
                fetchRoles();
                showSuccess(selectedRole ? "บันทึกยศเรียบร้อย" : "เพิ่มยศเรียบร้อย");
            } else {
                const data = await res.json();
                showError(data.error || "เกิดข้อผิดพลาดในการบันทึก");
            }
        } catch (error) {
            console.error("Error saving role:", error);
            showError("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setSaving(false);
        }
    };

    // Delete role
    const handleDelete = async (role: Role) => {
        if (role.isSystem) {
            showWarning("ไม่สามารถลบยศระบบได้");
            return;
        }

        const confirmed = await showConfirm(
            "ยืนยันการลบ",
            `คุณต้องการลบยศ "${role.name}" ใช่หรือไม่?`
        );

        if (!confirmed) return;

        try {
            const res = await fetch(`/api/admin/roles/${role.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                fetchRoles();
                showSuccess("ลบยศเรียบร้อย");
            } else {
                const data = await res.json();
                showError(data.error || "เกิดข้อผิดพลาดในการลบ");
            }
        } catch (error) {
            console.error("Error deleting role:", error);
            showError("เกิดข้อผิดพลาดในการลบ");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Shield className="h-6 w-6" />
                        จัดการยศแอดมิน
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        เพิ่ม แก้ไข หรือลบยศของผู้ดูแลระบบ
                    </p>
                </div>
                <Button onClick={() => openDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มยศ
                </Button>
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : roles.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>ยังไม่มียศ</p>
                        <Button
                            variant="link"
                            className="mt-2"
                            onClick={() => openDialog()}
                        >
                            เพิ่มยศแรก
                        </Button>
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
                                                <Image
                                                    src={role.iconUrl}
                                                    alt={role.name}
                                                    fill
                                                    sizes="40px"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <Crown className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{role.name}</span>
                                            {role.isSystem && (
                                                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                                    ระบบ
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground">
                                        {role.description || "-"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openDialog(role)}
                                            >
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

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedRole ? "แก้ไขยศ" : "เพิ่มยศใหม่"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Basic Info */}
                        <div className="space-y-2">
                            <Label htmlFor="name">ชื่อยศ *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                placeholder="เช่น แอดมินผู้ช่วย"
                            />
                        </div>

                        {/* Permissions */}
                        <div className="space-y-4">
                            <Label>สิทธิ์การใช้งาน</Label>
                            <div className="border rounded-lg p-4 space-y-4">
                                {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                                    <div key={group}>
                                        <h4 className="font-medium text-sm text-muted-foreground mb-2">
                                            {group}
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {perms.map((perm) => (
                                                <div
                                                    key={perm.key}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Checkbox
                                                        id={perm.key}
                                                        checked={formData.permissions.includes(perm.key)}
                                                        onCheckedChange={() => togglePermission(perm.key)}
                                                    />
                                                    <label
                                                        htmlFor={perm.key}
                                                        className="text-sm cursor-pointer"
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
                            {selectedRole ? "บันทึก" : "เพิ่ม"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
