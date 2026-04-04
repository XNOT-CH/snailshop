import { db, topups } from "@/lib/db";
import { eq } from "drizzle-orm";
import { FileCheck, AlertCircle, Clock3, ImageIcon, Wallet } from "lucide-react";
import { SlipTable } from "@/components/admin/SlipTable";

export const dynamic = "force-dynamic";

export default async function AdminSlipsPage() {
    const pendingSlips = await db.query.topups.findMany({
        where: eq(topups.status, "PENDING"),
        with: { user: true },
        orderBy: (t, { desc }) => desc(t.createdAt),
    });
    const totalPendingAmount = pendingSlips.reduce((sum, slip) => sum + Number(slip.amount), 0);
    const slipsWithImage = pendingSlips.filter((slip) => Boolean(slip.proofImage)).length;
    const latestPendingAt = pendingSlips[0]?.createdAt
        ? new Date(pendingSlips[0].createdAt).toLocaleString("th-TH", {
            dateStyle: "medium",
            timeStyle: "short",
        })
        : "ไม่มีรายการล่าสุด";

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <FileCheck className="h-6 w-6 text-[#1a56db]" />
                    ตรวจสอบสลิป
                </h1>
                <p className="text-muted-foreground mt-1">ตรวจสอบและอนุมัติคำขอเติมเงิน</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)] p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                            <FileCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">รออนุมัติ</p>
                            <p className="text-2xl font-bold text-slate-900">{pendingSlips.length}</p>
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

            {/* Pending Requests Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
                {/* Card Header */}
                <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#1a56db] rounded flex items-center justify-center">
                        <FileCheck className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-bold text-foreground">รออนุมัติ ({pendingSlips.length})</span>
                </div>
                {pendingSlips.length === 0 ? (
                    <div className="py-14 text-center text-muted-foreground">
                        <AlertCircle className="mx-auto h-12 w-12 opacity-30 mb-3" />
                        <p>ไม่มีคำขอที่รออนุมัติ</p>
                    </div>
                ) : (
                    <SlipTable
                        slips={pendingSlips.map((slip) => ({
                            id: slip.id,
                            amount: Number(slip.amount),
                            proofImage: slip.proofImage,
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
