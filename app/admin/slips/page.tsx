import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck, AlertCircle } from "lucide-react";
import { SlipTable } from "@/components/admin/SlipTable";

export const dynamic = "force-dynamic";

export default async function AdminSlipsPage() {
    // Fetch all pending topup requests
    const pendingSlips = await db.topup.findMany({
        where: { status: "PENDING" },
        include: { user: true },
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-zinc-900 flex items-center gap-2">
                    ตรวจสอบสลิป <span className="text-3xl">📑</span>
                </h1>
                <p className="text-zinc-500">
                    ตรวจสอบและอนุมัติคำขอเติมเงิน
                </p>
            </div>

            {/* Pending Requests Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5" />
                        รออนุมัติ ({pendingSlips.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {pendingSlips.length === 0 ? (
                        <div className="py-12 text-center">
                            <AlertCircle className="mx-auto h-12 w-12 text-zinc-300" />
                            <p className="mt-4 text-zinc-500">
                                ไม่มีคำขอที่รออนุมัติ
                            </p>
                            <p className="text-sm text-zinc-400 mt-2">
                                ไปที่{" "}
                                <a
                                    href="/api/seed-slips"
                                    className="text-indigo-600 hover:underline"
                                >
                                    /api/seed-slips
                                </a>{" "}
                                เพื่อสร้างข้อมูลตัวอย่าง
                            </p>
                        </div>
                    ) : (
                        <SlipTable
                            slips={pendingSlips.map((slip) => ({
                                id: slip.id,
                                amount: Number(slip.amount),
                                proofImage: slip.proofImage,
                                createdAt: slip.createdAt.toISOString(),
                                user: {
                                    email: slip.user.email,
                                    username: slip.user.username,
                                },
                            }))}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
