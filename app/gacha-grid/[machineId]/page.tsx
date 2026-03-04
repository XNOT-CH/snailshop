import { cookies } from "next/headers";
import { db, users, gachaMachines } from "@/lib/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { GachaGridMachine } from "@/components/GachaGridMachine";
import Link from "next/link";
import { Home, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GachaGridPage({
    params,
}: {
    params: Promise<{ machineId: string }>;
}) {
    const { machineId } = await params;

    const machine = await db.query.gachaMachines.findFirst({ where: eq(gachaMachines.id, machineId) });

    if (!machine || !machine.isActive) notFound();

    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;
    let userBalance = 0;

    if (userId && machine.costType !== "FREE") {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { creditBalance: true, pointBalance: true },
        });
        if (user) {
            userBalance = Number(machine.costType === "CREDIT" ? (user.creditBalance ?? 0) : (user.pointBalance ?? 0));
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
            {/* Banner */}
            <div className="bg-gradient-to-br from-[#1a56db] via-[#1e40af] to-[#1e3a5f] relative overflow-hidden py-10 px-6 text-center">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpolygon points='30,0 60,17 60,35 30,52 0,35 0,17' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
                    backgroundSize: "60px 52px",
                }} />
                <h1 className="text-3xl font-bold text-white mb-2 relative z-10">{machine.name}</h1>
                <p className="text-blue-200 text-sm relative z-10 flex items-center justify-center gap-1.5">
                    <Link href="/" className="hover:text-white transition-colors">หน้าหลัก</Link>
                    <ChevronRight className="w-3 h-3 opacity-60" />
                    <Link href="/gachapons" className="hover:text-white transition-colors">หมวดหมู่กาชา</Link>
                    <ChevronRight className="w-3 h-3 opacity-60" />
                    <span className="text-white font-semibold">{machine.name}</span>
                </p>
            </div>

            {/* Content */}
            <div className="max-w-lg mx-auto px-4 py-8">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-sm p-4">
                    <GachaGridMachine
                        machineId={machineId}
                        machineName={machine.name}
                        costType={machine.costType ?? "FREE"}
                        costAmount={Number(machine.costAmount ?? 0)}
                        userBalance={userBalance}
                    />
                </div>
            </div>
        </div>
    );
}
