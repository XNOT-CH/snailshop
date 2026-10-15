import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, users } from "@/lib/db";
import { calculateSeasonPassWindow, getCurrentSeasonPassSubscription, getOrCreateSeasonPassPlan } from "@/lib/seasonPass";
import {
    ArrowRight,
    BadgeCheck,
    CalendarDays,
    CheckCircle2,
    Coins,
    Crown,
    Gift,
    ShieldCheck,
    Ticket,
    Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildPageMetadata } from "@/lib/seo";
import { getSeasonPassRewardCatalog } from "@/lib/seasonPass";
import { PageBand } from "@/components/PageBand";
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

export default async function SeasonPassPurchasePage(props: Readonly<{ searchParams?: Promise<{ renew?: string }> }>) {
    const session = await auth();
    const userId = session?.user?.id;
    const plan = await getOrCreateSeasonPassPlan();
    const activeSubscription = userId ? await getCurrentSeasonPassSubscription(userId) : null;

    // Pass holders land on their reward board, not the sales page. The sales
    // page stays reachable for renewal via /season-pass?renew=1 (linked from
    // the board). This also routes fresh buyers to the board right after
    // purchase, because the purchase button calls router.refresh() on success.
    const searchParams = await props.searchParams;
    if (activeSubscription && !searchParams?.renew) {
        redirect("/dashboard/season-pass");
    }
    const rewardsPreview = (await getSeasonPassRewardCatalog(plan.id)).slice(0, 6);
    const user = userId
        ? await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { creditBalance: true },
        })
        : null;

    const creditBalance = Number(user?.creditBalance ?? 0);
    const price = Number(plan.price);
    const activeWindow = activeSubscription ? calculateSeasonPassWindow({ endAt: activeSubscription.endAt }) : null;

    return (
        <div className="animate-page-enter flex min-h-[calc(100dvh-4rem)] flex-col">
            <PageBand tone="lead" className="pt-10 pb-4 lg:pt-12 lg:pb-6">
                <h1 className="text-3xl font-bold leading-tight text-[var(--page-heading)] sm:text-4xl">Season Pass</h1>
                <p className="mt-2 text-muted-foreground">
                    {price.toLocaleString()} บาท · ใช้งาน {plan.durationDays} วัน
                </p>
            </PageBand>

            <PageBand tone="plain" className="flex-1 space-y-12 pt-6 lg:pt-8">
                <section className="grid gap-8 rounded-2xl border border-border bg-card p-5 sm:p-7 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-5">
                        <h2 className="text-2xl font-bold leading-tight text-[var(--page-heading)] sm:text-3xl">
                            ซื้อ Season Pass เพื่อปลดล็อกกระดานรางวัลแบบเต็ม
                        </h2>
                        <p className="max-w-[36rem] leading-7 text-muted-foreground">
                            ปลดล็อกกระดานรางวัล (Reward Board) เพื่อรับไอเทมฟรีทุกวัน พร้อมลุ้นรับรางวัลพิเศษ
                            (Milestone Rewards) เมื่อสะสมครบกำหนด
                        </p>

                        <ul className="grid gap-3 sm:grid-cols-2">
                            {perks.map((perk) => (
                                <li key={perk} className="flex items-start gap-2.5 text-sm leading-6 text-foreground">
                                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                                    {perk}
                                </li>
                            ))}
                        </ul>

                        {!plan.isActive ? (
                            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-900 dark:text-amber-100">
                                ขณะนี้ Season Pass ถูกปิดการขายชั่วคราว แต่ผู้ที่มีแพ็กเกจอยู่แล้วยังเข้าไปรับรางวัลได้ตามปกติ
                            </p>
                        ) : null}
                    </div>

                    <div className="flex flex-col gap-5 rounded-xl bg-muted/40 p-5">
                        <p className="text-4xl font-bold text-[var(--page-heading)]">฿{price.toLocaleString()}</p>

                        <dl className="space-y-4 text-sm">
                            {[
                                { icon: CalendarDays, title: `อายุแพ็กเกจ ${plan.durationDays} วัน`, detail: "เริ่มนับทันทีหลังชำระสำเร็จ" },
                                { icon: ShieldCheck, title: "1 สิทธิ์ต่อวัน", detail: "ไม่สามารถสะสมสิทธิ์ย้อนหลังได้" },
                                {
                                    icon: Coins,
                                    title: "เครดิตคงเหลือ",
                                    detail: userId ? `฿${creditBalance.toLocaleString()}` : "เข้าสู่ระบบเพื่อดูยอดเครดิต",
                                },
                            ].map((row) => (
                                <div key={row.title} className="flex items-start gap-3">
                                    <row.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <div>
                                        <dt className="font-semibold text-foreground">{row.title}</dt>
                                        <dd className="mt-0.5 text-muted-foreground">{row.detail}</dd>
                                    </div>
                                </div>
                            ))}
                            {activeSubscription ? (
                                <div className="flex items-start gap-3">
                                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    <div>
                                        <dt className="font-semibold text-foreground">มี Season Pass ใช้งานอยู่</dt>
                                        <dd className="mt-0.5 text-muted-foreground">เหลือเวลาอีก {activeWindow?.text ?? "-"}</dd>
                                    </div>
                                </div>
                            ) : null}
                        </dl>

                        <div className="mt-auto">
                            {userId ? (
                                plan.isActive ? (
                                    <SeasonPassPurchaseButton
                                        planName={plan.name}
                                        price={price}
                                        creditBalance={creditBalance}
                                        buttonText={activeSubscription ? `ต่ออายุอีก ${plan.durationDays} วัน` : "ซื้อ Season Pass"}
                                    />
                                ) : (
                                    <Button type="button" disabled className="h-11 w-full rounded-xl">
                                        ปิดขายชั่วคราว
                                    </Button>
                                )
                            ) : (
                                <Button asChild className="h-11 w-full rounded-xl">
                                    <Link href="/register?callbackUrl=%2Fseason-pass" prefetch={false}>
                                        สมัครสมาชิกเพื่อซื้อ
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-bold leading-tight text-[var(--page-heading)] sm:text-2xl">ตัวอย่างรางวัล 6 วันแรก</h2>
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {rewardsPreview.map((reward) => {
                            const Icon = reward.type === "credits" ? Wallet : reward.type === "points" ? Coins : Ticket;

                            return (
                                <div key={reward.day} className="rounded-2xl border border-border bg-card p-4">
                                    <p className="text-xs font-semibold text-muted-foreground">วันที่ {reward.day}</p>
                                    <div className="relative mt-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
                                        {reward.imageUrl ? (
                                            <Image src={reward.imageUrl} alt={reward.label} fill sizes="48px" className="object-contain p-1.5" />
                                        ) : (
                                            <Icon className="h-5 w-5" />
                                        )}
                                    </div>
                                    <p className="mt-3 text-sm font-semibold text-foreground">{reward.label}</p>
                                    <p className="text-xs text-muted-foreground">จำนวน {reward.amount}</p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-bold leading-tight text-[var(--page-heading)] sm:text-2xl">ขั้นตอนการรับรางวัล</h2>
                    <ol className="mt-5 grid gap-6 sm:grid-cols-3">
                        {[
                            { icon: BadgeCheck, title: "1. ชำระเงินเสร็จสิ้น", detail: "ระบบจะเปิดใช้งาน Season Pass ทันที" },
                            { icon: Gift, title: "2. เข้าหน้า Season Pass", detail: "เพื่อดูของรางวัลทั้ง 30 วันของคุณ" },
                            { icon: Crown, title: "3. รับไอเทมประจำวัน", detail: "ล็อกอินเข้ามากดรับได้เลยทุกวัน (วันละ 1 ครั้ง)" },
                        ].map((step) => (
                            <li key={step.title} className="flex items-start gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <step.icon className="h-5 w-5" />
                                </span>
                                <div>
                                    <p className="font-semibold text-foreground">{step.title}</p>
                                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.detail}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>
            </PageBand>
        </div>
    );
}

