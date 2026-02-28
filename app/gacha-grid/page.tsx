import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { GachaGridMachine } from "@/components/GachaGridMachine";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "สุ่มกงล้อ | Manashop",
    description: "ลุ้นรับรางวัลจากระบบสุ่มกงล้อ 3×3",
};

export default async function GachaGridIndexPage() {
    // Use global GachaSettings for cost
    let costType = "FREE";
    let costAmount = 0;
    let userBalance = 0;

    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("userId")?.value;

        // Parallel fetch: settings + user (no dependency between them)
        const [settings, user] = await Promise.all([
            db.gachaSettings.findFirst(),
            userId ? db.user.findUnique({ where: { id: userId } }) : Promise.resolve(null),
        ]);

        if (settings) {
            costType = settings.costType ?? "FREE";
            costAmount = Number(settings.costAmount ?? 0);
        }

        if (user && costType !== "FREE") {
            const u = user;
            userBalance = Number(costType === "CREDIT" ? (u.creditBalance ?? 0) : (u.pointBalance ?? 0));
        }
    } catch { /* ignore */ }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
            {/* Banner */}
            <div className="bg-gradient-to-br from-[#047857] via-[#059669] to-[#065f46] relative overflow-hidden py-10 px-6 text-center">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpolygon points='30,0 60,17 60,35 30,52 0,35 0,17' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
                    backgroundSize: "60px 52px",
                }} />
                <h1 className="text-3xl font-bold text-white mb-2 relative z-10">🎡 สุ่มกงล้อ</h1>
                <p className="text-emerald-200 text-sm relative z-10 flex items-center justify-center gap-1.5">
                    <Link href="/" className="hover:text-white transition-colors">หน้าหลัก</Link>
                    <ChevronRight className="w-3 h-3 opacity-60" />
                    <Link href="/gachapons" className="hover:text-white transition-colors">หมวดหมู่กาชา</Link>
                    <ChevronRight className="w-3 h-3 opacity-60" />
                    <span className="text-white font-semibold">สุ่มกงล้อ</span>
                </p>
            </div>

            {/* Content */}
            <div className="max-w-lg mx-auto px-4 py-8">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-sm p-4">
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
