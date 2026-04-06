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
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { buildPageMetadata } from "@/lib/seo";

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

    const session = await auth();
    const userId = session?.user?.id;
    const machine = await getMachine(id);

    if (!machine) return notFound();
    if (!machine.isActive || !machine.isEnabled) {
        return (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
                <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">ตู้กาชานี้ปิดอยู่ชั่วคราว</p>
                <p className="text-xs text-muted-foreground">กรุณากลับมาใหม่ภายหลัง</p>
            </div>
        );
    }

    const costAmount = Number(machine.costAmount);

    let userBalance = 0;
    try {
        if (userId) {
            const user = await db.query.users.findFirst({
                where: eq(users.id, userId),
                columns: { creditBalance: true, pointBalance: true },
            });
            if (user) {
                userBalance = Number(machine.costType === "CREDIT" ? (user.creditBalance ?? 0) : (user.pointBalance ?? 0));
            }
        }
    } catch { }

    let products: GachaProductLite[] = [];
    if (machine.gameType === "SPIN_X") {
        try {
            const rewards = await db.query.gachaRewards.findMany({
                where: and(eq(gachaRewards.gachaMachineId, id), eq(gachaRewards.isActive, true)),
                with: { product: { columns: { id: true, name: true, price: true, imageUrl: true, isSold: true } } },
            });
            products = rewards
                .filter((reward) => (reward.rewardType === "PRODUCT" ? reward.product && !reward.product.isSold : (reward.rewardName && reward.rewardAmount)))
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
                        name: reward.rewardName ?? (reward.rewardType === "CREDIT" ? "เครดิต" : "พอยต์"),
                        price: Number(reward.rewardAmount ?? 0),
                        imageUrl: reward.rewardImageUrl ?? null,
                        tier: (reward.tier as GachaTier) ?? "common",
                    };
                });
        } catch { }
    }

    const settings = {
        isEnabled: true,
        costType: machine.costType,
        costAmount,
        dailySpinLimit: machine.dailySpinLimit,
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1a56db] via-[#1f4fc2] to-[#10284d] py-10 px-6 text-center">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpolygon points='30,0 60,17 60,35 30,52 0,35 0,17' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
                    backgroundSize: "60px 52px"
                }} />
                <h1 className="text-3xl font-bold text-white mb-2 relative z-10 tracking-wide">{machine.name}</h1>
                <p className="text-blue-200 text-sm relative z-10 font-medium flex items-center justify-center gap-1.5">
                    <Link href="/" className="hover:text-white transition-colors">หน้าหลัก</Link>
                    <span className="opacity-60">&gt;</span>
                    <Link href="/gachapons" className="hover:text-white transition-colors">หมวดหมู่กาชา</Link>
                    <span className="opacity-60">&gt;</span>
                    <span className="text-white font-semibold">{machine.name}</span>
                </p>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="overflow-x-hidden rounded-[1.75rem] border border-border/80 bg-card/95 px-4 py-6 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:px-6 md:px-10">
                    <div className="flex flex-col items-center gap-6">
                        {settings.dailySpinLimit > 0 && (
                            <div className="w-full flex justify-end">
                                <span className="text-sm font-medium text-orange-500 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1 shadow-sm">
                                    สุ่มได้ {settings.dailySpinLimit} ครั้ง/วัน
                                </span>
                            </div>
                        )}

                        <div className="w-full flex justify-center">
                            {machine.gameType === "GRID_3X3" ? (
                                <GachaGridMachine
                                    machineId={machine.id}
                                    machineName={machine.name}
                                    costType={machine.costType}
                                    costAmount={costAmount}
                                    userBalance={userBalance}
                                    maintenance={maintenance}
                                />
                            ) : (
                                <GachaRhombus
                                    products={products}
                                    settings={settings}
                                    userBalance={userBalance}
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
