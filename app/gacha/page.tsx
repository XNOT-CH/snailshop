import type { Metadata } from "next";
import { db, users, gachaRewards } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { Lock } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { GachaRhombus } from "@/components/GachaRhombus";
import { type GachaProductLite, type GachaTier } from "@/lib/gachaGrid";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
    title: "สุ่มตัว X",
    description: "ลุ้นรับสินค้าและไอเทมพิเศษจากระบบสุ่มตัว X",
    path: "/gacha",
});

export default async function GachaPage() {
    let settings = { isEnabled: true, costType: "FREE", costAmount: 0, dailySpinLimit: 0 };

    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;
    let userBalance = 0;

    try {
        const [raw, user] = await Promise.all([
            db.query.gachaSettings.findFirst(),
            userId ? db.query.users.findFirst({ where: eq(users.id, userId), columns: { creditBalance: true, pointBalance: true } }) : Promise.resolve(null),
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
            userBalance = Number(settings.costType === "CREDIT" ? (user.creditBalance ?? 0) : (user.pointBalance ?? 0));
        }
    } catch { }

    let products: GachaProductLite[] = [];
    try {
        const rewards = await db.query.gachaRewards.findMany({
            where: and(
                eq(gachaRewards.isActive, true),
                isNull(gachaRewards.gachaMachineId),
            ),
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

    return (
        <div className="min-h-[calc(100vh-4rem)] overflow-x-hidden bg-background mb-8">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1a56db] via-[#1f4fc2] to-[#10284d] py-10 px-6 text-center">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpolygon points='30,0 60,17 60,35 30,52 0,35 0,17' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
                    backgroundSize: "60px 52px"
                }} />
                <h1 className="text-3xl font-bold text-white mb-2 relative z-10 tracking-wide">สุ่มตัว X</h1>
                <p className="text-blue-200 text-sm relative z-10 font-medium flex items-center justify-center gap-1.5">
                    <Link href="/" className="hover:text-white transition-colors">หน้าหลัก</Link>
                    <span className="opacity-60">&gt;</span>
                    <Link href="/gachapons" className="hover:text-white transition-colors">หมวดหมู่กาชา</Link>
                    <span className="opacity-60">&gt;</span>
                    <span className="text-white font-semibold">สุ่มตัว X</span>
                </p>
                {settings.dailySpinLimit > 0 && (
                    <div className="relative z-10 mt-3">
                        <span className="text-sm font-medium text-white/90 bg-white/20 border border-white/30 rounded-full px-3 py-1">
                            สุ่มได้ {settings.dailySpinLimit} ครั้ง/วัน
                        </span>
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center gap-6 px-4 pt-6 pb-8 sm:px-6 md:px-10">
                {settings.isEnabled ? (
                    <div className="w-full flex justify-center">
                        <GachaRhombus products={products} settings={settings} userBalance={userBalance} />
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 py-20 text-center">
                        <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center">
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
