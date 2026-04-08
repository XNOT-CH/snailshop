import type { Metadata } from "next";
import { db, users, gachaRewards } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { Lock } from "lucide-react";
import Link from "next/link";
import { GachaRhombus } from "@/components/GachaRhombus";
import { type GachaProductLite, type GachaTier } from "@/lib/gachaGrid";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { buildPageMetadata } from "@/lib/seo";
import { auth } from "@/auth";
import { EMPTY_USER_BALANCES } from "@/lib/userBalances";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
    title: "สุ่มตัว X",
    description: "ลุ้นรับสินค้าและไอเทมหายากจากระบบสุ่มตัว X",
    path: "/gacha",
});

export default async function GachaPage() {
    const maintenance = getMaintenanceState("gacha");
    let settings = { isEnabled: true, costType: "FREE", costAmount: 0, dailySpinLimit: 0 };

    const session = await auth();
    const userId = session?.user?.id;
    let initialBalances = EMPTY_USER_BALANCES;

    try {
        const [raw, user] = await Promise.all([
            db.query.gachaSettings.findFirst(),
            userId ? db.query.users.findFirst({ where: eq(users.id, userId), columns: { creditBalance: true, pointBalance: true, ticketBalance: true } }) : Promise.resolve(null),
        ]);

        if (raw) {
            settings = {
                isEnabled: raw.isEnabled ?? true,
                costType: raw.costType ?? "FREE",
                costAmount: Number(raw.costAmount ?? 0),
                dailySpinLimit: raw.dailySpinLimit ?? 0,
            };
        }

        if (user) {
            initialBalances = {
                creditBalance: Number(user.creditBalance ?? 0),
                pointBalance: Number(user.pointBalance ?? 0),
                ticketBalance: Number(user.ticketBalance ?? 0),
            };
        }
    } catch {
        // Ignore fetch failures and fall back to defaults.
    }

    let products: GachaProductLite[] = [];
    try {
        const rewards = await db.query.gachaRewards.findMany({
            where: and(eq(gachaRewards.isActive, true), isNull(gachaRewards.gachaMachineId)),
            with: { product: { columns: { id: true, name: true, price: true, imageUrl: true, isSold: true } } },
        });

        products = rewards
            .filter((reward) => (reward.rewardType === "PRODUCT" ? reward.product && !reward.product.isSold : reward.rewardName && reward.rewardAmount))
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
                    name: reward.rewardName ?? (reward.rewardType === "CREDIT" ? "เครดิต" : reward.rewardType === "POINT" ? "พอยต์" : "ตั๋วสุ่ม"),
                    price: Number(reward.rewardAmount ?? 0),
                    imageUrl: reward.rewardImageUrl ?? null,
                    tier: (reward.tier as GachaTier) ?? "common",
                };
            });
    } catch {
        // Ignore reward fetch failures and render an empty board.
    }

    return (
        <div className="mb-8 min-h-[calc(100vh-4rem)] overflow-x-hidden bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_28%,#ffffff_100%)]">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1a56db] via-[#1f4fc2] to-[#10284d] px-6 py-10 text-center">
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpolygon points='30,0 60,17 60,35 30,52 0,35 0,17' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
                        backgroundSize: "60px 52px",
                    }}
                />
                <h1 className="relative z-10 mb-2 text-3xl font-bold tracking-wide text-white">สุ่มตัว X</h1>
                <p className="relative z-10 flex items-center justify-center gap-1.5 text-sm font-medium text-blue-200">
                    <Link href="/" className="transition-colors hover:text-white">หน้าหลัก</Link>
                    <span className="opacity-60">&gt;</span>
                    <Link href="/gachapons" className="transition-colors hover:text-white">หมวดหมู่กาชา</Link>
                    <span className="opacity-60">&gt;</span>
                    <span className="font-semibold text-white">สุ่มตัว X</span>
                </p>
                {settings.dailySpinLimit > 0 && (
                    <div className="relative z-10 mt-3">
                        <span className="rounded-full border border-white/30 bg-white/20 px-3 py-1 text-sm font-medium text-white/90">
                            สุ่มได้ {settings.dailySpinLimit} ครั้ง/วัน
                        </span>
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center gap-6 px-4 pb-8 pt-6 sm:px-6 md:px-10">
                {settings.isEnabled ? (
                    <div className="flex w-full justify-center">
                        <GachaRhombus products={products} settings={settings} initialBalances={initialBalances} maintenance={maintenance} />
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 py-20 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">ระบบสุ่มตัว X ปิดอยู่ชั่วคราว</p>
                        <p className="text-xs text-muted-foreground">กรุณากลับมาใหม่ภายหลัง</p>
                    </div>
                )}
            </div>
        </div>
    );
}
