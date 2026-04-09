import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Gift, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import {
    calculateSeasonPassDailyResetWindow,
    calculateSeasonPassWindow,
    getSeasonPassDashboardState,
} from "@/lib/seasonPass";
import { buildPageMetadata } from "@/lib/seo";
import { SeasonPassLinkButton } from "@/components/season-pass/SeasonPassPurchaseButton";
import { SeasonPassDashboardContent } from "@/components/season-pass/SeasonPassDashboardContent";
import { buildThaiDateAtCurrentTime, parseMockDateKey } from "@/lib/utils/date";

export const metadata = buildPageMetadata({
    title: "Season Pass",
    path: "/dashboard/season-pass",
    noIndex: true,
});

function LockedSeasonPassPage(props: Readonly<{ latestEndAtText: string | null }>) {
    return (
        <div className="space-y-6">
            <PageBreadcrumb
                items={[
                    { label: "แดชบอร์ด", href: "/dashboard" },
                    { label: "Season Pass" },
                ]}
            />

            <section className="relative overflow-hidden rounded-[30px] border border-border/70 bg-card px-5 py-8 shadow-[0_28px_70px_-44px_rgba(37,99,235,0.28)] sm:px-7 sm:py-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(26,86,219,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))]" />
                <div className="relative grid gap-8 xl:grid-cols-[1.08fr_0.92fr] xl:items-center">
                    <div className="space-y-6 xl:max-w-[540px] xl:pl-2">
                        <Badge className="rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-medium text-blue-700 shadow-sm">
                            ปลดล็อกด้วย Season Pass
                        </Badge>
                        <div className="space-y-4">
                            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                                ปลดล็อก Season Pass เพื่อเข้าถึงรางวัลของคุณ
                            </h1>
                            <p className="max-w-[34rem] text-sm leading-7 text-slate-600 sm:text-base">
                                เมื่อซื้อ Season Pass คุณจะสามารถเข้าถึงกระดานรางวัล 30 วัน
                                พร้อมทั้งกดรับรางวัลรายวัน ตรวจสอบสถานะการรับรางวัลย้อนหลัง
                                และดูประวัติการเคลมได้ทันทีที่นี่
                            </p>
                        </div>

                        <div>
                            <SeasonPassLinkButton href="/season-pass">ซื้อ Season Pass</SeasonPassLinkButton>
                        </div>

                        {props.latestEndAtText ? (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm leading-6 text-amber-900">
                                สิทธิ์ Season Pass ล่าสุดของคุณหมดอายุเมื่อ {props.latestEndAtText}
                            </div>
                        ) : null}
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-5">
                        <div className="rounded-[24px] border border-[#eadfce] bg-[linear-gradient(180deg,#fffdfa_0%,#f9f6ef_100%)] p-4 sm:p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <p className="text-sm font-semibold tracking-[0.18em] text-slate-700">LOCKED REWARD BOARD</p>
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                                    <Lock className="h-4 w-4" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                                {[1, 2, 3, 4, 5, 6].map((day) => (
                                    <div key={day} className="rounded-[20px] border border-border/70 bg-white/80 p-3 opacity-80">
                                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                                            Day {String(day).padStart(2, "0")}
                                        </span>
                                        <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                                            <Gift className="h-4 w-4" />
                                        </div>
                                        <p className="mt-3 text-sm font-medium text-slate-900">Reward Slot</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm leading-7 text-amber-900">
                                ซื้อ Season Pass เพื่อปลดล็อกและเริ่มรับรางวัล Day 1 ได้ทันที
                            </div>
                        </div>
                    </div>
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
    const mockDate = role === "ADMIN" ? parseMockDateKey(searchParams?.mockDate) : null;
    const now = mockDate ? buildThaiDateAtCurrentTime(mockDate) : undefined;
    const state = await getSeasonPassDashboardState(userId, now);

    if (!state.unlocked) {
        return <LockedSeasonPassPage latestEndAtText={state.latestEndAtText} />;
    }

    const { plan, subscription, boardState, history, endAtText } = state;
    const currentWindow = calculateSeasonPassWindow({ endAt: subscription.endAt, now });
    const nextResetWindow = calculateSeasonPassDailyResetWindow({ now });

    return (
        <div className="space-y-6">
            <PageBreadcrumb
                items={[
                    { label: "แดชบอร์ด", href: "/dashboard" },
                    { label: "Season Pass 30 วัน" },
                ]}
            />
            <SeasonPassDashboardContent
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
