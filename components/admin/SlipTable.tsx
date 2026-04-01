"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showConfirm, showSuccess, showError } from "@/lib/swal";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, Loader2, ExternalLink } from "lucide-react";

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

    const handleAction = async (slipId: string, action: "APPROVE" | "REJECT") => {
        const actionText = action === "APPROVE" ? "อนุมัติ" : "ปฏิเสธ";
        const confirmed = await showConfirm("ยืนยันการดำเนินการ", `คุณต้องการ${actionText}รายการนี้ใช่หรือไม่?`);
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
        <div className="overflow-x-auto rounded-xl border border-border">
            <Table className="min-w-[640px]">
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="hidden md:table-cell">Date</TableHead>
                        <TableHead className="hidden md:table-cell">Proof Image</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {slips.map((slip) => (
                        <TableRow key={slip.id}>
                            <TableCell className="font-medium">
                                {slip.user.email || slip.user.username}
                            </TableCell>
                            <TableCell className="font-bold text-indigo-600">
                                ฿{slip.amount.toLocaleString()}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-zinc-500">
                                {new Date(slip.createdAt).toLocaleDateString("th-TH", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                                {slip.proofImage ? (
                                    <a
                                        href={slip.proofImage}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2"
                                    >
                                        <Avatar className="h-10 w-10 rounded-md">
                                            <AvatarImage
                                                src={slip.proofImage}
                                                alt="Proof"
                                                className="object-cover"
                                            />
                                            <AvatarFallback className="rounded-md">
                                                IMG
                                            </AvatarFallback>
                                        </Avatar>
                                        <ExternalLink className="h-4 w-4 text-zinc-400" />
                                    </a>
                                ) : (
                                    <span className="text-zinc-400">No image</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex flex-col justify-end gap-2 sm:flex-row">
                                    <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => handleAction(slip.id, "APPROVE")}
                                        disabled={processingId === slip.id}
                                    >
                                        {processingId === slip.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Check className="mr-1 h-4 w-4" />
                                                Approve
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleAction(slip.id, "REJECT")}
                                        disabled={processingId === slip.id}
                                    >
                                        {processingId === slip.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <X className="mr-1 h-4 w-4" />
                                                Reject
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
