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
        : "เนเธกเนเธกเธตเธฃเธฒเธขเธเธฒเธฃเธฅเนเธฒเธชเธธเธ”";

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <FileCheck className="h-6 w-6 text-[#1a56db]" />
                    เธ•เธฃเธงเธเธชเธญเธเธชเธฅเธดเธ
                </h1>
                <p className="text-muted-foreground mt-1">เธ•เธฃเธงเธเธชเธญเธเนเธฅเธฐเธญเธเธธเธกเธฑเธ•เธดเธเธณเธเธญเน€เธ•เธดเธกเน€เธเธดเธ</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)] p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                            <FileCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">เธฃเธญเธญเธเธธเธกเธฑเธ•เธด</p>
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
                            <p className="text-sm text-slate-500">เธขเธญเธ”เธฃเธงเธกเธฃเธญเธ•เธฃเธงเธ</p>
                            <p className="text-2xl font-bold text-slate-900">เธฟ{totalPendingAmount.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_100%)] p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm">
                            <ImageIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm text-slate-500">เนเธเธเธฃเธนเธเนเธฅเนเธง</p>
                            <p className="text-lg font-bold text-slate-900">{slipsWithImage} เธฃเธฒเธขเธเธฒเธฃ</p>
                            <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                                <Clock3 className="h-3.5 w-3.5" />
                                <span className="truncate">เธฅเนเธฒเธชเธธเธ” {latestPendingAt}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#1a56db] rounded flex items-center justify-center">
                        <FileCheck className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-bold text-foreground">เธฃเธญเธญเธเธธเธกเธฑเธ•เธด ({decryptedPendingSlips.length})</span>
                </div>
                {decryptedPendingSlips.length === 0 ? (
                    <div className="py-14 text-center text-muted-foreground">
                        <AlertCircle className="mx-auto h-12 w-12 opacity-30 mb-3" />
                        <p>เนเธกเนเธกเธตเธเธณเธเธญเธ—เธตเนเธฃเธญเธญเธเธธเธกเธฑเธ•เธด</p>
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
