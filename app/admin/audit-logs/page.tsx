"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import Swal from "sweetalert2";

interface AuditChange {
    field: string;
    old: string;
    new: string;
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

const ACTION_COLORS: Record<string, string> = {
    // Success actions
    LOGIN: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    REGISTER: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    PURCHASE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",

    // Create actions
    PRODUCT_CREATE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    NEWS_CREATE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    HELP_CREATE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    USER_CREATE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",

    // Update actions
    PRODUCT_UPDATE: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    NEWS_UPDATE: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    HELP_UPDATE: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    USER_UPDATE: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    SETTINGS_UPDATE: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",

    // Delete actions
    PRODUCT_DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    NEWS_DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    HELP_DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    USER_DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",

    // Warning actions
    LOGIN_FAILED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    RATE_LIMIT_EXCEEDED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    UNAUTHORIZED_ACCESS: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",

    // Topup
    TOPUP_REQUEST: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    TOPUP_APPROVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    TOPUP_REJECT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const ACTION_OPTIONS = [
    { value: "all", label: "ทั้งหมด" },
    { value: "LOGIN", label: "เข้าสู่ระบบ" },
    { value: "REGISTER", label: "สมัครสมาชิก" },
    { value: "PURCHASE", label: "ซื้อสินค้า" },
    { value: "PRODUCT_CREATE", label: "เพิ่มสินค้า" },
    { value: "PRODUCT_UPDATE", label: "แก้ไขสินค้า" },
    { value: "PRODUCT_DELETE", label: "ลบสินค้า" },
    { value: "NEWS_CREATE", label: "เพิ่มข่าว" },
    { value: "NEWS_UPDATE", label: "แก้ไขข่าว" },
    { value: "NEWS_DELETE", label: "ลบข่าว" },
    { value: "POPUP_CREATE", label: "เพิ่ม Popup" },
    { value: "POPUP_UPDATE", label: "แก้ไข Popup" },
    { value: "POPUP_DELETE", label: "ลบ Popup" },
    { value: "ROLE_CREATE", label: "เพิ่มยศ" },
    { value: "ROLE_UPDATE", label: "แก้ไขยศ" },
    { value: "ROLE_DELETE", label: "ลบยศ" },
    { value: "TOPUP_REQUEST", label: "คำขอเติมเงิน" },
    { value: "TOPUP_APPROVE", label: "อนุมัติเติมเงิน" },
    { value: "TOPUP_REJECT", label: "ปฏิเสธเติมเงิน" },
    { value: "SETTINGS_UPDATE", label: "แก้ไขตั้งค่า" },
    { value: "USER_CREATE", label: "เพิ่มผู้ใช้" },
    { value: "USER_UPDATE", label: "แก้ไขผู้ใช้" },
    { value: "USER_DELETE", label: "ลบผู้ใช้" },
    { value: "HELP_CREATE", label: "เพิ่มคำถาม" },
    { value: "HELP_UPDATE", label: "แก้ไขคำถาม" },
    { value: "HELP_DELETE", label: "ลบคำถาม" },
    { value: "LOGIN_FAILED", label: "เข้าสู่ระบบไม่สำเร็จ" },
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
    stock: "สต็อก",
    content: "เนื้อหา",
};

// Resource type labels in Thai
const RESOURCE_LABELS: Record<string, string> = {
    Product: "สินค้า",
    NewsArticle: "ข่าวสาร",
    AnnouncementPopup: "ป๊อปอัพ",
    Role: "ยศ",
    User: "ผู้ใช้",
    TopupRequest: "เติมเงิน",
    Settings: "ตั้งค่า",
    HelpCategory: "หมวดหมู่คำถาม",
    HelpArticle: "คำถามช่วยเหลือ",
    HelpQuestion: "คำถาม",
    Category: "หมวดหมู่",
    Order: "รายการซื้อ",
};

export default function AdminAuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [limit] = useState(20);

    // Filters
    const [actionFilter, setActionFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Detail (SweetAlert2)

    const openDetail = (log: AuditLog) => {
        const details = parseDetails(log.details);
        const hasChanges = details?.changes && details.changes.length > 0;
        const changesHtml = hasChanges ? details.changes!.map((change) => `
            <div class="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-2">
                <p class="text-sm font-semibold text-gray-700 mb-2">${getFieldLabel(change.field)}</p>
                <div class="flex items-center gap-2 text-sm">
                    <div class="flex-1 bg-red-50 text-red-700 px-2 py-1 rounded text-xs"><span class="text-gray-500 mr-1">เดิม:</span><span class="font-mono break-all">${change.old || 'null'}</span></div>
                    <span class="text-gray-400">→</span>
                    <div class="flex-1 bg-green-50 text-green-700 px-2 py-1 rounded text-xs"><span class="text-gray-500 mr-1">ใหม่:</span><span class="font-mono break-all">${change.new || 'null'}</span></div>
                </div>
            </div>
        `).join('') : '';

        const statusClass = log.status === "SUCCESS" ? "text-green-600" : "text-red-600";
        const statusText = log.status === "SUCCESS" ? "สำเร็จ" : "ล้มเหลว";

        let resourceSection = '';
        if (details?.resourceName || log.resource) {
            let resourceNameHtml = '';
            if (details?.resourceName) {
                resourceNameHtml = `<p class="font-medium">${details.resourceName}</p>`;
            }
            let resourceTypeHtml = '';
            if (log.resource) {
                resourceTypeHtml = `<p class="text-gray-500 text-xs">${RESOURCE_LABELS[log.resource] || log.resource}</p>`;
            }
            resourceSection = `
            <div class="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm">
                <p class="text-blue-500 text-xs font-semibold uppercase tracking-wide mb-1">รายการที่เกี่ยวข้อง</p>
                ${resourceNameHtml}
                ${resourceTypeHtml}
            </div>
            `;
        }

        const changesSection = hasChanges ? `
            <div>
                <p class="text-sm font-semibold text-gray-700 mb-2">การเปลี่ยนแปลง (${details.changes!.length} รายการ)</p>
                ${changesHtml}
            </div>
        ` : '';

        Swal.fire({
            title: 'รายละเอียดกิจกรรม',
            width: 'min(96vw, 620px)',
            showConfirmButton: false,
            showCloseButton: true,
            customClass: { popup: 'rounded-2xl', closeButton: 'text-gray-400 hover:text-gray-600' },
            html: `
                <div class="text-left space-y-4 pb-2">
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        <div class="bg-gray-50 rounded-xl p-3">
                            <p class="text-gray-500 mb-1">ผู้ดำเนินการ</p>
                            <p class="font-semibold">${log.user?.username || 'ระบบ'}</p>
                            ${log.user?.id ? `<p class="text-xs text-gray-400 font-mono">${log.user.id}</p>` : ''}
                        </div>
                        <div class="bg-gray-50 rounded-xl p-3">
                            <p class="text-gray-500 mb-1">เวลา</p>
                            <p class="font-semibold text-sm">${formatDate(log.createdAt)}</p>
                        </div>
                        <div class="bg-gray-50 rounded-xl p-3">
                            <p class="text-gray-500 mb-1">IP Address</p>
                            <p class="font-mono text-sm">${log.ipAddress || '-'}</p>
                        </div>
                        <div class="bg-gray-50 rounded-xl p-3">
                            <p class="text-gray-500 mb-1">สถานะ</p>
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

            const res = await fetch(`/api/admin/audit-logs?${params}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setTotal(data.total);
            }
        } catch (error) {
            console.error("Error fetching audit logs:", error);
        } finally {
            setLoading(false);
        }
    }, [page, actionFilter, limit]);

    useEffect(() => {
        void fetchLogs();
    }, [fetchLogs]);

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

    const getActionLabel = (action: string) => {
        const option = ACTION_OPTIONS.find(o => o.value === action);
        return option?.label || action;
    };

    const parseDetails = (details: string | null): AuditDetails | null => {
        if (!details) return null;
        try {
            return JSON.parse(details);
        } catch {
            return null;
        }
    };

    const getFieldLabel = (field: string) => {
        return FIELD_LABELS[field] || field;
    };

    const totalPages = Math.ceil(total / limit);

    // Filter logs by search query (client-side)
    const filteredLogs = logs.filter(log => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const details = parseDetails(log.details);
        return (
            log.user?.username?.toLowerCase().includes(query) ||
            log.action.toLowerCase().includes(query) ||
            log.resource?.toLowerCase().includes(query) ||
            log.ipAddress?.toLowerCase().includes(query) ||
            details?.resourceName?.toLowerCase().includes(query)
        );
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <FileText className="h-6 w-6 text-[#1a56db]" />
                        Audit Logs
                    </h1>
                    <p className="text-muted-foreground mt-1">ประวัติกิจกรรมทั้งหมดในระบบ</p>
                </div>
                <Button onClick={fetchLogs} variant="outline" disabled={loading} className="w-full sm:w-auto">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    รีเฟรช
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="ค้นหา username, IP, ชื่อ resource..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
                        <SelectTrigger className="w-full sm:w-48">
                            <SelectValue placeholder="เลือกประเภท" />
                        </SelectTrigger>
                        <SelectContent>
                            {ACTION_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#1a56db] rounded flex items-center justify-center">
                        <FileText className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-bold">ประวัติกิจกรรม</span>
                </div>
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
                {!loading && filteredLogs.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>ไม่พบประวัติกิจกรรม</p>
                    </div>
                )}
                {!loading && filteredLogs.length > 0 && (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>เวลา</TableHead>
                                    <TableHead>ผู้ใช้</TableHead>
                                    <TableHead>กิจกรรม</TableHead>
                                    <TableHead>รายการที่เกี่ยวข้อง</TableHead>
                                    <TableHead className="hidden lg:table-cell">IP</TableHead>
                                    <TableHead className="text-center">สถานะ</TableHead>
                                    <TableHead className="text-center">รายละเอียด</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogs.map((log) => {
                                    const details = parseDetails(log.details);
                                    const hasChanges = details?.changes && details.changes.length > 0;
                                    return (
                                        <TableRow key={log.id}>
                                            <TableCell className="whitespace-nowrap text-sm">
                                                {formatDate(log.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <span className="font-medium">
                                                        {log.user?.username || "-"}
                                                    </span>
                                                    {log.user?.id && (
                                                        <p className="text-xs text-muted-foreground">
                                                            ID: {log.user.id.slice(0, 8)}...
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="secondary"
                                                    className={ACTION_COLORS[log.action] || ""}
                                                >
                                                    {getActionLabel(log.action)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-[200px]">
                                                    {details?.resourceName && (
                                                        <p className="font-medium truncate">
                                                            {details.resourceName}
                                                        </p>
                                                    )}
                                                    {log.resource && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {RESOURCE_LABELS[log.resource] || log.resource}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground font-mono">
                                                {log.ipAddress || "-"}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        log.status === "SUCCESS"
                                                            ? "text-green-600 border-green-600"
                                                            : "text-red-600 border-red-600"
                                                    }
                                                >
                                                    {log.status === "SUCCESS" ? "สำเร็จ" : "ล้มเหลว"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openDetail(log)}
                                                    className={hasChanges ? "text-primary" : ""}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    {hasChanges && (
                                                        <span className="ml-1 text-xs">
                                                            ({details?.changes?.length})
                                                        </span>
                                                    )}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        แสดง {page * limit + 1} - {Math.min((page + 1) * limit, total)} จาก {total} รายการ
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => p - 1)}
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
                            onClick={() => setPage(p => p + 1)}
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
