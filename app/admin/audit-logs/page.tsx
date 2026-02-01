"use client";

import { useState, useEffect } from "react";
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Loader2,
    FileText,
    ChevronLeft,
    ChevronRight,
    Search,
    Filter,
    RefreshCw,
    Eye,
    ArrowRight,
} from "lucide-react";

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
    { value: "PRODUCT_CREATE", label: "สร้างสินค้า" },
    { value: "PRODUCT_UPDATE", label: "แก้ไขสินค้า" },
    { value: "PRODUCT_DELETE", label: "ลบสินค้า" },
    { value: "NEWS_CREATE", label: "สร้างข่าว" },
    { value: "NEWS_UPDATE", label: "แก้ไขข่าว" },
    { value: "NEWS_DELETE", label: "ลบข่าว" },
    { value: "TOPUP_REQUEST", label: "คำขอเติมเงิน" },
    { value: "TOPUP_APPROVE", label: "อนุมัติเติมเงิน" },
    { value: "TOPUP_REJECT", label: "ปฏิเสธเติมเงิน" },
    { value: "SETTINGS_UPDATE", label: "แก้ไขตั้งค่า" },
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
    isFeatured: "แนะนำ",
    name: "ชื่อ",
    role: "บทบาท",
    credit: "เครดิต",
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

    // Detail dialog
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const fetchLogs = async () => {
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
    };

    useEffect(() => {
        fetchLogs();
    }, [page, actionFilter]);

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

    const openDetail = (log: AuditLog) => {
        setSelectedLog(log);
        setDetailOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <FileText className="h-6 w-6" />
                        Audit Logs
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        ประวัติกิจกรรมทั้งหมดในระบบ
                    </p>
                </div>
                <Button onClick={fetchLogs} variant="outline" disabled={loading}>
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
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
                        <SelectTrigger className="w-48">
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
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>ไม่พบประวัติกิจกรรม</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>เวลา</TableHead>
                                    <TableHead>ผู้ใช้</TableHead>
                                    <TableHead>กิจกรรม</TableHead>
                                    <TableHead>Target</TableHead>
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
                                                            {log.resource}
                                                            {log.resourceId && (
                                                                <span> ({log.resourceId.slice(0, 8)}...)</span>
                                                            )}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground font-mono">
                                                {log.ipAddress || "-"}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {log.status === "SUCCESS" ? (
                                                    <Badge variant="outline" className="text-green-600 border-green-600">
                                                        สำเร็จ
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-red-600 border-red-600">
                                                        ล้มเหลว
                                                    </Badge>
                                                )}
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

            {/* Detail Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            รายละเอียดกิจกรรม
                        </DialogTitle>
                    </DialogHeader>

                    {selectedLog && (() => {
                        const details = parseDetails(selectedLog.details);
                        return (
                            <div className="space-y-6">
                                {/* Summary */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground mb-1">ผู้ดำเนินการ</p>
                                        <p className="font-medium">
                                            {selectedLog.user?.username || "ไม่ทราบ"}
                                        </p>
                                        {selectedLog.user?.id && (
                                            <p className="text-xs text-muted-foreground font-mono">
                                                {selectedLog.user.id}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground mb-1">เวลา</p>
                                        <p className="font-medium">
                                            {formatDate(selectedLog.createdAt)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground mb-1">กิจกรรม</p>
                                        <Badge className={ACTION_COLORS[selectedLog.action] || ""}>
                                            {getActionLabel(selectedLog.action)}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground mb-1">IP Address</p>
                                        <p className="font-medium font-mono">
                                            {selectedLog.ipAddress || "-"}
                                        </p>
                                    </div>
                                </div>

                                {/* Target */}
                                {(selectedLog.resource || details?.resourceName) && (
                                    <div className="bg-muted/50 rounded-lg p-4">
                                        <p className="text-sm text-muted-foreground mb-2">Target</p>
                                        <div className="space-y-1">
                                            {details?.resourceName && (
                                                <p className="font-medium">{details.resourceName}</p>
                                            )}
                                            {selectedLog.resource && (
                                                <p className="text-sm text-muted-foreground">
                                                    {selectedLog.resource}: {selectedLog.resourceId}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Changes */}
                                {details?.changes && details.changes.length > 0 && (
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            การเปลี่ยนแปลง ({details.changes.length} รายการ)
                                        </p>
                                        <div className="space-y-2">
                                            {details.changes.map((change, index) => (
                                                <div
                                                    key={index}
                                                    className="bg-muted/30 rounded-lg p-3 border border-border"
                                                >
                                                    <p className="text-sm font-medium mb-2">
                                                        {getFieldLabel(change.field)}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <div className="flex-1 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 px-2 py-1 rounded">
                                                            <span className="text-xs text-muted-foreground mr-1">เดิม:</span>
                                                            <span className="font-mono break-all">
                                                                {change.old || "null"}
                                                            </span>
                                                        </div>
                                                        <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                                        <div className="flex-1 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                                                            <span className="text-xs text-muted-foreground mr-1">ใหม่:</span>
                                                            <span className="font-mono break-all">
                                                                {change.new || "null"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* User Agent */}
                                {selectedLog.userAgent && (
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">User Agent</p>
                                        <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                                            {selectedLog.userAgent}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}
