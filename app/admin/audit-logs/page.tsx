"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Loader2,
    FileText,
    ChevronLeft,
    ChevronRight,
    Search,
    Filter,
    RefreshCw,
    Eye,
    Trash2,
} from "lucide-react";
import Swal from "sweetalert2";
import { PERMISSIONS } from "@/lib/permissions";
import { fetchWithCsrf } from "@/lib/csrf-client";

interface AuditChange {
    field: string;
    old?: unknown;
    new?: unknown;
    oldValue?: unknown;
    newValue?: unknown;
}

interface AuditDetails {
    resourceName?: string;
    changes?: AuditChange[];
    [key: string]: unknown;
}

interface AuditLog {
    id: string;
    userId: string | null;
    user: { id: string; username: string } | null;
    action: string;
    resource: string | null;
    resourceId: string | null;
    details: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    status: string;
    createdAt: string;
}

type QuickFilterKey = "all" | "today" | "success" | "failed";

const ACTION_COLORS: Record<string, string> = {
    LOGIN: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    REGISTER: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    LOGOUT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    PURCHASE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    LOGIN_FAILED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    RATE_LIMIT_EXCEEDED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    UNAUTHORIZED_ACCESS: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    TOPUP_REQUEST: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    TOPUP_APPROVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    TOPUP_REJECT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    PRODUCT_FEATURED_TOGGLE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    USER_ROLE_CHANGE: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300",
    USER_PERMISSION_CHANGE: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300",
    PASSWORD_CHANGE: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300",
    PROFILE_UPDATE: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300",
    API_KEY_CREATE: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
    API_KEY_REVOKE: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
    AUDIT_LOG_DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const ACTION_LABELS: Record<string, string> = {
    LOGIN: "เข้าสู่ระบบ",
    LOGIN_FAILED: "เข้าสู่ระบบไม่สำเร็จ",
    LOGOUT: "ออกจากระบบ",
    REGISTER: "สมัครสมาชิก",
    PASSWORD_CHANGE: "เปลี่ยนรหัสผ่าน",
    PROFILE_UPDATE: "แก้ไขโปรไฟล์",
    USER_CREATE: "เพิ่มผู้ใช้",
    USER_UPDATE: "แก้ไขผู้ใช้",
    USER_DELETE: "ลบผู้ใช้",
    USER_ROLE_CHANGE: "เปลี่ยนยศผู้ใช้",
    USER_PERMISSION_CHANGE: "เปลี่ยนสิทธิ์ผู้ใช้",
    ROLE_CREATE: "เพิ่มยศ",
    ROLE_UPDATE: "แก้ไขยศ",
    ROLE_DELETE: "ลบยศ",
    PRODUCT_CREATE: "เพิ่มสินค้า",
    PRODUCT_UPDATE: "แก้ไขสินค้า",
    PRODUCT_DELETE: "ลบสินค้า",
    PRODUCT_DUPLICATE: "คัดลอกสินค้า",
    PRODUCT_FEATURED_TOGGLE: "สลับสินค้าแนะนำ",
    NEWS_CREATE: "เพิ่มข่าว",
    NEWS_UPDATE: "แก้ไขข่าว",
    NEWS_DELETE: "ลบข่าว",
    HELP_CREATE: "เพิ่มคำถาม",
    HELP_UPDATE: "แก้ไขคำถาม",
    HELP_DELETE: "ลบคำถาม",
    BANNER_CREATE: "เพิ่มแบนเนอร์",
    BANNER_UPDATE: "แก้ไขแบนเนอร์",
    BANNER_DELETE: "ลบแบนเนอร์",
    POPUP_CREATE: "เพิ่ม Popup",
    POPUP_UPDATE: "แก้ไข Popup",
    POPUP_DELETE: "ลบ Popup",
    PURCHASE: "ซื้อสินค้า",
    TOPUP_REQUEST: "คำขอเติมเงิน",
    TOPUP_APPROVE: "อนุมัติเติมเงิน",
    TOPUP_REJECT: "ปฏิเสธเติมเงิน",
    CHAT_CUSTOMER_MESSAGE: "ข้อความลูกค้า",
    CHAT_ADMIN_MESSAGE: "ข้อความแอดมิน",
    CHAT_STATUS_UPDATE: "เปลี่ยนสถานะแชต",
    CHAT_DELETE: "ลบแชต",
    CHAT_TAGS_UPDATE: "แก้ไขแท็กแชต",
    CHAT_PIN_UPDATE: "ปักหมุดแชต",
    CHAT_TEMPLATE_CREATE: "เพิ่มเทมเพลตแชต",
    CHAT_TEMPLATE_UPDATE: "แก้ไขเทมเพลตแชต",
    CHAT_TEMPLATE_DELETE: "ลบเทมเพลตแชต",
    SETTINGS_UPDATE: "แก้ไขตั้งค่า",
    API_KEY_CREATE: "สร้าง API Key",
    API_KEY_REVOKE: "ยกเลิก API Key",
    AUDIT_LOG_DELETE: "ลบ Audit Log",
    RATE_LIMIT_EXCEEDED: "เกินการจำกัดความถี่",
    UNAUTHORIZED_ACCESS: "เข้าถึงโดยไม่ได้รับอนุญาต",
};

const ACTION_ORDER = [
    "LOGIN",
    "LOGIN_FAILED",
    "LOGOUT",
    "REGISTER",
    "PASSWORD_CHANGE",
    "PROFILE_UPDATE",
    "PURCHASE",
    "PRODUCT_CREATE",
    "PRODUCT_UPDATE",
    "PRODUCT_DELETE",
    "PRODUCT_DUPLICATE",
    "PRODUCT_FEATURED_TOGGLE",
    "NEWS_CREATE",
    "NEWS_UPDATE",
    "NEWS_DELETE",
    "POPUP_CREATE",
    "POPUP_UPDATE",
    "POPUP_DELETE",
    "BANNER_CREATE",
    "BANNER_UPDATE",
    "BANNER_DELETE",
    "ROLE_CREATE",
    "ROLE_UPDATE",
    "ROLE_DELETE",
    "TOPUP_REQUEST",
    "TOPUP_APPROVE",
    "TOPUP_REJECT",
    "SETTINGS_UPDATE",
    "USER_CREATE",
    "USER_UPDATE",
    "USER_DELETE",
    "USER_ROLE_CHANGE",
    "USER_PERMISSION_CHANGE",
    "HELP_CREATE",
    "HELP_UPDATE",
    "HELP_DELETE",
    "CHAT_CUSTOMER_MESSAGE",
    "CHAT_ADMIN_MESSAGE",
    "CHAT_STATUS_UPDATE",
    "CHAT_DELETE",
    "CHAT_TAGS_UPDATE",
    "CHAT_PIN_UPDATE",
    "CHAT_TEMPLATE_CREATE",
    "CHAT_TEMPLATE_UPDATE",
    "CHAT_TEMPLATE_DELETE",
    "API_KEY_CREATE",
    "API_KEY_REVOKE",
    "AUDIT_LOG_DELETE",
    "RATE_LIMIT_EXCEEDED",
    "UNAUTHORIZED_ACCESS",
] as const;

const ACTION_OPTIONS = [
    { value: "all", label: "ทั้งหมด" },
    ...ACTION_ORDER.map((value) => ({ value, label: ACTION_LABELS[value] ?? value })),
];

const FIELD_LABELS: Record<string, string> = {
    title: "หัวข้อ",
    description: "รายละเอียด",
    price: "ราคา",
    discountPrice: "ราคาลด",
    imageUrl: "รูปภาพ",
    isActive: "สถานะ",
    sortOrder: "ลำดับ",
    link: "ลิงก์",
    linkUrl: "ลิงก์",
    isFeatured: "แนะนำ",
    name: "ชื่อ",
    role: "บทบาท",
    credit: "เครดิต",
    permissions: "สิทธิ์การใช้งาน",
    iconUrl: "ไอคอน",
    dismissOption: "ตัวเลือกการปิด",
    username: "ชื่อผู้ใช้",
    email: "อีเมล",
    category: "หมวดหมู่",
    stock: "สต๊อก",
    content: "เนื้อหา",
};

const RESOURCE_LABELS: Record<string, string> = {
    Product: "สินค้า",
    NewsArticle: "ข่าวสาร",
    AnnouncementPopup: "ป๊อปอัป",
    Role: "ยศ",
    User: "ผู้ใช้",
    TopupRequest: "เติมเงิน",
    Settings: "ตั้งค่า",
    HelpCategory: "หมวดหมู่คำถาม",
    HelpArticle: "บทความช่วยเหลือ",
    HelpQuestion: "คำถาม",
    Category: "หมวดหมู่",
    Order: "รายการสั่งซื้อ",
};

function getActionBadgeClass(action: string) {
    if (ACTION_COLORS[action]) return ACTION_COLORS[action];
    if (action.endsWith("_CREATE")) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300";
    if (action.endsWith("_UPDATE")) return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
    if (action.endsWith("_DELETE")) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function getChangeValue(change: AuditChange, key: "old" | "new") {
    const value = key === "old"
        ? (change.oldValue ?? change.old ?? null)
        : (change.newValue ?? change.new ?? null);

    if (value === null || value === undefined || value === "") {
        return "null";
    }

    if (typeof value === "object") {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }

    return String(value);
}

export default function AdminAuditLogsPage() {
    const permissions = useAdminPermissions();
    const [isMounted, setIsMounted] = useState(false);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [limit] = useState(20);
    const [actionFilter, setActionFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [quickFilter, setQuickFilter] = useState<QuickFilterKey>("all");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [deleteMode, setDeleteMode] = useState<"single" | "selected" | "all" | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const parseDetails = useCallback((details: string | null): AuditDetails | null => {
        if (!details) return null;
        try {
            return JSON.parse(details) as AuditDetails;
        } catch {
            return null;
        }
    }, []);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("th-TH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    };

    const getFieldLabel = (field: string) => FIELD_LABELS[field] || field;
    const getActionLabel = (action: string) => ACTION_LABELS[action] || action;
    const canDeleteAuditLogs = permissions.includes(PERMISSIONS.AUDIT_LOG_DELETE);

    const openDetail = (log: AuditLog) => {
        const details = parseDetails(log.details);
        const changes = details?.changes ?? [];
        const hasChanges = changes.length > 0;

        const changesHtml = hasChanges
            ? changes.map((change) => `
                <div class="mb-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p class="mb-2 text-sm font-semibold text-gray-700">${getFieldLabel(change.field)}</p>
                    <div class="flex items-center gap-2 text-sm">
                        <div class="flex-1 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                            <span class="mr-1 text-gray-500">เดิม:</span>
                            <span class="break-all font-mono">${getChangeValue(change, "old")}</span>
                        </div>
                        <span class="text-gray-400">→</span>
                        <div class="flex-1 rounded bg-green-50 px-2 py-1 text-xs text-green-700">
                            <span class="mr-1 text-gray-500">ใหม่:</span>
                            <span class="break-all font-mono">${getChangeValue(change, "new")}</span>
                        </div>
                    </div>
                </div>
            `).join("")
            : "";

        const statusClass = log.status === "SUCCESS" ? "text-green-600" : "text-red-600";
        const statusText = log.status === "SUCCESS" ? "สำเร็จ" : "ล้มเหลว";

        const resourceSection = (details?.resourceName || log.resource)
            ? `
                <div class="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm">
                    <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-500">รายการที่เกี่ยวข้อง</p>
                    ${details?.resourceName ? `<p class="font-medium">${details.resourceName}</p>` : ""}
                    ${log.resource ? `<p class="text-xs text-gray-500">${RESOURCE_LABELS[log.resource] || log.resource}</p>` : ""}
                </div>
            `
            : "";

        const changesSection = hasChanges
            ? `
                <div>
                    <p class="mb-2 text-sm font-semibold text-gray-700">การเปลี่ยนแปลง (${changes.length} รายการ)</p>
                    ${changesHtml}
                </div>
            `
            : "";

        void Swal.fire({
            title: "รายละเอียดกิจกรรม",
            width: "min(96vw, 620px)",
            showConfirmButton: false,
            showCloseButton: true,
            customClass: {
                popup: "rounded-2xl",
                closeButton: "text-gray-400 hover:text-gray-600",
            },
            html: `
                <div class="space-y-4 pb-2 text-left">
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        <div class="rounded-xl bg-gray-50 p-3">
                            <p class="mb-1 text-gray-500">ผู้ดำเนินการ</p>
                            <p class="font-semibold">${log.user?.username || "ระบบ"}</p>
                            ${log.user?.id ? `<p class="font-mono text-xs text-gray-400">${log.user.id}</p>` : ""}
                        </div>
                        <div class="rounded-xl bg-gray-50 p-3">
                            <p class="mb-1 text-gray-500">เวลา</p>
                            <p class="font-semibold text-sm">${formatDate(log.createdAt)}</p>
                        </div>
                        <div class="rounded-xl bg-gray-50 p-3">
                            <p class="mb-1 text-gray-500">IP Address</p>
                            <p class="font-mono text-sm">${log.ipAddress || "-"}</p>
                        </div>
                        <div class="rounded-xl bg-gray-50 p-3">
                            <p class="mb-1 text-gray-500">สถานะ</p>
                            <p class="font-semibold ${statusClass}">${statusText}</p>
                        </div>
                    </div>
                    ${resourceSection}
                    ${changesSection}
                </div>
            `,
        });
    };

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: (page * limit).toString(),
            });

            if (actionFilter !== "all") {
                params.set("action", actionFilter);
            }

            const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
            if (!res.ok) {
                throw new Error("Failed to fetch logs");
            }

            const data = await res.json();
            setLogs(Array.isArray(data.logs) ? data.logs : []);
            setTotal(Number(data.total) || 0);
            setSelectedIds([]);
        } catch (error) {
            console.error("Error fetching audit logs:", error);
            setLogs([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [actionFilter, limit, page]);

    useEffect(() => {
        void fetchLogs();
    }, [fetchLogs]);

    const filteredLogs = useMemo(() => {
        if (!searchQuery) return logs;

        const query = searchQuery.toLowerCase().trim();
        return logs.filter((log) => {
            const details = parseDetails(log.details);
            return [
                log.user?.username,
                getActionLabel(log.action),
                log.action,
                log.resource,
                log.ipAddress,
                details?.resourceName,
            ].some((value) => value?.toLowerCase().includes(query));
        });
    }, [getActionLabel, logs, parseDetails, searchQuery]);

    const todayKey = new Date().toDateString();
    const quickFilteredLogs = filteredLogs.filter((log) => {
        if (quickFilter === "today") {
            return new Date(log.createdAt).toDateString() === todayKey;
        }
        if (quickFilter === "success") {
            return log.status === "SUCCESS";
        }
        if (quickFilter === "failed") {
            return log.status !== "SUCCESS";
        }
        return true;
    });

    const todayCount = filteredLogs.filter((log) => new Date(log.createdAt).toDateString() === todayKey).length;
    const successCount = filteredLogs.filter((log) => log.status === "SUCCESS").length;
    const failedCount = filteredLogs.filter((log) => log.status !== "SUCCESS").length;
    const totalPages = Math.ceil(total / limit);
    const allVisibleSelected = quickFilteredLogs.length > 0 && quickFilteredLogs.every((log) => selectedIds.includes(log.id));
    const someVisibleSelected = quickFilteredLogs.some((log) => selectedIds.includes(log.id));

    const toggleSelectLog = useCallback((logId: string, checked: boolean) => {
        setSelectedIds((previous) => (
            checked
                ? Array.from(new Set([...previous, logId]))
                : previous.filter((id) => id !== logId)
        ));
    }, []);

    const toggleSelectAllVisible = useCallback((checked: boolean) => {
        setSelectedIds((previous) => {
            if (checked) {
                return Array.from(new Set([...previous, ...quickFilteredLogs.map((log) => log.id)]));
            }

            const visibleIds = new Set(quickFilteredLogs.map((log) => log.id));
            return previous.filter((id) => !visibleIds.has(id));
        });
    }, [quickFilteredLogs]);

    const handleDeleteLogs = useCallback(async (
        mode: "single" | "selected" | "all",
        payload?: { id?: string; ids?: string[]; label?: string },
    ) => {
        if (!canDeleteAuditLogs || deleteMode) return;

        const selectedCount = payload?.ids?.length ?? 0;
        const confirmText =
            mode === "all"
                ? "ลบ Audit Logs ทั้งหมด"
                : mode === "selected"
                    ? `ลบ Audit Logs ที่เลือก ${selectedCount} รายการ`
                    : `ลบรายการนี้${payload?.label ? `: ${payload.label}` : ""}`;

        const result = await Swal.fire({
            title: "ยืนยันการลบ",
            text: `${confirmText} ใช่หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ลบ",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#dc2626",
            reverseButtons: true,
        });

        if (!result.isConfirmed) return;

        setDeleteMode(mode);
        try {
            const response = await fetchWithCsrf("/api/admin/audit-logs", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode,
                    ...(mode === "single" ? { id: payload?.id } : {}),
                    ...(mode === "selected" ? { ids: payload?.ids } : {}),
                }),
            });

            const data = await response.json().catch(() => ({})) as { error?: string; deletedCount?: number };
            if (!response.ok) {
                throw new Error(data.error || "ลบ Audit Logs ไม่สำเร็จ");
            }

            if (mode === "single" && payload?.id) {
                setSelectedIds((previous) => previous.filter((id) => id !== payload.id));
            } else {
                setSelectedIds([]);
            }

            await Swal.fire({
                title: "ลบสำเร็จ",
                text: `ลบข้อมูลแล้ว ${data.deletedCount ?? 0} รายการ`,
                icon: "success",
                timer: 1600,
                showConfirmButton: false,
            });

            await fetchLogs();
        } catch (error) {
            await Swal.fire({
                title: "ลบไม่สำเร็จ",
                text: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
                icon: "error",
            });
        } finally {
            setDeleteMode(null);
        }
    }, [canDeleteAuditLogs, deleteMode, fetchLogs]);

    if (!isMounted) {
        return (
            <div className="flex min-h-[320px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                        <FileText className="h-6 w-6 text-[#1a56db]" />
                        Audit Logs
                    </h1>
                    <p className="mt-1 text-muted-foreground">ประวัติกิจกรรมทั้งหมดในระบบ</p>
                </div>
                <Button onClick={fetchLogs} variant="outline" disabled={loading} className="w-full sm:w-auto">
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    รีเฟรช
                </Button>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="ค้นหา username, ชื่อกิจกรรม, ชื่อ resource..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(0);
                        }}
                        className="pl-9"
                    />
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select
                        value={actionFilter}
                        onValueChange={(value) => {
                            setActionFilter(value);
                            setPage(0);
                        }}
                    >
                        <SelectTrigger className="w-full sm:w-56">
                            <SelectValue placeholder="เลือกประเภทกิจกรรม" />
                        </SelectTrigger>
                        <SelectContent className="max-h-80">
                            {ACTION_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {[
                    { key: "all" as const, label: `ทั้งหมด ${filteredLogs.length}` },
                    { key: "today" as const, label: `วันนี้ ${todayCount}` },
                    { key: "success" as const, label: `สำเร็จ ${successCount}` },
                    { key: "failed" as const, label: `ล้มเหลว ${failedCount}` },
                ].map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                            setQuickFilter(item.key);
                            setPage(0);
                        }}
                        className={[
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                            quickFilter === item.key
                                ? "border-[#145de7] bg-[#eef4ff] text-[#145de7]"
                                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                        ].join(" ")}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {canDeleteAuditLogs && (
                <div className="flex flex-col gap-3 rounded-xl border border-red-100 bg-red-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-red-700">
                        {selectedIds.length > 0
                            ? `เลือกแล้ว ${selectedIds.length} รายการ`
                            : "ลบได้ทั้งแบบทีละรายการ, แบบติ๊กเลือกหลายรายการ, และลบทั้งหมด"}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={selectedIds.length === 0 || deleteMode !== null}
                            onClick={() => void handleDeleteLogs("selected", { ids: selectedIds })}
                            className="border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            ลบที่เลือก
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={deleteMode !== null || total === 0}
                            onClick={() => void handleDeleteLogs("all")}
                            className="border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            ลบทั้งหมด
                        </Button>
                    </div>
                </div>
            )}

            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm dark:bg-zinc-900">
                <div className="flex items-center gap-2 border-b border-border px-5 py-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-[#1a56db]">
                        <FileText className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-bold">ประวัติกิจกรรม</span>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}

                {!loading && quickFilteredLogs.length === 0 && (
                    <div className="py-12 text-center text-muted-foreground">
                        <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                        <p>ไม่พบประวัติกิจกรรม</p>
                    </div>
                )}

                {!loading && quickFilteredLogs.length > 0 && (
                    <>
                    <div className="space-y-3 p-4 md:hidden">
                        {quickFilteredLogs.map((log) => {
                            const details = parseDetails(log.details);
                            const changes = details?.changes ?? [];
                            const hasChanges = changes.length > 0;

                            return (
                                <div key={log.id} className="rounded-xl border border-border p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium">{log.user?.username || "-"}</p>
                                            <p className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={
                                                log.status === "SUCCESS"
                                                    ? "border-green-600 text-green-600"
                                                    : "border-red-600 text-red-600"
                                            }
                                        >
                                            {log.status === "SUCCESS" ? "สำเร็จ" : "ล้มเหลว"}
                                        </Badge>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Badge variant="secondary" className={getActionBadgeClass(log.action)}>
                                            {getActionLabel(log.action)}
                                        </Badge>
                                    </div>

                                    {(details?.resourceName || log.resource) ? (
                                        <div className="mt-3">
                                            {details?.resourceName ? (
                                                <p className="truncate font-medium">{details.resourceName}</p>
                                            ) : null}
                                            {log.resource ? (
                                                <p className="text-xs text-muted-foreground">
                                                    {RESOURCE_LABELS[log.resource] || log.resource}
                                                </p>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    {canDeleteAuditLogs && (
                                        <div className="mt-3">
                                            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                                                <Checkbox
                                                    checked={selectedIds.includes(log.id)}
                                                    onCheckedChange={(checked) => toggleSelectLog(log.id, checked === true)}
                                                />
                                                เลือกรายการนี้
                                            </label>
                                        </div>
                                    )}

                                    <div className="mt-4 flex items-center justify-end gap-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openDetail(log)}
                                            className={hasChanges ? "text-primary" : ""}
                                            title={hasChanges ? `ดูรายละเอียด (${changes.length} รายการเปลี่ยนแปลง)` : "ดูรายละเอียด"}
                                        >
                                            <Eye className="h-4 w-4" />
                                            {hasChanges && <span className="ml-1 text-xs">({changes.length})</span>}
                                        </Button>
                                        {canDeleteAuditLogs && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={deleteMode !== null}
                                                onClick={() => void handleDeleteLogs("single", {
                                                    id: log.id,
                                                    label: details?.resourceName || getActionLabel(log.action),
                                                })}
                                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                title="ลบรายการนี้"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                        <Table className="min-w-[860px]">
                            <TableHeader>
                                <TableRow>
                                    {canDeleteAuditLogs && (
                                        <TableHead className="w-12 text-center">
                                            <Checkbox
                                                checked={allVisibleSelected ? true : (someVisibleSelected ? "indeterminate" : false)}
                                                onCheckedChange={(checked) => toggleSelectAllVisible(checked === true)}
                                                aria-label="เลือกทั้งหมด"
                                            />
                                        </TableHead>
                                    )}
                                    <TableHead>เวลา</TableHead>
                                    <TableHead>ผู้ใช้</TableHead>
                                    <TableHead>กิจกรรม</TableHead>
                                    <TableHead>รายการที่เกี่ยวข้อง</TableHead>
                                    <TableHead className="text-center">สถานะ</TableHead>
                                    <TableHead className="text-center">รายละเอียด</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quickFilteredLogs.map((log) => {
                                    const details = parseDetails(log.details);
                                    const changes = details?.changes ?? [];
                                    const hasChanges = changes.length > 0;

                                    return (
                                        <TableRow key={log.id}>
                                            {canDeleteAuditLogs && (
                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={selectedIds.includes(log.id)}
                                                        onCheckedChange={(checked) => toggleSelectLog(log.id, checked === true)}
                                                        aria-label={`เลือก ${log.id}`}
                                                    />
                                                </TableCell>
                                            )}
                                            <TableCell className="whitespace-nowrap text-sm">
                                                {formatDate(log.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <span className="font-medium">{log.user?.username || "-"}</span>
                                                    {log.user?.id && (
                                                        <p className="text-xs text-muted-foreground">
                                                            ID: {log.user.id.slice(0, 8)}...
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className={getActionBadgeClass(log.action)}>
                                                    {getActionLabel(log.action)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-[220px]">
                                                    {details?.resourceName && (
                                                        <p className="truncate font-medium">{details.resourceName}</p>
                                                    )}
                                                    {log.resource && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {RESOURCE_LABELS[log.resource] || log.resource}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        log.status === "SUCCESS"
                                                            ? "border-green-600 text-green-600"
                                                            : "border-red-600 text-red-600"
                                                    }
                                                >
                                                    {log.status === "SUCCESS" ? "สำเร็จ" : "ล้มเหลว"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openDetail(log)}
                                                    className={hasChanges ? "text-primary" : ""}
                                                    title={hasChanges ? `ดูรายละเอียด (${changes.length} รายการเปลี่ยนแปลง)` : "ดูรายละเอียด"}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    {hasChanges && <span className="ml-1 text-xs">({changes.length})</span>}
                                                </Button>
                                                {canDeleteAuditLogs && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={deleteMode !== null}
                                                        onClick={() => void handleDeleteLogs("single", {
                                                            id: log.id,
                                                            label: details?.resourceName || getActionLabel(log.action),
                                                        })}
                                                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                        title="ลบรายการนี้"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
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

            {totalPages > 1 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                        แสดง {page * limit + 1} - {Math.min((page + 1) * limit, total)} จาก {total} รายการ
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((prev) => prev - 1)}
                            disabled={page === 0}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                            หน้า {page + 1} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((prev) => prev + 1)}
                            disabled={page >= totalPages - 1}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

