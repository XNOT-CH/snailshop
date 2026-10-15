import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gift, Lock } from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import {
    calculateSeasonPassDailyResetWindow,
    calculateSeasonPassWindow,
    getSeasonPassDashboardState,
} from "@/lib/seasonPass";
import { buildPageMetadata } from "@/lib/seo";
import { SeasonPassDashboardContent } from "@/components/season-pass/SeasonPassDashboardContent";
import { buildThaiDateAtCurrentTime, parseMockDateKey } from "@/lib/utils/date";

export const metadata = buildPageMetadata({
    title: "Season Pass",
    path: "/dashboard/season-pass",
    noIndex: true,
});

// The site's single blue button, in place of the gold sales-page pill.
const seasonPassActionClass =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors duration-300 ease-out hover:bg-primary/90";

type RewardPreview = Awaited<ReturnType<typeof getSeasonPassDashboardState>> extends infer State
    ? State extends { rewardPreview: infer Preview } ? Preview : never
    : never;

function LockedSeasonPassPage(props: Readonly<{
    latestEndAtText: string | null;
    canPurchase: boolean;
    price: number;
    durationDays: number;
    rewardPreview: RewardPreview;
}>) {
    return (
        <div className="season-pass-dashboard space-y-6">
            <PageBreadcrumb
                items={[
                    { label: "แดชบอร์ด", href: "/dashboard" },
                    { label: "Season Pass" },
                ]}
            />

            <div>
                <h1 className="text-3xl font-bold leading-tight text-[var(--page-heading)] sm:text-4xl">Season Pass</h1>
                <p className="mt-2 text-muted-foreground">
                    {props.price.toLocaleString()} บาท · {props.durationDays} วัน
                </p>
            </div>

            <section className="grid items-center gap-8 rounded-2xl border border-border bg-card p-5 sm:p-7 xl:grid-cols-[1fr_1fr]">
                <div className="space-y-5">
                    <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        ปลดล็อกด้วย Season Pass
                    </span>
                    <h2 className="text-2xl font-bold leading-tight text-[var(--page-heading)] sm:text-3xl">
                        ปลดล็อก Season Pass เพื่อเข้าถึงรางวัลของคุณ
                    </h2>
                    <p className="max-w-[34rem] leading-7 text-muted-foreground">
                        เมื่อซื้อ Season Pass คุณจะสามารถเข้าถึงกระดานรางวัล {props.durationDays} วัน
                        พร้อมทั้งกดรับรางวัลรายวัน ตรวจสอบสถานะการรับรางวัลย้อนหลัง
                        และดูประวัติการเคลมได้ทันทีที่นี่
                    </p>
                    {props.canPurchase ? (
                        <Link href="/season-pass" prefetch={false} className={seasonPassActionClass}>
                            ซื้อ Season Pass
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    ) : (
                        <span className="inline-flex rounded-full bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground">
                            ปิดขายชั่วคราว
                        </span>
                    )}
                    {props.latestEndAtText ? (
                        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-900 dark:text-amber-100">
                            สิทธิ์ Season Pass ล่าสุดของคุณหมดอายุเมื่อ {props.latestEndAtText}
                        </p>
                    ) : null}
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="font-semibold text-foreground">ตัวอย่างรางวัล</p>
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Lock className="h-4 w-4" />
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {props.rewardPreview.map((reward) => (
                            <div key={reward.day} className="rounded-xl border border-border bg-muted/30 p-3">
                                <p className="text-xs font-semibold text-muted-foreground">วันที่ {reward.day}</p>
                                <div className="relative mt-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-card text-primary">
                                    {reward.imageUrl ? (
                                        <Image src={reward.imageUrl} alt={reward.label} fill sizes="44px" className="object-contain p-1.5" />
                                    ) : (
                                        <Gift className="h-5 w-5" />
                                    )}
                                </div>
                                <p className="mt-3 text-sm font-semibold text-foreground">{reward.label}</p>
                                <p className="text-xs text-muted-foreground">จำนวน {reward.amount}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        ซื้อ Season Pass เพื่อปลดล็อกและเริ่มรับรางวัล Day 1 ได้ทันที
                    </p>
                </div>
            </section>
        </div>
    );
}

export default async function SeasonPassPage(props: Readonly<{ searchParams?: Promise<{ mockDate?: string }> }>) {
    const session = await auth();
    const userId = session?.user?.id;
    const role = session?.user?.role;

    if (!userId) {
        redirect("/login");
    }

    const searchParams = await props.searchParams;
    const allowMockDate = role === "ADMIN" && process.env.NODE_ENV !== "production";
    const mockDate = allowMockDate ? parseMockDateKey(searchParams?.mockDate) : null;
    const now = mockDate ? buildThaiDateAtCurrentTime(mockDate) : undefined;
    const state = await getSeasonPassDashboardState(userId, now);

    if (!state.unlocked) {
        return (
            <LockedSeasonPassPage
                latestEndAtText={state.latestEndAtText}
                canPurchase={state.plan.isActive}
                price={Number(state.plan.price)}
                durationDays={state.plan.durationDays}
                rewardPreview={state.rewardPreview}
            />
        );
    }

    const { plan, subscription, boardState, history, endAtText } = state;
    const currentWindow = calculateSeasonPassWindow({ endAt: subscription.endAt, now });
    const nextResetWindow = calculateSeasonPassDailyResetWindow({ now });

    return (
        <div className="season-pass-dashboard space-y-6">
            <PageBreadcrumb
                items={[
                    { label: "แดชบอร์ด", href: "/dashboard" },
                    { label: "Season Pass 30 วัน" },
                ]}
            />
            <SeasonPassDashboardContent
                headerAction={
                    // /season-pass redirects active holders here, so the renew
                    // entry needs ?renew=1 to reach the sales page.
                    plan.isActive ? (
                        <Link href="/season-pass?renew=1" prefetch={false} className={seasonPassActionClass}>
                            ต่ออายุ Season Pass
                        </Link>
                    ) : null
                }
                durationDays={plan.durationDays}
                price={Number(plan.price)}
                currentDay={boardState.currentDay}
                endAtText={endAtText}
                packageWindowText={currentWindow.text}
                nextResetText={nextResetWindow.text}
                initialBoard={boardState.board}
                initialHistory={history}
                mockDate={mockDate}
            />
        </div>
    );
}
