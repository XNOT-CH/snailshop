import type { Metadata } from "next";
import { db, users, gachaRewards } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { Lock, Home } from "lucide-react";
import Link from "next/link";
import { GachaRhombus } from "@/components/GachaRhombus";
import { type GachaProductLite, type GachaTier } from "@/lib/gachaGrid";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { buildPageMetadata } from "@/lib/seo";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
    title: "กาชา",
    description: "หน้าสุ่มกาชาสำหรับรับสินค้าและรางวัลพิเศษ",
    path: "/gacha",
    noIndex: true,
});

export default async function GachaPlayPage() {
    const maintenance = getMaintenanceState("gacha");
    let settings = { isEnabled: true, costType: "FREE", costAmount: 0, dailySpinLimit: 0 };

    const session = await auth();
    const userId = session?.user?.id;
    let userBalance = 0;

    try {
        const [raw, user] = await Promise.all([
            db.query.gachaSettings.findFirst(),
            userId
                ? db.query.users.findFirst({ where: eq(users.id, userId), columns: { creditBalance: true, pointBalance: true } })
                : Promise.resolve(null),
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
            where: and(eq(gachaRewards.isActive, true), isNull(gachaRewards.gachaMachineId)),
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
        <div className="mb-8 min-h-[calc(100vh-8rem)] rounded-2xl border border-border/50 bg-card/90 px-3 py-6 shadow-xl shadow-primary/10 backdrop-blur-sm sm:px-5 md:px-8">
            <div className="flex flex-col items-center gap-6">
                <div className="w-full max-w-[640px] mb-2 px-2">
                    <div className="mb-4">
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink asChild>
                                        <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
                                            <Home className="w-4 h-4" /> หน้าหลัก
                                        </Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage className="font-semibold text-foreground text-sm">กาชา</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">กาชา</h1>
                        {settings.dailySpinLimit > 0 && (
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-sm font-medium text-orange-500 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1 shadow-sm">
                                    สุ่มได้ {settings.dailySpinLimit} ครั้ง/วัน
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {settings.isEnabled ? (
                    <div className="flex w-full justify-center">
                        <GachaRhombus products={products} settings={settings} userBalance={userBalance} maintenance={maintenance} />
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 py-20 text-center">
                        <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">ระบบกาชาปิดอยู่ชั่วคราว</p>
                        <p className="text-xs text-muted-foreground">กรุณากลับมาใหม่ภายหลัง</p>
                    </div>
                )}
            </div>
        </div>
    );
}
