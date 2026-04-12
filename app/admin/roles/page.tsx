"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Crown,
  Loader2,
  Pencil,
  Plus,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import { showDeleteConfirm, showError, showSuccess, showWarning } from "@/lib/swal";
import {
  PERMISSIONS,
  getRequiredPermissions,
  isPermissionImpliedBySelection,
  normalizePermissionSelection,
  type Permission,
} from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";

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

function normalizeRolePermissions(raw: Role["permissions"] | string[] | null | undefined) {
  return normalizePermissionSelection(raw);
}

const PERMISSION_GROUPS = {
  "แดชบอร์ด": [{ key: PERMISSIONS.DASHBOARD_VIEW, label: "ดูแดชบอร์ด" }],
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
    { key: PERMISSIONS.AUDIT_LOG_DELETE, label: "ลบ Audit Log" },
    { key: PERMISSIONS.API_KEY_MANAGE, label: "จัดการ API Key" },
  ],
  "แชท": [
    { key: PERMISSIONS.CHAT_VIEW, label: "ดูแชทลูกค้า" },
    { key: PERMISSIONS.CHAT_MANAGE, label: "ตอบและจัดการแชท" },
  ],
  "คอนเทนต์": [
    { key: PERMISSIONS.CONTENT_VIEW, label: "ดูคอนเทนต์" },
    { key: PERMISSIONS.CONTENT_EDIT, label: "แก้ไขคอนเทนต์" },
  ],
  "โปรโมชัน": [
    { key: PERMISSIONS.PROMO_VIEW, label: "ดูโปรโมชัน" },
    { key: PERMISSIONS.PROMO_EDIT, label: "แก้ไขโปรโมชัน" },
  ],
  "กาชา": [
    { key: PERMISSIONS.GACHA_VIEW, label: "ดูกาชา" },
    { key: PERMISSIONS.GACHA_EDIT, label: "แก้ไขกาชา" },
  ],
  "Season Pass": [
    { key: PERMISSIONS.SEASON_PASS_VIEW, label: "ดู Season Pass" },
    { key: PERMISSIONS.SEASON_PASS_EDIT, label: "แก้ไข Season Pass" },
  ],
  "รายงาน/ส่งออก": [{ key: PERMISSIONS.EXPORT_DATA, label: "ส่งออกข้อมูล" }],
} as const;

const ALL_PERMISSION_KEYS = Object.values(PERMISSION_GROUPS).flatMap((permissions) =>
  permissions.map((permission) => permission.key)
);

export default function AdminRolesPage() {
  const permissions = useAdminPermissions();
  const canManageRoles = permissions.includes(PERMISSIONS.USER_MANAGE_ROLE);
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

  const normalizedSelectedPermissions = useMemo(
    () => normalizePermissionSelection(formData.permissions),
    [formData.permissions]
  );
  const selectedPermissionCount = normalizedSelectedPermissions.length;
  const totalPermissionCount = ALL_PERMISSION_KEYS.length;
  const selectedPermissionSet = useMemo(
    () => new Set(normalizedSelectedPermissions),
    [normalizedSelectedPermissions]
  );

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/roles");
      if (response.ok) {
        setRoles(await response.json());
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRoles();
  }, [fetchRoles]);

  const openPanel = (role?: Role) => {
    if (!canManageRoles) {
      showError("คุณไม่มีสิทธิ์จัดการยศ");
      return;
    }

    if (role) {
      setSelectedRole(role);
      const permissions = normalizeRolePermissions(role.permissions);

      setFormData({
        name: role.name,
        code: role.code,
        iconUrl: role.iconUrl || "",
        description: role.description || "",
        permissions,
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

    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setSelectedRole(null);
  };

  const togglePermission = (permission: string) => {
    if (!canManageRoles) {
      return;
    }

    const normalizedPermission = permission as Permission;

    setFormData((previous) => ({
      ...previous,
      permissions: previous.permissions.includes(normalizedPermission)
        ? previous.permissions.filter((item) => item !== normalizedPermission)
        : normalizePermissionSelection([...previous.permissions, normalizedPermission]),
    }));
  };

  const togglePermissionGroup = (permissions: readonly { key: string; label: string }[]) => {
    if (!canManageRoles) {
      return;
    }

    setFormData((previous) => {
      const keys = permissions.map((permission) => permission.key);
      const allSelected = keys.every((key) => previous.permissions.includes(key));

      if (allSelected) {
        return {
          ...previous,
          permissions: previous.permissions.filter((permission) => !keys.includes(permission)),
        };
      }

      return {
        ...previous,
        permissions: normalizePermissionSelection([...previous.permissions, ...keys]),
      };
    });
  };

  const toggleAllPermissions = () => {
    if (!canManageRoles) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      permissions:
        previous.permissions.length === totalPermissionCount
          ? []
          : normalizePermissionSelection(ALL_PERMISSION_KEYS),
    }));
  };

  const handleSave = async () => {
    if (!canManageRoles) {
      showError("คุณไม่มีสิทธิ์จัดการยศ");
      return;
    }

    if (!formData.name.trim()) {
      showWarning("กรุณาระบุชื่อยศ");
      return;
    }

    setSaving(true);
    try {
      const url = selectedRole ? `/api/admin/roles/${selectedRole.id}` : "/api/admin/roles";
      const method = selectedRole ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        closePanel();
        await fetchRoles();
        showSuccess(selectedRole ? "บันทึกยศเรียบร้อย" : "เพิ่มยศเรียบร้อย");
      } else {
        const data = await response.json();
        showError(data.error || "เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch {
      showError("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (!canManageRoles) {
      showError("คุณไม่มีสิทธิ์จัดการยศ");
      return;
    }

    if (role.isSystem) {
      showWarning("ไม่สามารถลบยศระบบได้");
      return;
    }

    const confirmed = await showDeleteConfirm(role.name);
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/roles/${role.id}`, { method: "DELETE" });
      if (response.ok) {
        await fetchRoles();
        showSuccess("ลบยศเรียบร้อย");
      } else {
        const data = await response.json();
        showError(data.error || "เกิดข้อผิดพลาดในการลบ");
      }
    } catch {
      showError("เกิดข้อผิดพลาดในการลบ");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Shield className="h-6 w-6 text-[#1a56db]" />
            จัดการยศแอดมิน
          </h1>
          <p className="mt-1 text-muted-foreground">เพิ่ม แก้ไข หรือลบยศของผู้ดูแลระบบ</p>
        </div>

        <Button
          onClick={() => openPanel()}
          disabled={!canManageRoles}
          className="w-full bg-[#1a56db] hover:bg-[#1e40af] sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          เพิ่มยศ
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1a56db]">
            <Shield className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-foreground">รายการยศ</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : null}

        {!loading && roles.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Shield className="mx-auto mb-4 h-12 w-12 opacity-30" />
            <p>ยังไม่มียศ</p>
            <Button variant="link" className="mt-2" onClick={() => openPanel()} disabled={!canManageRoles}>
              เพิ่มยศแรก
            </Button>
          </div>
        ) : null}

        {!loading && roles.length > 0 ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                  <TableHead className="w-16">ไอคอน</TableHead>
                  <TableHead>ชื่อยศ</TableHead>
                  <TableHead className="hidden md:table-cell">คำอธิบาย</TableHead>
                  <TableHead className="w-28 text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role, index) => (
                  <TableRow
                    key={role.id}
                    className={index % 2 === 0 ? "bg-white" : "bg-slate-50/35"}
                  >
                    <TableCell>
                      <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted">
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
                        <span className="font-semibold text-slate-900">{role.name}</span>
                        {role.isSystem ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            ระบบ
                          </span>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {role.description || "ยังไม่ได้ตั้งคำอธิบาย"}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPanel(role)}
                          disabled={!canManageRoles}
                          title={`แก้ไข ${role.name}`}
                          aria-label={`แก้ไขยศ ${role.name}`}
                          className="rounded-xl border border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-[#1a56db]"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(role)}
                          disabled={!canManageRoles || role.isSystem}
                          title={role.isSystem ? "ยศระบบลบไม่ได้" : `ลบ ${role.name}`}
                          aria-label={`ลบยศ ${role.name}`}
                          className="rounded-xl border border-transparent text-rose-500 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
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
        ) : null}
      </div>

      {isPanelOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closePanel}
            aria-label="ปิดหน้าต่าง"
          />

          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-[#1a56db] to-[#1e40af] px-6 py-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {selectedRole ? "แก้ไขยศ" : "เพิ่มยศใหม่"}
                  </h2>
                  <p className="text-xs text-white/80">
                    เลือกสิทธิ์แล้ว {selectedPermissionCount} จาก {totalPermissionCount} รายการ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div className="space-y-1.5">
                <Label htmlFor="panel-name">ชื่อยศ *</Label>
                <Input
                  id="panel-name"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, name: event.target.value }))
                  }
                  disabled={!canManageRoles}
                  placeholder="เช่น แอดมินผู้ช่วย"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="panel-description">คำอธิบาย</Label>
                <Input
                  id="panel-description"
                  value={formData.description}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  disabled={!canManageRoles}
                  placeholder="สรุปหน้าที่ของยศนี้แบบสั้นๆ"
                />
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Label>สิทธิ์การใช้งาน</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleAllPermissions}
                    disabled={!canManageRoles}
                    className="rounded-full"
                  >
                    {selectedPermissionCount === totalPermissionCount
                      ? "ล้างสิทธิ์ทั้งหมด"
                      : "เลือกทั้งหมด"}
                  </Button>
                </div>

                <div className="overflow-hidden rounded-xl border border-border">
                  {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions], index) => {
                    const groupCount = permissions.filter((permission) =>
                      selectedPermissionSet.has(permission.key)
                    ).length;
                    const groupAllSelected = groupCount === permissions.length;

                    return (
                      <div
                        key={groupName}
                        className={index > 0 ? "border-t border-border" : ""}
                      >
                        <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-2.5">
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {groupName}
                            </h4>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              เลือกแล้ว {groupCount} จาก {permissions.length} สิทธิ์
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePermissionGroup(permissions)}
                            disabled={!canManageRoles}
                            className="h-8 rounded-full px-3 text-xs text-slate-600 hover:bg-white"
                          >
                            {groupAllSelected ? "ล้างทั้งหมวด" : "เลือกทั้งหมวด"}
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-0 px-4 py-2">
                          {permissions.map((permission) => (
                            <div key={permission.key} className="flex items-center gap-2 py-2">
                              <Checkbox
                                id={`panel-${permission.key}`}
                                checked={selectedPermissionSet.has(permission.key)}
                                disabled={
                                  !canManageRoles ||
                                  (selectedPermissionSet.has(permission.key) &&
                                    isPermissionImpliedBySelection(
                                      permission.key,
                                      formData.permissions
                                    ))
                                }
                                onCheckedChange={() => togglePermission(permission.key)}
                              />
                              <label
                                htmlFor={`panel-${permission.key}`}
                                className="cursor-pointer select-none text-sm"
                                title={
                                  selectedPermissionSet.has(permission.key) &&
                                  isPermissionImpliedBySelection(
                                    permission.key,
                                    formData.permissions
                                  )
                                    ? `สิทธิ์นี้ถูกเลือกอัตโนมัติเพราะ ${
                                        getRequiredPermissions(permission.key).length > 0
                                          ? "มีสิทธิ์ที่ต้องพึ่งพา"
                                          : "เป็นสิทธิ์ที่เกี่ยวข้อง"
                                      }`
                                    : undefined
                                }
                              >
                                {permission.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex gap-3 border-t border-border bg-slate-50 px-6 py-4">
              <Button
                variant="outline"
                onClick={closePanel}
                disabled={saving}
                className="flex-1"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleSave}
                disabled={!canManageRoles || saving}
                className="flex-1 bg-[#1a56db] hover:bg-[#1e40af]"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {selectedRole ? "บันทึก" : "เพิ่มยศ"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
