import type { Metadata } from "next";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { GachaGridMachine } from "@/components/GachaGridMachine";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { buildPageMetadata } from "@/lib/seo";
import { auth } from "@/auth";
import { EMPTY_USER_BALANCES } from "@/lib/userBalances";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
    title: "สุ่มกงล้อ",
    description: "ลุ้นรับรางวัลจากระบบสุ่มกงล้อและกาชาแบบ Grid",
    path: "/gacha-grid",
});

export default async function GachaGridIndexPage() {
    const maintenance = getMaintenanceState("gacha");
    let costType = "FREE";
    let costAmount = 0;
    let initialBalances = EMPTY_USER_BALANCES;

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
            initialBalances = {
                creditBalance: Number(user.creditBalance ?? 0),
                pointBalance: Number(user.pointBalance ?? 0),
                ticketBalance: Number(user.ticketBalance ?? 0),
            };
        }
    } catch {
        // Ignore fetch failures and fall back to defaults.
    }

    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_28%,#ffffff_100%)]">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#047857] via-[#0f9b76] to-[#0b4e3d] px-6 py-10 text-center">
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpolygon points='30,0 60,17 60,35 30,52 0,35 0,17' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
                        backgroundSize: "60px 52px",
                    }}
                />
                <h1 className="relative z-10 mb-2 text-3xl font-bold text-white">สุ่มกงล้อ</h1>
                <p className="relative z-10 flex items-center justify-center gap-1.5 text-sm text-emerald-200">
                    <Link href="/" className="transition-colors hover:text-white">หน้าหลัก</Link>
                    <ChevronRight className="h-3 w-3 opacity-60" />
                    <Link href="/gachapons" className="transition-colors hover:text-white">หมวดหมู่กาชา</Link>
                    <ChevronRight className="h-3 w-3 opacity-60" />
                    <span className="font-semibold text-white">สุ่มกงล้อ</span>
                </p>
            </div>

            <div className="mx-auto w-full max-w-none px-2 py-6 sm:max-w-lg sm:px-4 sm:py-8">
                <div className="rounded-[1.75rem] border border-border/80 bg-card/95 p-2 shadow-[0_24px_60px_-38px_rgba(8,145,115,0.4)] backdrop-blur-sm sm:p-4">
                    <GachaGridMachine
                        machineName="สุ่มกงล้อ"
                        costType={costType}
                        costAmount={costAmount}
                        initialBalances={initialBalances}
                        maintenance={maintenance}
                    />
                </div>
            </div>
        </div>
    );
}
