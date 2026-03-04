import { db, topups } from "@/lib/db";
import { eq } from "drizzle-orm";
import { FileCheck, AlertCircle } from "lucide-react";
import { SlipTable } from "@/components/admin/SlipTable";

export const dynamic = "force-dynamic";

export default async function AdminSlipsPage() {
    const pendingSlips = await db.query.topups.findMany({
        where: eq(topups.status, "PENDING"),
        with: { user: true },
        orderBy: (t, { desc }) => desc(t.createdAt),
    });

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
                            createdAt: typeof slip.createdAt === "string" ? slip.createdAt : new Date(slip.createdAt as any).toISOString(),
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
