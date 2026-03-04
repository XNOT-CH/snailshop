import { db, users, gachaSettings, gachaRewards } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { Lock, Home } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { GachaRhombus } from "@/components/GachaRhombus";
import { type GachaProductLite, type GachaTier } from "@/lib/gachaGrid";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "กาชา | Manashop",
    description: "ลุ้นรับไอเท็มสุดพิเศษจากระบบสุ่มกาชา",
};

export default async function GachaPage() {
    let settings = { isEnabled: true, costType: "FREE", costAmount: 0, dailySpinLimit: 0 };

    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;
    let userBalance = 0;

    try {
        // Parallel fetch: settings + user (no dependency between them)
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
    } catch { /* table may not exist yet */ }

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
            .filter((r) => (r.rewardType === "PRODUCT" ? r.product && !r.product.isSold : (r.rewardName && r.rewardAmount)))
            .map((r) => {
                if (r.rewardType === "PRODUCT" && r.product) {
                    return { id: r.product.id, name: r.product.name, price: Number(r.product.price), imageUrl: r.product.imageUrl, tier: (r.tier as GachaTier) ?? "common" };
                }
                return { id: `reward:${r.id}`, name: r.rewardName ?? (r.rewardType === "CREDIT" ? "เครดิต" : "พอยต์"), price: Number(r.rewardAmount ?? 0), imageUrl: r.rewardImageUrl ?? null, tier: (r.tier as GachaTier) ?? "common" };
            });
    } catch { /* rewards not available */ }


    return (
        <div className="py-6 bg-card/90 backdrop-blur-sm rounded-2xl px-4 sm:px-6 md:px-10 shadow-xl shadow-primary/10 border border-border/50 min-h-[calc(100vh-8rem)] mb-8 overflow-x-hidden">
            <div className="flex flex-col items-center gap-6">

                {/* Header — centered to align with grid */}
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

                    <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/40">
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

                {/* Body */}
                {!settings.isEnabled ? (
                    <div className="flex flex-col items-center gap-3 py-20 text-center">
                        <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">ระบบกาชาปิดอยู่ชั่วคราว</p>
                        <p className="text-xs text-muted-foreground">กรุณากลับมาใหม่ภายหลัง</p>
                    </div>
                ) : (
                    <div className="w-full flex justify-center">
                        <GachaRhombus products={products} settings={settings} userBalance={userBalance} isLoggedIn={!!userId} />
                    </div>
                )}
            </div>
        </div>
    );
}
