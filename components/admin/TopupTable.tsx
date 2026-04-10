"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showConfirm, showSuccess, showError } from "@/lib/swal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { PERMISSIONS } from "@/lib/permissions";
import {
    Check,
    X,
    Loader2,
    ExternalLink,
    Clock,
    CheckCircle,
    XCircle,
    Search,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────
interface TopupRecord {
    id: string;
    amount: number;
    status: string;
    proofImage: string | null;
    senderName: string | null;
    senderBank: string | null;
    transactionRef: string | null;
    createdAt: string;
    user: {
        username: string;
        email: string | null;
    };
}

interface TopupTableProps {
    topups: TopupRecord[];
}

// ─── Status Badge ───────────────────────────────────────
function StatusBadge({ status }: Readonly<{ status: string }>) {
    const config: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
        PENDING: {
            icon: <Clock className="h-3.5 w-3.5" />,
            label: "รอดำเนินการ",
            className:
                "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
        },
        APPROVED: {
            icon: <CheckCircle className="h-3.5 w-3.5" />,
            label: "อนุมัติแล้ว",
            className:
                "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
        },
        REJECTED: {
            icon: <XCircle className="h-3.5 w-3.5" />,
            label: "ปฏิเสธ",
            className:
                "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
        },
    };

    const c = config[status] || config.PENDING;

    return (
        <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${c.className}`}
        >
            {c.icon}
            {c.label}
        </span>
    );
}

// ─── Component ──────────────────────────────────────────
export function TopupTable({ topups }: Readonly<TopupTableProps>) {
    const router = useRouter();
    const permissions = useAdminPermissions();
    const canApproveSlip = permissions.includes(PERMISSIONS.SLIP_APPROVE);
    const canRejectSlip = permissions.includes(PERMISSIONS.SLIP_REJECT);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    // Filter topups
    const filtered = topups.filter((t) => {
        const matchesStatus = filter === "ALL" || t.status === filter;
        const matchesSearch =
            searchQuery === "" ||
            t.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
            (t.senderName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
            (t.transactionRef?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        return matchesStatus && matchesSearch;
    });

    const handleAction = async (topupId: string, action: "APPROVE" | "REJECT") => {
        if (action === "APPROVE" && !canApproveSlip) {
            showError("คุณไม่มีสิทธิ์อนุมัติสลิป");
            return;
        }

        if (action === "REJECT" && !canRejectSlip) {
            showError("คุณไม่มีสิทธิ์ปฏิเสธสลิป");
            return;
        }

        const actionText = action === "APPROVE" ? "อนุมัติ" : "ปฏิเสธ";
        const confirmed = await showConfirm(
            "ยืนยันการดำเนินการ",
            `คุณต้องการ${actionText}รายการนี้ใช่หรือไม่?`
        );
        if (!confirmed) return;

        setProcessingId(topupId);
        try {
            const response = await fetch("/api/admin/slips", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: topupId, action }),
            });

            const data = await response.json();
            if (data.success) {
                showSuccess(data.message);
                router.refresh();
            } else {
                showError(data.message);
            }
        } catch {
            showError("ไม่สามารถดำเนินการได้");
        } finally {
            setProcessingId(null);
        }
    };

    const filterTabs = [
        { key: "ALL" as const, label: "ทั้งหมด", count: topups.length },
        { key: "PENDING" as const, label: "รอดำเนินการ", count: topups.filter((t) => t.status === "PENDING").length },
        { key: "APPROVED" as const, label: "อนุมัติแล้ว", count: topups.filter((t) => t.status === "APPROVED").length },
        { key: "REJECTED" as const, label: "ปฏิเสธ", count: topups.filter((t) => t.status === "REJECTED").length },
    ];

    return (
        <div className="space-y-4">
            {/* Search + Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Filter Tabs */}
                <div className="w-full overflow-x-auto pb-1 sm:w-auto sm:pb-0">
                    <div className="flex min-w-max items-center gap-1 rounded-lg bg-muted p-1">
                        {filterTabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${filter === tab.key
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อผู้ใช้, อีเมล..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <p className="text-sm">ไม่พบรายการเติมเงิน</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="min-w-[720px] w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                                    ผู้ใช้
                                </th>
                                <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                                    จำนวนเงิน
                                </th>
                                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">
                                    ผู้โอน
                                </th>
                                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                                    สถานะ
                                </th>
                                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">
                                    สลิป
                                </th>
                                <th className="text-right py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">
                                    วันที่
                                </th>
                                <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                                    จัดการ
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((topup) => (
                                <tr
                                    key={topup.id}
                                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                                >
                                    {/* User */}
                                    <td className="py-3 px-4">
                                        <div>
                                            <p className="font-medium">
                                                {topup.user.username}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {topup.user.email || "—"}
                                            </p>
                                        </div>
                                    </td>

                                    {/* Amount */}
                                    <td className="py-3 px-4 text-right">
                                        <span className="font-bold text-primary tabular-nums">
                                            ฿{topup.amount.toLocaleString()}
                                        </span>
                                    </td>

                                    {/* Sender */}
                                    <td className="py-3 px-4 hidden md:table-cell">
                                        <div>
                                            <p className="text-sm">
                                                {topup.senderName || "—"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {topup.senderBank || ""}
                                            </p>
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="py-3 px-4">
                                        <StatusBadge status={topup.status} />
                                    </td>

                                    {/* Proof Image */}
                                    <td className="py-3 px-4 hidden lg:table-cell">
                                        {topup.proofImage ? (
                                            <a
                                                href={topup.proofImage}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                                ดูสลิป
                                            </a>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                ไม่มีรูป
                                            </span>
                                        )}
                                    </td>

                                    {/* Date */}
                                    <td className="py-3 px-4 text-right hidden md:table-cell">
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {new Date(topup.createdAt).toLocaleDateString(
                                                "th-TH",
                                                {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "2-digit",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                }
                                            )}
                                        </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="py-3 px-4 text-right">
                                        {topup.status === "PENDING" ? (
                                            <div className="flex flex-col items-stretch justify-end gap-1.5 sm:flex-row">
                                                {canApproveSlip && (
                                                    <Button
                                                        size="sm"
                                                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        onClick={() =>
                                                            handleAction(topup.id, "APPROVE")
                                                        }
                                                        disabled={processingId === topup.id}
                                                    >
                                                        {processingId === topup.id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Check className="h-3.5 w-3.5 mr-1" />
                                                                อนุมัติ
                                                            </>
                                                        )}
                                                    </Button>
                                                )}
                                                {canRejectSlip && (
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="h-8"
                                                        onClick={() =>
                                                            handleAction(topup.id, "REJECT")
                                                        }
                                                        disabled={processingId === topup.id}
                                                    >
                                                        {processingId === topup.id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <X className="h-3.5 w-3.5 mr-1" />
                                                                ปฏิเสธ
                                                            </>
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                ดำเนินการแล้ว
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
