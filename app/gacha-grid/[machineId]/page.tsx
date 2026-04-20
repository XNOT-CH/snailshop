import { cache } from "react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { db, users, gachaMachines } from "@/lib/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { GachaGridMachine } from "@/components/GachaGridMachine";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { buildPageMetadata } from "@/lib/seo";
import { EMPTY_USER_BALANCES } from "@/lib/userBalances";
import { normalizeGachaCost } from "@/lib/gachaCost";

export const dynamic = "force-dynamic";

const getMachine = cache(async (machineId: string) => {
    return db.query.gachaMachines.findFirst({
        where: eq(gachaMachines.id, machineId),
    });
});

export async function generateMetadata({
    params,
}: Readonly<{
    params: Promise<{ machineId: string }>;
}>): Promise<Metadata> {
    const { machineId } = await params;
    const machine = await getMachine(machineId);

    if (!machine) {
        return buildPageMetadata({
            title: "ไม่พบเครื่องกาชา",
            path: `/gacha-grid/${machineId}`,
            noIndex: true,
        });
    }

    return buildPageMetadata({
        title: machine.name,
        description: machine.description || `ลุ้นรับรางวัลจาก ${machine.name}`,
        path: `/gacha-grid/${machineId}`,
        image: machine.imageUrl,
        noIndex: !machine.isActive || !machine.isEnabled,
    });
}

export default async function GachaGridPage({
    params,
}: Readonly<{
    params: Promise<{ machineId: string }>;
}>) {
    const { machineId } = await params;
    const maintenance = getMaintenanceState("gacha");
    const machine = await getMachine(machineId);
    const normalizedCost = machine ? normalizeGachaCost(machine.costType, machine.costAmount) : normalizeGachaCost("FREE", 0);

    if (!machine?.isActive || !machine.isEnabled) notFound();

    const session = await auth();
    const userId = session?.user?.id;
    let initialBalances = EMPTY_USER_BALANCES;

    if (userId && normalizedCost.costType !== "FREE") {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { creditBalance: true, pointBalance: true, ticketBalance: true },
        });
        if (user) {
            initialBalances = {
                creditBalance: Number(user.creditBalance ?? 0),
                pointBalance: Number(user.pointBalance ?? 0),
                ticketBalance: Number(user.ticketBalance ?? 0),
            };
        }
    }

    return (
        <div className="relative left-1/2 min-h-screen w-screen -translate-x-1/2 bg-background sm:left-auto sm:w-auto sm:translate-x-0">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1a56db] via-[#1f4fc2] to-[#10284d] px-5 py-6 text-center sm:px-6 sm:py-8">
                <div
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpolygon points='30,0 60,17 60,35 30,52 0,35 0,17' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
                        backgroundSize: "60px 52px",
                    }}
                />
                <h1 className="relative z-10 mb-1.5 text-2xl font-bold text-white sm:text-[2rem]">{machine.name}</h1>
                <div className="relative z-10 md:hidden">
                    <Link
                        href="/gachapons"
                        className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-blue-100 transition-colors hover:bg-white/15 hover:text-white"
                    >
                        หมวดหมู่กาชา
                    </Link>
                </div>
                <p className="relative z-10 hidden flex-wrap items-center justify-center gap-1 text-xs text-blue-200 md:flex md:text-sm">
                    <Link href="/" className="transition-colors hover:text-white">หน้าหลัก</Link>
                    <ChevronRight className="h-3 w-3 opacity-60" />
                    <Link href="/gachapons" className="transition-colors hover:text-white">หมวดหมู่กาชา</Link>
                    <ChevronRight className="h-3 w-3 opacity-60" />
                    <span className="font-semibold text-white">{machine.name}</span>
                </p>
            </div>

            <div className="mx-auto w-full max-w-none px-2 pb-6 pt-2 sm:max-w-lg sm:px-4 sm:py-8">
                <div className="bg-card p-2 sm:rounded-[1.75rem] sm:border sm:border-border/70 sm:shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)] sm:p-4">
                    <GachaGridMachine
                        machineId={machineId}
                        machineName={machine.name}
                        costType={normalizedCost.costType}
                        costAmount={normalizedCost.costAmount}
                        initialBalances={initialBalances}
                        maintenance={maintenance}
                    />
                </div>
            </div>
        </div>
    );
}
