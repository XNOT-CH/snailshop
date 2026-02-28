import { db } from "@/lib/db";
import { Lock } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GachaRhombus } from "@/components/GachaRhombus";
import { GachaGridMachine } from "@/components/GachaGridMachine";
import { type GachaProductLite, type GachaTier } from "@/lib/gachaGrid";

export const dynamic = "force-dynamic";

export default async function GachaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    // Fetch the specific gacha machine
    let machine: {
        id: string;
        name: string;
        gameType: string;
        isActive: boolean;
        costType: string;
        costAmount: number | { toNumber: () => number };
        dailySpinLimit: number;
    } | null = null;

    try {
        machine = await db.gachaMachine.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                gameType: true,
                isActive: true,
                costType: true,
                costAmount: true,
                dailySpinLimit: true,
            },
        });
    } catch { /* ignore */ }

    if (!machine) return notFound();
    if (!machine.isActive) {
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

    const costAmount = typeof machine.costAmount === "object"
        ? machine.costAmount.toNumber()
        : Number(machine.costAmount);

    // Fetch user balance
    let userBalance = 0;
    try {
        if (userId) {
            const user = await db.user.findUnique({
                where: { id: userId },
                select: { creditBalance: true, pointBalance: true },
            });
            if (user) {
                userBalance = Number(machine.costType === "CREDIT" ? (user.creditBalance ?? 0) : (user.pointBalance ?? 0));
            }
        }
    } catch { /* ignore */ }

    // For SPIN_X — load products from this specific machine's rewards
    let products: GachaProductLite[] = [];
    if (machine.gameType === "SPIN_X") {
        try {
            const rewards = await db.gachaReward.findMany({
                where: {
                    gachaMachineId: id,
                    isActive: true,
                    OR: [
                        { rewardType: "PRODUCT", productId: { not: null } },
                        {
                            rewardType: { in: ["CREDIT", "POINT"] },
                            rewardName: { not: null },
                            rewardAmount: { not: null },
                        },
                    ],
                },
                include: {
                    product: { select: { id: true, name: true, price: true, imageUrl: true, isSold: true } },
                },
            });
            products = rewards
                .filter((r) => (r.rewardType === "PRODUCT" ? r.product && !r.product.isSold : (r.rewardName && r.rewardAmount)))
                .map((r) => {
                    if (r.rewardType === "PRODUCT" && r.product) {
                        return { id: r.product.id, name: r.product.name, price: Number(r.product.price), imageUrl: r.product.imageUrl, tier: (r.tier as GachaTier) ?? "common" };
                    }
                    return { id: `reward:${r.id}`, name: r.rewardName ?? (r.rewardType === "CREDIT" ? "เครดิต" : "พอยต์"), price: Number(r.rewardAmount ?? 0), imageUrl: r.rewardImageUrl ?? null, tier: (r.tier as GachaTier) ?? "common" };
                });
        } catch { /* rewards not available */ }
    }

    const settings = {
        isEnabled: true,
        costType: machine.costType,
        costAmount,
        dailySpinLimit: machine.dailySpinLimit,
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
            {/* Hero Banner */}
            <div className="bg-gradient-to-br from-[#1a56db] via-[#1e40af] to-[#1e3a5f] relative overflow-hidden py-10 px-6 text-center">
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

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="py-6 bg-card/90 backdrop-blur-sm rounded-2xl px-4 sm:px-6 md:px-10 shadow-xl shadow-primary/10 border border-border/50 overflow-x-hidden">
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
                                />
                            ) : (
                                <GachaRhombus
                                    products={products}
                                    settings={settings}
                                    userBalance={userBalance}
                                    machineId={machine.id}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
