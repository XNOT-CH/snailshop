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

    if (!machine?.isActive || !machine.isEnabled) notFound();

    const session = await auth();
    const userId = session?.user?.id;
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
        <div className="min-h-screen bg-background">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1a56db] via-[#1f4fc2] to-[#10284d] py-10 px-6 text-center">
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

            <div className="max-w-lg mx-auto px-4 py-8">
                <div className="rounded-[1.75rem] border border-border/80 bg-card/95 p-4 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.45)] backdrop-blur-sm">
                    <GachaGridMachine
                        machineId={machineId}
                        machineName={machine.name}
                        costType={machine.costType ?? "FREE"}
                        costAmount={Number(machine.costAmount ?? 0)}
                        userBalance={userBalance}
                        maintenance={maintenance}
                    />
                </div>
            </div>
        </div>
    );
}
