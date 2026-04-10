"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showConfirm, showError, showSuccess } from "@/lib/swal";
import { Button } from "@/components/ui/button";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, ExternalLink, ImageOff, Loader2, X } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions";

interface Slip {
    id: string;
    amount: number;
    proofImage: string | null;
    createdAt: string;
    user: {
        email: string | null;
        username: string;
    };
}

interface SlipTableProps {
    slips: Slip[];
}

export function SlipTable({ slips }: Readonly<SlipTableProps>) {
    const router = useRouter();
    const [processingId, setProcessingId] = useState<string | null>(null);
    const permissions = useAdminPermissions();
    const canApprove = permissions.includes(PERMISSIONS.SLIP_APPROVE);
    const canReject = permissions.includes(PERMISSIONS.SLIP_REJECT);

    const handleAction = async (slipId: string, action: "APPROVE" | "REJECT") => {
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

        setProcessingId(slipId);

        try {
            const response = await fetch("/api/admin/slips", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: slipId, action }),
            });

            const data = await response.json();

            if (data.success) {
                showSuccess(data.message);
                router.refresh();
            } else {
                showError(data.message);
            }
        } catch (error) {
            console.error("[SLIP_ACTION]", error);
            showError("ไม่สามารถดำเนินการได้");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <Table className="min-w-[720px]">
                <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead className="font-semibold text-slate-600">User</TableHead>
                        <TableHead className="font-semibold text-slate-600">Amount</TableHead>
                        <TableHead className="hidden font-semibold text-slate-600 md:table-cell">Date</TableHead>
                        <TableHead className="hidden font-semibold text-slate-600 md:table-cell">Proof Image</TableHead>
                        <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {slips.map((slip, index) => (
                        <TableRow key={slip.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/35"}>
                            <TableCell className="font-medium text-slate-800">
                                {slip.user.email || slip.user.username}
                            </TableCell>
                            <TableCell className="font-bold text-indigo-600">
                                ฿{slip.amount.toLocaleString()}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-slate-500">
                                <div className="space-y-0.5">
                                    <p>
                                        {new Date(slip.createdAt).toLocaleDateString("th-TH", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {new Date(slip.createdAt).toLocaleTimeString("th-TH", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                                {slip.proofImage ? (
                                    <a
                                        href={slip.proofImage}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 transition-colors hover:border-slate-300 hover:bg-slate-100"
                                    >
                                        <Avatar className="h-10 w-10 rounded-md">
                                            <AvatarImage
                                                src={slip.proofImage}
                                                alt="Proof"
                                                className="object-cover"
                                            />
                                            <AvatarFallback className="rounded-md text-xs">
                                                IMG
                                            </AvatarFallback>
                                        </Avatar>
                                        <ExternalLink className="h-4 w-4 text-slate-400" />
                                    </a>
                                ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-400">
                                        <ImageOff className="h-3.5 w-3.5" />
                                        ไม่มีรูป
                                    </span>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                {canApprove || canReject ? (
                                    <div className="flex flex-col justify-end gap-2 sm:flex-row">
                                        {canApprove ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-emerald-200 bg-emerald-50 font-semibold text-emerald-700 shadow-none hover:bg-emerald-100 hover:text-emerald-800"
                                                onClick={() => handleAction(slip.id, "APPROVE")}
                                                disabled={processingId === slip.id}
                                            >
                                                {processingId === slip.id ? (
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
                                                onClick={() => handleAction(slip.id, "REJECT")}
                                                disabled={processingId === slip.id}
                                            >
                                                {processingId === slip.id ? (
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
                                    <span className="text-xs text-slate-400">ดูได้อย่างเดียว</span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
