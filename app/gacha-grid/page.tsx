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
        <div className="relative left-1/2 min-h-screen w-screen -translate-x-1/2 bg-background sm:left-auto sm:w-auto sm:translate-x-0">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#047857] via-[#0f9b76] to-[#0b4e3d] px-5 py-6 text-center sm:px-6 sm:py-8">
                <div
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpolygon points='30,0 60,17 60,35 30,52 0,35 0,17' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
                        backgroundSize: "60px 52px",
                    }}
                />
                <h1 className="relative z-10 mb-1.5 text-2xl font-bold text-white sm:text-[2rem]">สุ่มกงล้อ</h1>
                <div className="relative z-10 md:hidden">
                    <Link
                        href="/gachapons"
                        className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-emerald-100 transition-colors hover:bg-white/15 hover:text-white"
                    >
                        หมวดหมู่กาชา
                    </Link>
                </div>
                <p className="relative z-10 hidden flex-wrap items-center justify-center gap-1 text-xs text-emerald-200 md:flex md:text-sm">
                    <Link href="/" className="transition-colors hover:text-white">หน้าหลัก</Link>
                    <ChevronRight className="h-3 w-3 opacity-60" />
                    <Link href="/gachapons" className="transition-colors hover:text-white">หมวดหมู่กาชา</Link>
                    <ChevronRight className="h-3 w-3 opacity-60" />
                    <span className="font-semibold text-white">สุ่มกงล้อ</span>
                </p>
            </div>

            <div className="mx-auto w-full max-w-none px-2 pb-6 pt-2 sm:max-w-lg sm:px-4 sm:py-8">
                <div className="bg-card p-2 sm:rounded-[1.75rem] sm:border sm:border-border/70 sm:shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)] sm:p-4">
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
