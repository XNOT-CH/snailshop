"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export interface TopupCodeUsage {
    id: string;
    code: string;
    amount: number;
    createdAt: string;
    user: {
        email: string | null;
        username: string;
    };
}

interface TopupCodeUsageTableProps {
    usages: TopupCodeUsage[];
}

export function TopupCodeUsageTable({ usages }: Readonly<TopupCodeUsageTableProps>) {
    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-[#2d4362] dark:bg-zinc-900">
            <Table className="min-w-full md:min-w-[720px]">
                <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 dark:bg-transparent">
                        <TableHead className="font-semibold text-slate-600 dark:text-[#9ab0cb]">User</TableHead>
                        <TableHead className="font-semibold text-slate-600 dark:text-[#9ab0cb]">โค้ด</TableHead>
                        <TableHead className="font-semibold text-slate-600 dark:text-[#9ab0cb]">เครดิตที่ได้รับ</TableHead>
                        <TableHead className="text-right font-semibold text-slate-600 dark:text-[#9ab0cb]">วันเวลา</TableHead>
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
                            <TableCell className="text-right text-slate-500 dark:text-[#9ab0cb]">
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
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
