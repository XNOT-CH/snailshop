"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showConfirm, showError, showSuccess } from "@/lib/swal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Check, Loader2, X } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { cn } from "@/lib/utils";

export interface TopupCodeUsage {
    id: string;
    code: string;
    amount: number;
    status: string;
    createdAt: string;
    user: {
        email: string | null;
        username: string;
    };
}

interface TopupCodeUsageTableProps {
    usages: TopupCodeUsage[];
}

const STATUS_META: Record<string, { label: string; className: string }> = {
    PENDING: {
        label: "รออนุมัติ",
        className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    },
    COMPLETED: {
        label: "สำเร็จ",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    REJECTED: {
        label: "ปฏิเสธ",
        className: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
    },
};

function StatusBadge({ status }: Readonly<{ status: string }>) {
    const meta = STATUS_META[status] ?? STATUS_META.COMPLETED;

    return (
        <Badge variant="outline" className={meta.className}>
            {meta.label}
        </Badge>
    );
}

export function TopupCodeUsageTable({ usages }: Readonly<TopupCodeUsageTableProps>) {
    const router = useRouter();
    const [processingId, setProcessingId] = useState<string | null>(null);
    const permissions = useAdminPermissions();
    const canApprove = permissions.includes(PERMISSIONS.TOPUP_CODE_APPROVE);
    const canReject = permissions.includes(PERMISSIONS.TOPUP_CODE_REJECT);

    const handleAction = async (usageId: string, action: "APPROVE" | "REJECT") => {
        if ((action === "APPROVE" && !canApprove) || (action === "REJECT" && !canReject)) {
            showError("คุณไม่มีสิทธิ์ดำเนินการนี้");
            return;
        }
        const actionText = action === "APPROVE" ? "อนุมัติ" : "ปฏิเสธ";
        const confirmed = await showConfirm(
            "ยืนยันการดำเนินการ",
            `คุณต้องการ${actionText}รายการนี้ใช่หรือไม่?`
        );

        if (!confirmed) {
            return;
        }

        setProcessingId(usageId);

        try {
            const response = await fetchWithCsrf("/api/admin/slips", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: usageId, action }),
            });

            const data = await response.json();

            if (data.success) {
                showSuccess(data.message);
                router.refresh();
            } else {
                showError(data.message);
            }
        } catch (error) {
            console.error("[TOPUP_CODE_USAGE_ACTION]", error);
            showError("ไม่สามารถดำเนินการได้");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-[#2d4362] dark:bg-zinc-900">
            <Table className="min-w-full md:min-w-[760px]">
                <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 dark:bg-transparent">
                        <TableHead className="font-semibold text-slate-600 dark:text-[#9ab0cb]">User</TableHead>
                        <TableHead className="font-semibold text-slate-600 dark:text-[#9ab0cb]">โค้ด</TableHead>
                        <TableHead className="font-semibold text-slate-600 dark:text-[#9ab0cb]">เครดิต</TableHead>
                        <TableHead className="hidden font-semibold text-slate-600 dark:text-[#9ab0cb] md:table-cell">วันเวลา</TableHead>
                        <TableHead className="font-semibold text-slate-600 dark:text-[#9ab0cb]">สถานะ</TableHead>
                        <TableHead className="text-right font-semibold text-slate-600 dark:text-[#9ab0cb]">จัดการ</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {usages.map((usage, index) => (
                        <TableRow key={usage.id} className={index % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-slate-50/35 dark:bg-white/[0.02]"}>
                            <TableCell className="font-medium text-slate-800 break-all dark:text-[#eef4ff]">
                                {usage.user.email || usage.user.username}
                            </TableCell>
                            <TableCell>
                                <code className="rounded bg-muted px-2 py-1 font-mono text-xs">{usage.code}</code>
                            </TableCell>
                            <TableCell className="font-bold text-indigo-600 dark:text-indigo-400">
                                +฿{usage.amount.toLocaleString()}
                            </TableCell>
                            <TableCell className="hidden text-slate-500 dark:text-[#9ab0cb] md:table-cell">
                                <div className="space-y-0.5">
                                    <p>
                                        {new Date(usage.createdAt).toLocaleDateString("th-TH", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </p>
                                    <p className="text-xs text-slate-400 dark:text-[#8399b8]">
                                        {new Date(usage.createdAt).toLocaleTimeString("th-TH", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                            </TableCell>
                            <TableCell>
                                <StatusBadge status={usage.status} />
                            </TableCell>
                            <TableCell className="text-right">
                                {usage.status === "PENDING" && (canApprove || canReject) ? (
                                    <div className={cn("flex flex-col justify-end gap-2 sm:flex-row")}>
                                        {canApprove ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-emerald-200 bg-emerald-50 font-semibold text-emerald-700 shadow-none hover:bg-emerald-100 hover:text-emerald-800"
                                                onClick={() => handleAction(usage.id, "APPROVE")}
                                                disabled={processingId === usage.id}
                                            >
                                                {processingId === usage.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Check className="mr-1 h-4 w-4" />
                                                        อนุมัติ
                                                    </>
                                                )}
                                            </Button>
                                        ) : null}
                                        {canReject ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-rose-200 bg-rose-50 font-semibold text-rose-600 shadow-none hover:bg-rose-100 hover:text-rose-700"
                                                onClick={() => handleAction(usage.id, "REJECT")}
                                                disabled={processingId === usage.id}
                                            >
                                                {processingId === usage.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <X className="mr-1 h-4 w-4" />
                                                        ปฏิเสธ
                                                    </>
                                                )}
                                            </Button>
                                        ) : null}
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-400">—</span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
