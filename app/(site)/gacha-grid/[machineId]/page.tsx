import { cache } from "react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { db, users, gachaMachines } from "@/lib/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { GachaGridMachine } from "@/components/GachaGridMachine";
import { PageBand } from "@/components/PageBand";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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

    // Same frame as the shop and the machine list: a glow behind the title with a
    // way back to the list, and the board on the tinted band below it.
    return (
        <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
            <PageBand tone="lead" className="pt-8 pb-2 lg:pt-10 lg:pb-4">
                <Link
                    href="/gachapons"
                    prefetch={false}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-out hover:text-primary"
                >
                    <ArrowLeft className="h-4 w-4" />
                    ตู้กาชา
                </Link>
                <h1 className="mt-3 text-3xl font-bold leading-tight text-[var(--page-heading)] sm:text-4xl">{machine.name}</h1>
            </PageBand>

            <PageBand tone="plain" className="flex-1 pt-6 lg:pt-8">
                <div className="mx-auto w-full sm:max-w-lg">
                    <GachaGridMachine
                        machineId={machineId}
                        machineName={machine.name}
                        costType={normalizedCost.costType}
                        costAmount={normalizedCost.costAmount}
                        initialBalances={initialBalances}
                        maintenance={maintenance}
                    />
                </div>
            </PageBand>
        </div>
    );
}
