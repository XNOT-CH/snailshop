import { eq } from "drizzle-orm";
import { AlertCircle, Clock3, FileCheck, ImageIcon, Wallet } from "lucide-react";
import { SlipTable } from "@/components/admin/SlipTable";
import { db, topups } from "@/lib/db";
import { decryptTopupSensitiveFields } from "@/lib/sensitiveData";
import { buildAdminSlipImageUrl } from "@/lib/slipStorage";

export const dynamic = "force-dynamic";

export default async function AdminSlipsPage() {
    const pendingSlips = await db.query.topups.findMany({
        where: eq(topups.status, "PENDING"),
        with: { user: true },
        orderBy: (table, { desc }) => desc(table.createdAt),
    });
    const decryptedPendingSlips = pendingSlips.map((slip) => decryptTopupSensitiveFields(slip));
    const totalPendingAmount = decryptedPendingSlips.reduce((sum, slip) => sum + Number(slip.amount), 0);
    const slipsWithImage = decryptedPendingSlips.filter((slip) => Boolean(slip.proofImage)).length;
    const latestPendingAt = decryptedPendingSlips[0]?.createdAt
        ? new Date(decryptedPendingSlips[0].createdAt).toLocaleString("th-TH", {
            dateStyle: "medium",
            timeStyle: "short",
        })
        : "-";

    return (
        <div className="space-y-6">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                    <FileCheck className="h-6 w-6 text-[#1a56db]" />
                    ตรวจสอบสลิป
                </h1>
                <p className="mt-1 text-muted-foreground">ตรวจสอบและอนุมัติคำขอเติมเงิน</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)] p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                            <FileCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">รออนุมัติ</p>
                            <p className="text-2xl font-bold text-slate-900">{decryptedPendingSlips.length}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_100%)] p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">ยอดรวมรอตรวจ</p>
                            <p className="text-2xl font-bold text-slate-900">฿{totalPendingAmount.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_100%)] p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm">
                            <ImageIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm text-slate-500">แนบรูปแล้ว</p>
                            <p className="text-lg font-bold text-slate-900">{slipsWithImage} รายการ</p>
                            <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                                <Clock3 className="h-3.5 w-3.5" />
                                <span className="truncate">ล่าสุด {latestPendingAt}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm dark:bg-zinc-900">
                <div className="flex items-center gap-2 border-b border-border px-5 py-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-[#1a56db]">
                        <FileCheck className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-bold text-foreground">รายการรออนุมัติ ({decryptedPendingSlips.length})</span>
                </div>
                {decryptedPendingSlips.length === 0 ? (
                    <div className="py-14 text-center text-muted-foreground">
                        <AlertCircle className="mx-auto mb-3 h-12 w-12 opacity-30" />
                        <p>ไม่มีคำขอที่รออนุมัติ</p>
                    </div>
                ) : (
                    <SlipTable
                        slips={decryptedPendingSlips.map((slip) => ({
                            id: slip.id,
                            amount: Number(slip.amount),
                            proofImage: buildAdminSlipImageUrl(slip.id, Boolean(slip.proofImage)),
                            createdAt: typeof slip.createdAt === "string" ? slip.createdAt : new Date(slip.createdAt).toISOString(),
                            user: {
                                email: slip.user.email,
                                username: slip.user.username,
                            },
                        }))}
                    />
                )}
            </div>
        </div>
    );
}
