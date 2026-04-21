"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { showError, showSuccess, showLoading, hideLoading } from "@/lib/swal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrencySettings } from "@/hooks/useCurrencySettings";
import { getPointCurrencyName, getPointCurrencySymbol } from "@/lib/currencySettings";
import { Coins, Crown, Gem, KeyRound, LockKeyhole, Pencil, Search, ShieldOff, Users, X } from "lucide-react";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { PERMISSIONS } from "@/lib/permissions";

const VIP_TOPUP_THRESHOLD = 10000;
const GOLD_BORDER_POINTS_THRESHOLD = 5000;
const MAX_DECIMAL_BALANCE = 99999999.99;
const MAX_INTEGER_BALANCE = 2147483647;

interface User {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  role: string;
  creditBalance: string;
  totalTopup: string;
  pointBalance: number;
  lifetimePoints: number;
  createdAt: string;
  hasPin: boolean;
  pinLockedUntil: string | null;
  pinUpdatedAt: string | null;
}

interface Role {
  id: string;
  name: string;
  code: string;
  iconUrl: string | null;
}

interface RoleOption {
  code: string;
  label: string;
}

interface AdminUsersClientProps {
  initialUsers: User[];
}

function formatCurrency(value: number) {
  return `฿${value.toLocaleString()}`;
}

function formatRoleLabel(role: string) {
  switch (role) {
    case "ADMIN":
      return "แอดมิน";
    case "MODERATOR":
      return "ผู้ดูแล";
    case "SELLER":
      return "ผู้ขาย";
    default:
      return "ผู้ใช้";
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isInternalRoleCode(code: string) {
  return /^ROLE_[A-Z0-9]+$/.test(code);
}

function getSystemRoleLabel(role: string) {
  switch (role) {
    case "ADMIN":
    case "MODERATOR":
    case "SELLER":
    case "USER":
      return formatRoleLabel(role);
    default:
      return null;
  }
}

function sanitizeDecimalInput(value: string) {
  const sanitized = value.replaceAll(/[^\d.]/g, "");
  const [integerPart = "", ...fractionParts] = sanitized.split(".");
  const mergedFraction = fractionParts.join("");
  const limitedInteger = integerPart.slice(0, 8);
  const limitedFraction = mergedFraction.slice(0, 2);

  if (!sanitized.includes(".")) {
    return limitedInteger;
  }

  return `${limitedInteger}.${limitedFraction}`;
}

function sanitizeIntegerInput(value: string) {
  return value.replaceAll(/\D/g, "").slice(0, 10);
}

function isValidDecimalInput(value: string) {
  return /^\d+(\.\d{1,2})?$/.test(value);
}

function isValidIntegerInput(value: string) {
  return /^\d+$/.test(value);
}

function buildRoleOptions(roles: Role[]): RoleOption[] {
  const systemRoleOrder = ["USER", "MODERATOR", "SELLER", "ADMIN"] as const;
  const optionMap = new Map<string, RoleOption>();

  for (const code of systemRoleOrder) {
    optionMap.set(code, {
      code,
      label: `${formatRoleLabel(code)} (${code})`,
    });
  }

  for (const role of roles) {
    const normalizedCode = role.code.trim().toUpperCase();
    const normalizedName = role.name.trim();
    if (!normalizedCode) {
      continue;
    }

    if (optionMap.has(normalizedCode) && systemRoleOrder.includes(normalizedCode as typeof systemRoleOrder[number])) {
      continue;
    }

    const readableLabel =
      normalizedName.length > 0 ? normalizedName : formatRoleLabel(normalizedCode);

    optionMap.set(normalizedCode, {
      code: normalizedCode,
      label: isInternalRoleCode(normalizedCode)
        ? readableLabel
        : `${readableLabel} (${normalizedCode})`,
    });
  }

  return Array.from(optionMap.values());
}

function getRoleBadgeClassName(role: string) {
  if (role === "ADMIN") {
    return "bg-blue-100 text-blue-700";
  }

  if (role === "MODERATOR") {
    return "bg-violet-100 text-violet-700";
  }

  if (role === "SELLER") {
    return "bg-emerald-100 text-emerald-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getPinActionText(action: "RESET_PIN" | "UNLOCK_PIN") {
  return action === "RESET_PIN" ? "รีเซ็ต PIN" : "ปลดล็อก PIN";
}

function getPinActionConfirmMessage(action: "RESET_PIN" | "UNLOCK_PIN", username: string) {
  if (action === "RESET_PIN") {
    return `ต้องการลบ PIN ของ ${username} เพื่อให้ผู้ใช้ตั้งค่าใหม่หรือไม่?`;
  }

  return `ต้องการปลดล็อก PIN ของ ${username} ใช่หรือไม่?`;
}

function getStrongEmphasisCardClassName(emphasis: "soft" | "strong") {
  return emphasis === "strong" ? "border-slate-200 bg-white" : "border-slate-200/90 bg-white/90";
}

function getStatValueClassName(emphasis: "soft" | "strong") {
  return emphasis === "strong" ? "text-[2rem] leading-none" : "text-3xl leading-none";
}

function getSearchResultsLabel(searchActive: boolean, filteredUsersLength: number, usersLength: number) {
  if (searchActive) {
    return `ผลลัพธ์ ${filteredUsersLength} จาก ${usersLength} รายการ`;
  }

  return `ทั้งหมด ${usersLength} รายการ`;
}

function getUsersSectionCountSuffix(searchActive: boolean, usersLength: number) {
  return searchActive ? ` จาก ${usersLength}` : "";
}

function getEmptyUsersText(searchActive: boolean) {
  return searchActive ? "ไม่พบสมาชิกที่ตรงกับคำค้นหา" : "ยังไม่มีสมาชิก";
}

export default function AdminUsersClient({ initialUsers }: Readonly<AdminUsersClientProps>) {
  const currencySettings = useCurrencySettings();
  const pointCurrencyName = getPointCurrencyName(currencySettings);
  const pointCurrencySymbol = getPointCurrencySymbol(currencySettings);
  const permissions = useAdminPermissions();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [renderTimestamp] = useState(() => Date.now());
  const canEditUsers = permissions.includes(PERMISSIONS.USER_EDIT);
  const canManageRoles = permissions.includes(PERMISSIONS.USER_MANAGE_ROLE);

  const handlePinAdminAction = async (user: User, action: "RESET_PIN" | "UNLOCK_PIN") => {
    if (!canEditUsers) {
      showError("คุณไม่มีสิทธิ์จัดการ PIN ของผู้ใช้");
      return;
    }

    const title = getPinActionText(action);
    const text = getPinActionConfirmMessage(action, user.username);

    const confirmed = await Swal.fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: getPinActionText(action),
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
      confirmButtonColor: action === "RESET_PIN" ? "#dc2626" : "#2563eb",
      cancelButtonColor: "#6b7280",
    });

    if (!confirmed.isConfirmed) {
      return;
    }

    showLoading("กำลังอัปเดตสถานะ PIN...");
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      hideLoading();

      if (!response.ok) {
        showError(data.error || "เกิดข้อผิดพลาด");
        return;
      }

      setUsers((previous) =>
        previous.map((item) =>
          item.id === user.id
            ? {
                ...item,
                hasPin: Boolean(data.user?.hasPin),
                pinLockedUntil: data.user?.pinLockedUntil ?? null,
                pinUpdatedAt: data.user?.pinUpdatedAt ?? null,
              }
            : item
        )
      );
      showSuccess(data.message || "อัปเดต PIN สำเร็จ");
    } catch {
      hideLoading();
      showError("เกิดข้อผิดพลาดในการจัดการ PIN");
    }
  };

  useEffect(() => {
    if (!canManageRoles) {
      return;
    }

    fetch("/api/admin/roles")
      .then(async (response) => {
        if (!response.ok) {
          return [];
        }

        return response.json();
      })
      .then((data) => setRoles(Array.isArray(data) ? data : []))
      .catch(() => setRoles([]));
  }, [canManageRoles]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users;
    }

    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(query) ||
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const vipCount = users.filter((user) => Number(user.totalTopup) > VIP_TOPUP_THRESHOLD).length;
  const totalCredits = users.reduce((sum, user) => sum + Number(user.creditBalance), 0);
  const totalPoints = users.reduce((sum, user) => sum + user.pointBalance, 0);
  const searchActive = searchQuery.trim().length > 0;
  const roleOptions = useMemo(() => buildRoleOptions(roles), [roles]);
  const roleNameByCode = useMemo(() => {
    const entries = roles
      .map((role) => {
        const code = role.code.trim().toUpperCase();
        const name = role.name.trim();
        return code && name ? [code, name] : null;
      })
      .filter((entry): entry is [string, string] => entry !== null);

    return new Map<string, string>(entries);
  }, [roles]);

  const getRoleDisplayName = (roleCode: string) => {
    const normalizedCode = roleCode.trim().toUpperCase();
    const systemLabel = getSystemRoleLabel(normalizedCode);
    if (systemLabel) {
      return systemLabel;
    }

    const customRoleName = roleNameByCode.get(normalizedCode);
    if (customRoleName) {
      return customRoleName;
    }

    return isInternalRoleCode(normalizedCode) ? "บทบาทพิเศษ" : normalizedCode;
  };

  const handleEditConfirm = async (
    result: { isConfirmed: boolean; value?: Record<string, unknown> },
    user: User
  ) => {
    if (!result.isConfirmed || !result.value) {
      return;
    }

    showLoading("กำลังบันทึก...");
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.value),
      });
      const data = await response.json();
      hideLoading();

      if (!response.ok) {
        showError(data.error || "เกิดข้อผิดพลาด");
        return;
      }

      setUsers((previous) =>
        previous.map((item) =>
          item.id === user.id
            ? {
                ...item,
                creditBalance: data.user.creditBalance,
                totalTopup: data.user.totalTopup,
                pointBalance: data.user.pointBalance,
                lifetimePoints: data.user.lifetimePoints,
                role: data.user.role,
              }
            : item
        )
      );
      showSuccess("บันทึกข้อมูลสำเร็จ");
    } catch {
      hideLoading();
      showError("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const openEditDialog = (user: User) => {
    const currentRoleCode = user.role.trim().toUpperCase();
    const availableRoleOptions = roleOptions.some((role) => role.code === currentRoleCode)
      ? roleOptions
      : [
          ...roleOptions,
          {
            code: currentRoleCode,
            label: isInternalRoleCode(currentRoleCode)
              ? formatRoleLabel(currentRoleCode)
              : `${formatRoleLabel(currentRoleCode)} (${currentRoleCode})`,
          },
        ];

    const selectOptions = availableRoleOptions
      .map(
        (role) =>
          `<option value="${escapeHtml(role.code)}" ${
            role.code === currentRoleCode ? "selected" : ""
          }>${escapeHtml(role.label)}</option>`
      )
      .join("");

    const bindNumericInput = (
      elementId: string,
      sanitizer: (value: string) => string,
      options?: { allowDecimalPoint?: boolean }
    ) => {
      const input = document.getElementById(elementId) as HTMLInputElement | null;
      if (!input) {
        return;
      }

      input.addEventListener("input", () => {
        input.value = sanitizer(input.value);
      });

      input.addEventListener("keydown", (event) => {
        const allowedKeys = new Set([
          "Backspace",
          "Delete",
          "Tab",
          "ArrowLeft",
          "ArrowRight",
          "Home",
          "End",
        ]);

        if (allowedKeys.has(event.key)) {
          return;
        }

        if (options?.allowDecimalPoint && event.key === ".") {
          if (input.value.includes(".")) {
            event.preventDefault();
          }
          return;
        }

        if (!/^\d$/.test(event.key)) {
          event.preventDefault();
        }
      });
    };

    Swal.fire({
      title: `แก้ไขข้อมูล: ${user.username}`,
      width: "min(96vw, 520px)",
      showCancelButton: true,
      confirmButtonText: "บันทึก",
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
      didOpen: () => {
        bindNumericInput("swal-credit", sanitizeDecimalInput, { allowDecimalPoint: true });
        bindNumericInput("swal-topup", sanitizeDecimalInput, { allowDecimalPoint: true });
        bindNumericInput("swal-point", sanitizeIntegerInput);
        bindNumericInput("swal-lifetime", sanitizeIntegerInput);
      },
      html: `
        <p class="mb-4 text-sm text-gray-500">แก้ไขเครดิต ${pointCurrencyName} และบทบาทของสมาชิก</p>
        <div class="space-y-4 text-left">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">เครดิตคงเหลือ (บาท)</label>
              <input id="swal-credit" type="text" inputmode="decimal" autocomplete="off" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value="${Number(
                user.creditBalance
              )}">
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">ยอดเติมสะสม (บาท)</label>
              <input id="swal-topup" type="text" inputmode="decimal" autocomplete="off" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value="${Number(
                user.totalTopup
              )}">
            </div>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">${pointCurrencyName}คงเหลือ</label>
              <input id="swal-point" type="text" inputmode="numeric" autocomplete="off" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value="${user.pointBalance}">
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">${pointCurrencyName}สะสม</label>
              <input id="swal-lifetime" type="text" inputmode="numeric" autocomplete="off" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value="${user.lifetimePoints}">
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">บทบาท</label>
            <select id="swal-role" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" ${canManageRoles ? "" : "disabled"}>
              ${selectOptions}
            </select>
            <p class="mt-1 text-xs text-gray-400">${canManageRoles ? "เลือกบทบาทปัจจุบันของสมาชิก" : "บัญชีนี้ไม่มีสิทธิ์เปลี่ยนบทบาท"}</p>
          </div>
        </div>
      `,
      preConfirm: () => {
        const creditBalance = (document.getElementById("swal-credit") as HTMLInputElement)?.value.trim();
        const totalTopup = (document.getElementById("swal-topup") as HTMLInputElement)?.value.trim();
        const pointBalance = (document.getElementById("swal-point") as HTMLInputElement)?.value.trim();
        const lifetimePoints = (document.getElementById("swal-lifetime") as HTMLInputElement)?.value.trim();

        if (!isValidDecimalInput(creditBalance) || Number(creditBalance) > MAX_DECIMAL_BALANCE) {
          Swal.showValidationMessage("เครดิตคงเหลือต้องเป็นตัวเลข 0-99,999,999.99");
          return;
        }

        if (!isValidDecimalInput(totalTopup) || Number(totalTopup) > MAX_DECIMAL_BALANCE) {
          Swal.showValidationMessage("ยอดเติมสะสมต้องเป็นตัวเลข 0-99,999,999.99");
          return;
        }

        if (!isValidIntegerInput(pointBalance) || Number(pointBalance) > MAX_INTEGER_BALANCE) {
          Swal.showValidationMessage(`${pointCurrencyName}คงเหลือต้องเป็นจำนวนเต็ม 0-2,147,483,647`);
          return;
        }

        if (!isValidIntegerInput(lifetimePoints) || Number(lifetimePoints) > MAX_INTEGER_BALANCE) {
          Swal.showValidationMessage(`${pointCurrencyName}สะสมต้องเป็นจำนวนเต็ม 0-2,147,483,647`);
          return;
        }

        return {
          creditBalance,
          totalTopup,
          pointBalance,
          lifetimePoints,
          role: canManageRoles
            ? (document.getElementById("swal-role") as HTMLSelectElement)?.value
            : user.role,
        };
      },
    }).then((result) => handleEditConfirm(result, user));
  };

  const statCards = [
    {
      label: "สมาชิกทั้งหมด",
      value: users.length.toLocaleString(),
      icon: Users,
      iconBg: "bg-blue-100",
      iconColor: "text-[#1a56db]",
      emphasis: "soft",
    },
    {
      label: "สมาชิก VIP",
      value: vipCount.toLocaleString(),
      icon: Crown,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      emphasis: "soft",
    },
    {
      label: "เครดิตรวมทั้งระบบ",
      value: formatCurrency(totalCredits),
      icon: Coins,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      emphasis: "strong",
    },
    {
      label: `${pointCurrencyName}รวมทั้งระบบ`,
      value: totalPoints.toLocaleString(),
      icon: Gem,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      emphasis: "strong",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Users className="h-6 w-6 text-[#1a56db]" />
          ระบบบริหารจัดการสมาชิก
        </h1>
        <p className="mt-1 text-muted-foreground">ดูข้อมูลสมาชิก เครดิต และ{pointCurrencyName}ทั้งหมด</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, iconBg, iconColor, emphasis }) => (
          <div
            key={label}
            className={`rounded-2xl border p-4 shadow-sm ${getStrongEmphasisCardClassName(emphasis)}`}
          >
            <div className="flex items-center gap-3">
              <div className={`shrink-0 rounded-2xl p-3 ${iconBg}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{label}</p>
                <p
                  className={`truncate font-bold ${getStatValueClassName(emphasis)}`}
                >
                  {value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ค้นหาด้วยชื่อผู้ใช้ ชื่อ หรืออีเมล..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-11 rounded-2xl border-slate-200 pl-10 pr-10"
            />
            {searchActive ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="ล้างคำค้น"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-600"
            >
              {getSearchResultsLabel(searchActive, filteredUsers.length, users.length)}
            </Badge>
            {searchActive ? (
              <Badge className="rounded-full bg-blue-600 px-3 py-1 text-white hover:bg-blue-600">
                กำลังค้นหา
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1a56db]">
            <Users className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-foreground">
            รายชื่อสมาชิก ({filteredUsers.length}
            {getUsersSectionCountSuffix(searchActive, users.length)})
          </span>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="py-14 text-center">
            <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              {getEmptyUsersText(searchActive)}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {filteredUsers.map((user) => {
                const initials = user.username
                  .split("_")
                  .map((part) => part.charAt(0).toUpperCase())
                  .join("")
                  .slice(0, 2);
                const isVIP = Number(user.totalTopup) > VIP_TOPUP_THRESHOLD;
                const hasGoldBorder = user.lifetimePoints > GOLD_BORDER_POINTS_THRESHOLD;
                const creditBalance = Number(user.creditBalance);
                const totalTopup = Number(user.totalTopup);
                const isPinLocked = Boolean(
                  user.pinLockedUntil && new Date(user.pinLockedUntil).getTime() > renderTimestamp
                );

                return (
                  <div
                    key={user.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          className={`h-11 w-11 ${
                            hasGoldBorder ? "ring-2 ring-amber-400 ring-offset-2" : ""
                          }`}
                        >
                          {user.image ? <AvatarImage src={user.image} alt={user.username} /> : null}
                          <AvatarFallback
                            className={`font-semibold ${
                              hasGoldBorder
                                ? "bg-gradient-to-br from-amber-200 to-amber-400 text-amber-900"
                                : "bg-blue-100 text-[#1a56db]"
                            }`}
                          >
                            {initials}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold text-slate-900">{user.username}</p>
                            <Badge
                              variant="secondary"
                              className={`rounded-full px-2.5 py-1 ${getRoleBadgeClassName(user.role)}`}
                            >
                              {getRoleDisplayName(user.role)}
                            </Badge>
                            {isVIP ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
                                <Crown className="h-3 w-3" />
                                VIP
                              </span>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {user.name || user.email || "-"}
                          </p>
                          {user.email && user.name ? (
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="rounded-full">
                              {user.hasPin ? "ตั้ง PIN แล้ว" : "ยังไม่มี PIN"}
                            </Badge>
                            {isPinLocked ? (
                              <Badge variant="outline" className="rounded-full border-red-200 text-red-600">
                                PIN ถูกล็อก
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-emerald-50 px-3 py-2">
                        <p className="text-xs text-emerald-700/80">เครดิตคงเหลือ</p>
                        <p className="mt-1 text-base font-semibold text-emerald-700">
                          {formatCurrency(creditBalance)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-amber-50 px-3 py-2">
                        <p className="text-xs text-amber-700/80">ยอดเติมสะสม</p>
                        <p className="mt-1 text-base font-semibold text-amber-700">
                          {formatCurrency(totalTopup)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-violet-50 px-3 py-2">
                        <p className="text-xs text-violet-700/80">{pointCurrencyName}คงเหลือ</p>
                        <p className="mt-1 text-base font-semibold text-violet-700">
                          {user.pointBalance.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-2">
                        <p className="text-xs text-slate-500">{pointCurrencyName}สะสม</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">
                          {user.lifetimePoints.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        สมัครเมื่อ{" "}
                        {new Date(user.createdAt).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {canEditUsers && isPinLocked ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handlePinAdminAction(user, "UNLOCK_PIN")}
                            className="rounded-xl border border-blue-200 px-3 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <ShieldOff className="mr-1.5 h-4 w-4" />
                            ปลดล็อก PIN
                          </Button>
                        ) : null}
                        {canEditUsers && user.hasPin ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handlePinAdminAction(user, "RESET_PIN")}
                            className="rounded-xl border border-red-200 px-3 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <KeyRound className="mr-1.5 h-4 w-4" />
                            รีเซ็ต PIN
                          </Button>
                        ) : null}
                        {canEditUsers || canManageRoles ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                            className="rounded-xl border border-slate-200 px-3 text-slate-600 hover:bg-slate-50 hover:text-[#1a56db]"
                          >
                            <Pencil className="mr-1.5 h-4 w-4" />
                            แก้ไข
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                  <TableHead>ข้อมูลสมาชิก</TableHead>
                  <TableHead className="text-right">เครดิตคงเหลือ</TableHead>
                  <TableHead className="text-right">ยอดเติมสะสม</TableHead>
                  <TableHead className="text-right">{pointCurrencyName}คงเหลือ</TableHead>
                  <TableHead className="text-right">{pointCurrencyName}สะสม</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>วันที่สมัคร</TableHead>
                  <TableHead className="text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user, index) => {
                  const initials = user.username
                    .split("_")
                    .map((part) => part.charAt(0).toUpperCase())
                    .join("")
                    .slice(0, 2);
                  const isVIP = Number(user.totalTopup) > VIP_TOPUP_THRESHOLD;
                  const hasGoldBorder = user.lifetimePoints > GOLD_BORDER_POINTS_THRESHOLD;
                  const creditBalance = Number(user.creditBalance);
                  const totalTopup = Number(user.totalTopup);
                  const isPinLocked = Boolean(
                    user.pinLockedUntil && new Date(user.pinLockedUntil).getTime() > renderTimestamp
                  );

                  return (
                    <TableRow
                      key={user.id}
                      className={index % 2 === 0 ? "bg-white" : "bg-slate-50/35"}
                    >
                      <TableCell className="min-w-[260px]">
                        <div className="flex items-center gap-3">
                          <Avatar
                            className={`h-10 w-10 ${
                              hasGoldBorder ? "ring-2 ring-amber-400 ring-offset-2" : ""
                            }`}
                          >
                            {user.image ? <AvatarImage src={user.image} alt={user.username} /> : null}
                            <AvatarFallback
                              className={`font-semibold ${
                                hasGoldBorder
                                  ? "bg-gradient-to-br from-amber-200 to-amber-400 text-amber-900"
                                  : "bg-blue-100 text-[#1a56db]"
                              }`}
                            >
                              {initials}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-semibold text-slate-900">
                                {user.username}
                              </span>
                              {isVIP ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
                                  <Crown className="h-3 w-3" />
                                  VIP
                                </span>
                              ) : null}
                            </div>
                            <p className="truncate text-sm text-muted-foreground">
                              {user.email || user.name || "-"}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="rounded-full">
                                <LockKeyhole className="mr-1 h-3 w-3" />
                                {user.hasPin ? "มี PIN" : "ไม่มี PIN"}
                              </Badge>
                              {isPinLocked ? (
                                <Badge variant="outline" className="rounded-full border-red-200 text-red-600">
                                  ถูกล็อก
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="space-y-0.5">
                          <p className="text-lg font-bold text-emerald-600">
                            {formatCurrency(creditBalance)}
                          </p>
                          <p className="text-xs text-muted-foreground">ยอดคงเหลือ</p>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="space-y-0.5">
                          <p
                            className={`text-base font-semibold ${
                              isVIP ? "text-amber-600" : "text-slate-700"
                            }`}
                          >
                            {formatCurrency(totalTopup)}
                          </p>
                          <p className="text-xs text-muted-foreground">สะสมทั้งหมด</p>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="space-y-0.5">
                          <p className="text-lg font-bold text-violet-600">
                            <span className="mr-1">{pointCurrencySymbol}</span>
                            {user.pointBalance.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">พร้อมใช้งาน</p>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="space-y-0.5">
                          <p
                            className={`text-base font-semibold ${
                              hasGoldBorder ? "text-amber-600" : "text-slate-700"
                            }`}
                          >
                            {user.lifetimePoints.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">แต้มสะสม</p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`rounded-full px-2.5 py-1 ${getRoleBadgeClassName(user.role)}`}
                        >
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex justify-end gap-2">
                          {canEditUsers && isPinLocked ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handlePinAdminAction(user, "UNLOCK_PIN")}
                              className="rounded-xl border border-blue-200 px-3 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <ShieldOff className="mr-1.5 h-4 w-4" />
                              ปลดล็อก PIN
                            </Button>
                          ) : null}
                          {canEditUsers && user.hasPin ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handlePinAdminAction(user, "RESET_PIN")}
                              className="rounded-xl border border-red-200 px-3 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <KeyRound className="mr-1.5 h-4 w-4" />
                              รีเซ็ต PIN
                            </Button>
                          ) : null}
                          {canEditUsers || canManageRoles ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(user)}
                              className="rounded-xl border border-slate-200 px-3 text-slate-600 hover:bg-slate-50 hover:text-[#1a56db]"
                            >
                              <Pencil className="mr-1.5 h-4 w-4" />
                              แก้ไข
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-foreground">คำอธิบายสัญลักษณ์</h3>
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-2 py-0.5 text-xs font-semibold text-white">
              <Crown className="h-3 w-3" />
              VIP
            </span>
            <span>= ยอดเติมสะสมมากกว่า 10,000 บาท</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-blue-100 ring-2 ring-amber-400 ring-offset-1" />
            <span>= {pointCurrencyName}สะสมมากกว่า 5,000 แต้ม</span>
          </div>
        </div>
      </div>
    </div>
  );
}
