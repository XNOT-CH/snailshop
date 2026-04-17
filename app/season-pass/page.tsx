import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, users } from "@/lib/db";
import { calculateSeasonPassWindow, getCurrentSeasonPassSubscription, getOrCreateSeasonPassPlan } from "@/lib/seasonPass";
import {
    ArrowRight,
    BadgeCheck,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Coins,
    Crown,
    Gift,
    ShieldCheck,
    Ticket,
    Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildPageMetadata } from "@/lib/seo";
import { getPointCurrencyName } from "@/lib/currencySettings";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { SeasonPassPurchaseButton } from "@/components/season-pass/SeasonPassPurchaseButton";

export const metadata = buildPageMetadata({
    title: "Season Pass",
    path: "/season-pass",
});

const perks = [
    "ปลดล็อกกระดานรางวัล 30 วันทันที",
    "รับรางวัลได้ทุกวัน พร้อมโบนัสพิเศษ",
    "เช็กสถานะและความคืบหน้าได้ง่ายๆ",
    "เข้าถึงหน้า Season Pass ได้สะดวกรวดเร็ว",
];

export default async function SeasonPassPurchasePage() {
    const session = await auth();
    const userId = session?.user?.id;
    const plan = await getOrCreateSeasonPassPlan();
    const currencySettings = await getCurrencySettings().catch(() => null);
    const pointCurrencyName = getPointCurrencyName(currencySettings);
    const activeSubscription = userId ? await getCurrentSeasonPassSubscription(userId) : null;
    const user = userId
        ? await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { creditBalance: true },
        })
        : null;

    const creditBalance = Number(user?.creditBalance ?? 0);
    const price = Number(plan.price);
    const activeWindow = activeSubscription ? calculateSeasonPassWindow({ endAt: activeSubscription.endAt }) : null;
    const rewardsPreview = [
        { day: "01", title: "เครดิต", amount: "80", icon: Wallet, tone: "bg-blue-50 text-blue-700" },
        { day: "02", title: pointCurrencyName, amount: "30", icon: Coins, tone: "bg-emerald-50 text-emerald-700" },
        { day: "03", title: "ตั๋วสุ่ม", amount: "2", icon: Ticket, tone: "bg-sky-50 text-sky-700" },
        { day: "04", title: "เครดิต", amount: "120", icon: Wallet, tone: "bg-blue-50 text-blue-700" },
        { day: "05", title: pointCurrencyName, amount: "40", icon: Coins, tone: "bg-emerald-50 text-emerald-700" },
        { day: "06", title: "ตั๋วสุ่ม", amount: "2", icon: Ticket, tone: "bg-sky-50 text-sky-700" },
    ] as const;

    return (
        <div className="animate-page-enter">
            <div className="relative left-1/2 w-screen -translate-x-1/2 space-y-6 border-y border-border/50 bg-card/90 px-3 py-5 shadow-xl shadow-primary/10 backdrop-blur-sm sm:left-auto sm:w-auto sm:translate-x-0 sm:border sm:bg-card/90 sm:px-5 sm:py-6 sm:backdrop-blur-sm lg:px-6">
                <section className="relative overflow-hidden rounded-[30px] border border-border/70 bg-card px-5 py-8 shadow-[0_28px_70px_-44px_rgba(37,99,235,0.28)] sm:px-7 sm:py-10">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(26,86,219,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.96))]" />
                    <div className="relative grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-center">
                        <div className="space-y-5">
                            <Badge className="rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-medium text-blue-700 shadow-sm">
                                Season Pass · {price.toLocaleString()} บาท · ใช้งาน {plan.durationDays} วัน
                            </Badge>

                            <div className="space-y-3">
                                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                                    ซื้อ Season Pass เพื่อปลดล็อกกระดานรางวัลแบบเต็ม
                                </h1>
                                <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                                    ปลดล็อกกระดานรางวัล (Reward Board) เพื่อรับไอเทมฟรีทุกวัน พร้อมลุ้นรับรางวัลพิเศษ
                                    (Milestone Rewards) เมื่อสะสมครบกำหนด
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {userId ? (
                                    <SeasonPassPurchaseButton
                                        planName={plan.name}
                                        price={price}
                                        creditBalance={creditBalance}
                                        buttonText={activeSubscription ? "ต่ออายุอีก 30 วัน" : "ซื้อ Season Pass"}
                                    />
                                ) : (
                                    <Button asChild className="rounded-full px-5">
                                        <Link href="/register?callbackUrl=%2Fseason-pass">
                                            สมัครสมาชิกเพื่อซื้อ
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                )}
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {perks.map((perk) => (
                                    <div key={perk} className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/88 p-4 shadow-sm">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                                        <p className="text-sm leading-6 text-slate-600">{perk}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[28px] border border-slate-200 bg-white/92 p-5 shadow-sm backdrop-blur">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Plan Summary</p>
                                    <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">฿{price.toLocaleString()}</p>
                                </div>
                                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-blue-50 text-blue-700">
                                    <Gift className="h-8 w-8" />
                                </div>
                            </div>

                            <div className="mt-5 space-y-3">
                                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                                    <div className="flex items-center gap-3">
                                        <CalendarDays className="h-4 w-4 text-slate-500" />
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">อายุแพ็กเกจ {plan.durationDays} วัน</p>
                                            <p className="mt-1 text-sm text-slate-500">เริ่มนับทันทีหลังชำระสำเร็จ</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck className="h-4 w-4 text-slate-500" />
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">1 สิทธิ์ต่อวัน</p>
                                            <p className="mt-1 text-sm text-slate-500">ไม่สามารถสะสมสิทธิ์ย้อนหลังได้</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                                    <div className="flex items-center gap-3">
                                        <Coins className="h-4 w-4 text-slate-500" />
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">เครดิตคงเหลือ</p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                {userId ? `฿${creditBalance.toLocaleString()}` : "เข้าสู่ระบบเพื่อดูยอดเครดิต"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                {activeSubscription ? (
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
                                        <div className="flex items-center gap-3">
                                            <BadgeCheck className="h-4 w-4 text-emerald-700" />
                                            <div>
                                                <p className="text-sm font-medium text-emerald-900">มี Season Pass ใช้งานอยู่</p>
                                                <p className="mt-1 text-sm text-emerald-900/85">
                                                    เหลือเวลาอีก {activeWindow?.text ?? "-"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <section className="rounded-[30px] border border-border/70 bg-card p-5 shadow-sm sm:p-6">
                        <div className="flex items-center gap-2 text-slate-900">
                            <Gift className="h-5 w-5 text-blue-600" />
                            <h2 className="text-2xl font-semibold tracking-tight">ตัวอย่างรางวัล 6 วันแรก</h2>
                        </div>

                        <div className="mt-5 rounded-[28px] border border-[#eadfce] bg-[linear-gradient(180deg,#fffdfa_0%,#f9f6ef_100%)] p-4">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                                {rewardsPreview.map((reward) => {
                                    const Icon = reward.icon;

                                    return (
                                        <div key={reward.day} className="rounded-[22px] border border-border/70 bg-white/85 p-3 shadow-sm">
                                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                                                Day {reward.day}
                                            </span>
                                            <div className={`mt-3 flex h-11 w-11 items-center justify-center rounded-2xl ${reward.tone}`}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <p className="mt-3 text-sm font-semibold text-slate-900">{reward.title}</p>
                                            <p className="mt-1 text-xs text-slate-500">จำนวน {reward.amount}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    <section className="rounded-[30px] border border-border/70 bg-card p-5 shadow-sm sm:p-6">
                        <div className="flex items-center gap-2 text-slate-900">
                            <Clock3 className="h-5 w-5 text-blue-600" />
                            <h2 className="text-2xl font-semibold tracking-tight">ขั้นตอนการรับรางวัล</h2>
                        </div>

                        <div className="mt-5 space-y-3">
                            {[
                                {
                                    icon: BadgeCheck,
                                    title: "1. ชำระเงินเสร็จสิ้น",
                                    detail: "ระบบจะเปิดใช้งาน Season Pass ทันที",
                                },
                                {
                                    icon: Gift,
                                    title: "2. เข้าหน้า Season Pass",
                                    detail: "เพื่อดูของรางวัลทั้ง 30 วันของคุณ",
                                },
                                {
                                    icon: Crown,
                                    title: "3. รับไอเทมประจำวัน",
                                    detail: "ล็อกอินเข้ามากดรับได้เลยทุกวัน (วันละ 1 ครั้ง)",
                                },
                            ].map((step) => {
                                const Icon = step.icon;

                                return (
                                    <div key={step.title} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/80 p-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">{step.title}</p>
                                            <p className="mt-1 text-sm leading-6 text-slate-500">{step.detail}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

