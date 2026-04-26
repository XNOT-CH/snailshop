import { cache } from "react";
import type { Metadata } from "next";
import { db, users, gachaMachines, gachaRewards } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { Lock } from "lucide-react";
import { auth } from "@/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GachaRhombus } from "@/components/GachaRhombus";
import { GachaGridMachine } from "@/components/GachaGridMachine";
import { type GachaProductLite, type GachaTier } from "@/lib/gachaGrid";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { getGachaRewardTypeLabel, normalizeGachaCost } from "@/lib/gachaCost";
import { isRewardEligibleForRoll } from "@/lib/gachaRewardEligibility";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { buildPageMetadata } from "@/lib/seo";
import { EMPTY_USER_BALANCES } from "@/lib/userBalances";

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

    const session = await auth();
    const userId = session?.user?.id;
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

            products = rewards
                .filter((reward) => isRewardEligibleForRoll(reward))
                .map((reward) => {
                    if (reward.rewardType === "PRODUCT" && reward.product) {
                        return {
                            id: reward.product.id,
                            name: reward.product.name,
                            price: Number(reward.product.price),
                            imageUrl: reward.product.imageUrl,
                            tier: (reward.tier as GachaTier) ?? "common",
                        };
                    }

                    return {
                        id: `reward:${reward.id}`,
                        name: reward.rewardName ?? getGachaRewardTypeLabel(reward.rewardType, currencySettings),
                        price: Number(reward.rewardAmount ?? 0),
                        imageUrl: reward.rewardImageUrl ?? null,
                        tier: (reward.tier as GachaTier) ?? "common",
                    };
                });
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
                <h1 className="relative z-10 mb-1.5 text-2xl font-bold tracking-wide text-white sm:text-[2rem]">{machine.name}</h1>
                <div className="relative z-10 md:hidden">
                    <Link
                        href="/gachapons"
                        className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-blue-100 transition-colors hover:bg-white/15 hover:text-white"
                    >
                        หมวดหมู่กาชา
                    </Link>
                </div>
                <p className="relative z-10 hidden flex-wrap items-center justify-center gap-1 text-xs font-medium text-blue-200 md:flex md:text-sm">
                    <Link href="/" className="transition-colors hover:text-white">หน้าหลัก</Link>
                    <span className="opacity-60">&gt;</span>
                    <Link href="/gachapons" className="transition-colors hover:text-white">หมวดหมู่กาชา</Link>
                    <span className="opacity-60">&gt;</span>
                    <span className="font-semibold text-white">{machine.name}</span>
                </p>
            </div>

            <div className="mx-auto max-w-4xl px-4 pb-8 pt-3 sm:py-8">
                <div className="overflow-x-hidden bg-card/90 px-4 pb-6 pt-2 backdrop-blur-sm sm:rounded-[1.75rem] sm:border sm:border-border/80 sm:bg-card/95 sm:shadow-[0_28px_70px_-40px_rgba(15,23,42,0.45)] sm:backdrop-blur-sm sm:px-6 sm:py-6 md:px-10">
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
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
