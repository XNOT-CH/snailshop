import type { Metadata } from "next";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { GachaGridMachine } from "@/components/GachaGridMachine";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
    title: "สุ่มกงล้อ",
    description: "ลุ้นรับรางวัลจากระบบสุ่มกงล้อและกาชาแบบ Grid",
    path: "/gacha-grid",
});

export default async function GachaGridIndexPage() {
    let costType = "FREE";
    let costAmount = 0;
    let userBalance = 0;

    try {
        const session = await auth();
        const userId = session?.user?.id;

        const [settings, user] = await Promise.all([
            db.query.gachaSettings.findFirst(),
            userId ? db.query.users.findFirst({ where: eq(users.id, userId) }) : Promise.resolve(null),
        ]);

        if (settings) {
            costType = settings.costType ?? "FREE";
            costAmount = Number(settings.costAmount ?? 0);
        }

        if (user && costType !== "FREE") {
            userBalance = Number(costType === "CREDIT" ? (user.creditBalance ?? 0) : (user.pointBalance ?? 0));
        }
    } catch { }

    return (
        <div className="min-h-screen bg-background">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#047857] via-[#0f9b76] to-[#0b4e3d] py-10 px-6 text-center">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpolygon points='30,0 60,17 60,35 30,52 0,35 0,17' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
                    backgroundSize: "60px 52px",
                }} />
                <h1 className="text-3xl font-bold text-white mb-2 relative z-10">สุ่มกงล้อ</h1>
                <p className="text-emerald-200 text-sm relative z-10 flex items-center justify-center gap-1.5">
                    <Link href="/" className="hover:text-white transition-colors">หน้าหลัก</Link>
                    <ChevronRight className="w-3 h-3 opacity-60" />
                    <Link href="/gachapons" className="hover:text-white transition-colors">หมวดหมู่กาชา</Link>
                    <ChevronRight className="w-3 h-3 opacity-60" />
                    <span className="text-white font-semibold">สุ่มกงล้อ</span>
                </p>
            </div>

            <div className="max-w-lg mx-auto px-4 py-8">
                <div className="rounded-[1.75rem] border border-border/80 bg-card/95 p-4 shadow-[0_24px_60px_-38px_rgba(8,145,115,0.4)] backdrop-blur-sm">
                    <GachaGridMachine
                        machineName="สุ่มกงล้อ"
                        costType={costType}
                        costAmount={costAmount}
                        userBalance={userBalance}
                    />
                </div>
            </div>
        </div>
    );
}
