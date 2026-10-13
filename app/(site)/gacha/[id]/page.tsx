import { cache } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { db, users, gachaMachines, gachaRewards } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { ArrowLeft, Lock } from "lucide-react";
import { auth } from "@/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GachaRhombus } from "@/components/GachaRhombus";
import { GachaGridMachine } from "@/components/GachaGridMachine";
import { PageBand } from "@/components/PageBand";
import { type GachaProductLite } from "@/lib/gachaGrid";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { normalizeGachaCost } from "@/lib/gachaCost";
import { mapEligibleGachaRewardsToProductLite } from "@/lib/features/gacha/rewards";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { buildPageMetadata } from "@/lib/seo";
import { EMPTY_USER_BALANCES } from "@/lib/userBalances";
import { GACHA_PENDING_COOKIE_NAME } from "@/lib/constants/gacha";

export const dynamic = "force-dynamic";

const getMachine = cache(async (id: string) => {
    return db.query.gachaMachines.findFirst({
        where: eq(gachaMachines.id, id),
        columns: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            gameType: true,
            isActive: true,
            isEnabled: true,
            costType: true,
            costAmount: true,
            dailySpinLimit: true,
        },
    });
});

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ id: string }> }>): Promise<Metadata> {
    const { id } = await params;
    const machine = await getMachine(id);

    if (!machine) {
        return buildPageMetadata({
            title: "ไม่พบตู้กาชา",
            path: `/gacha/${id}`,
            noIndex: true,
        });
    }

    const preferredPath = machine.gameType === "GRID_3X3" ? `/gacha-grid/${id}` : `/gacha/${id}`;

    return buildPageMetadata({
        title: machine.name,
        description: machine.description || `ร่วมสนุกกับ ${machine.name} และลุ้นรับรางวัลจากระบบกาชา`,
        path: preferredPath,
        image: machine.imageUrl,
        noIndex: machine.gameType === "GRID_3X3" || !machine.isActive || !machine.isEnabled,
    });
}

export default async function GachaPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
    const { id } = await params;
    const maintenance = getMaintenanceState("gacha");
    const currencySettings = await getCurrencySettings().catch(() => null);

    const [session, cookieStore] = await Promise.all([auth(), cookies()]);
    const userId = session?.user?.id;
    const shouldRestorePendingSpin = Boolean(userId && cookieStore.get(GACHA_PENDING_COOKIE_NAME)?.value);
    const machine = await getMachine(id);

    if (!machine) return notFound();
    if (!machine.isActive || !machine.isEnabled) {
        return (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">ตู้กาชานี้ปิดอยู่ชั่วคราว</p>
                <p className="text-xs text-muted-foreground">กรุณากลับมาใหม่ภายหลัง</p>
            </div>
        );
    }

    const normalizedCost = normalizeGachaCost(machine.costType, machine.costAmount);

    let initialBalances = EMPTY_USER_BALANCES;
    try {
        if (userId) {
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
    } catch {
        // Ignore balance fetch failures and fall back to zero values.
    }

    let products: GachaProductLite[] = [];
    if (machine.gameType === "SPIN_X") {
        try {
            const rewards = await db.query.gachaRewards.findMany({
                where: and(eq(gachaRewards.gachaMachineId, id), eq(gachaRewards.isActive, true)),
                with: { product: { columns: { id: true, name: true, price: true, imageUrl: true, isSold: true, orderId: true } } },
            });

            products = mapEligibleGachaRewardsToProductLite(rewards, currencySettings);
        } catch {
            // Ignore reward fetch failures and render an empty board.
        }
    }

    const settings = {
        isEnabled: true,
        costType: normalizedCost.costType,
        costAmount: normalizedCost.costAmount,
        dailySpinLimit: machine.dailySpinLimit,
    };

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
                <div className="mx-auto max-w-4xl">
                <div className="flex flex-col items-center gap-6">
                    {settings.dailySpinLimit > 0 && (
                        <div className="flex w-full justify-end">
                            <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-sm font-medium text-orange-500 shadow-sm">
                                สุ่มได้ {settings.dailySpinLimit} ครั้ง/วัน
                            </span>
                        </div>
                    )}

                    <div className="flex w-full justify-center">
                        {machine.gameType === "GRID_3X3" ? (
                            <GachaGridMachine
                                machineId={machine.id}
                                machineName={machine.name}
                                costType={normalizedCost.costType}
                                costAmount={normalizedCost.costAmount}
                                initialBalances={initialBalances}
                                maintenance={maintenance}
                            />
                        ) : (
                            <GachaRhombus
                                products={products}
                                settings={settings}
                                initialBalances={initialBalances}
                                machineId={machine.id}
                                maintenance={maintenance}
                                shouldRestorePendingSpin={shouldRestorePendingSpin}
                            />
                        )}
                    </div>
                </div>
                </div>
            </PageBand>
        </div>
    );
}
