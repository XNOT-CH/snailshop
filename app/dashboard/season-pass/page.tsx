import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
    BadgeCheck,
    CircleAlert,
    Clock3,
    Coins,
    Gift,
    Ticket,
    Wallet,
    Lock,
    Sparkles,
    XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import {
    calculateSeasonPassWindow,
    getSeasonPassDashboardState,
    type SeasonPassBoardReward,
    type SeasonPassRewardType,
} from "@/lib/seasonPass";
import { buildPageMetadata } from "@/lib/seo";
import {
    SeasonPassClaimButton,
} from "@/components/season-pass/SeasonPassClaimButton";
import {
    SeasonPassLinkButton,
} from "@/components/season-pass/SeasonPassPurchaseButton";

export const metadata = buildPageMetadata({
    title: "Season Pass",
    path: "/dashboard/season-pass",
    noIndex: true,
});

const rewardConfig: Record<
    SeasonPassRewardType,
    { icon: React.ElementType; iconWrap: string; tileAccent: string }
> = {
    credits: {
        icon: Wallet,
        iconWrap: "bg-blue-50 text-blue-700",
        tileAccent: "from-blue-50 to-white",
    },
    points: {
        icon: Coins,
        iconWrap: "bg-emerald-50 text-emerald-700",
        tileAccent: "from-emerald-50 to-white",
    },
    tickets: {
        icon: Ticket,
        iconWrap: "bg-sky-50 text-sky-700",
        tileAccent: "from-sky-50 to-white",
    },
};

const statusConfig = {
    claimed: {
        label: "รับแล้ว",
        card: "border-emerald-200 bg-emerald-50/80",
        badge: "bg-emerald-600 text-white",
        icon: BadgeCheck,
        iconClass: "text-emerald-600",
    },
    missed: {
        label: "พลาดสิทธิ์",
        card: "border-rose-200 bg-rose-50/80",
        badge: "bg-rose-600 text-white",
        icon: XCircle,
        iconClass: "text-rose-500",
    },
    today: {
        label: "รับวันนี้",
        card: "border-blue-300 bg-blue-50/90 shadow-[0_16px_30px_-22px_rgba(37,99,235,0.55)]",
        badge: "bg-blue-600 text-white",
        icon: Gift,
        iconClass: "text-blue-600",
    },
    locked: {
        label: "รอวันถัดไป",
        card: "border-border/70 bg-white/70",
        badge: "bg-slate-200 text-slate-600",
        icon: Lock,
        iconClass: "text-slate-400",
    },
} as const;

const rewardLegend = [
    { key: "credits", title: "เครดิต", detail: "เพิ่มเครดิตเข้าระบบทันทีเมื่อกดรับ" },
    { key: "points", title: "พอยต์", detail: "เพิ่ม point balance ของผู้ใช้ทันที" },
    { key: "tickets", title: "ตั๋วสุ่ม", detail: "ใช้เป็นรางวัลตั๋วสุ่มตามจำนวนที่กำหนด" },
] as const;

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

                            <div className="grid grid-cols-3 gap-3 sm:gap-4">
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

function RewardTile({ reward }: Readonly<{ reward: SeasonPassBoardReward }>) {
    const rewardInfo = rewardConfig[reward.type];
    const stateInfo = statusConfig[reward.status];
    const Icon = rewardInfo.icon;
    const StateIcon = stateInfo.icon;
    const rewardImage = reward.imageUrl;
    const isClaimed = reward.status === "claimed";
    const tileAccentClass = isClaimed ? "from-slate-100 to-white" : rewardInfo.tileAccent;
    const iconWrapClass = isClaimed ? "bg-slate-100 text-slate-500" : rewardInfo.iconWrap;

    return (
        <div
            className={`relative min-h-36 rounded-[22px] border p-3 transition-transform duration-200 hover:-translate-y-0.5 ${stateInfo.card} ${
                reward.highlight ? "ring-1 ring-amber-200/80" : ""
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <span className="rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">
                    Day {String(reward.day).padStart(2, "0")}
                </span>
                {reward.highlight ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800">
                        Special
                    </span>
                ) : null}
            </div>

            <div className={`mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b ${tileAccentClass} shadow-sm`}>
                <div className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl ${iconWrapClass}`}>
                    {rewardImage ? (
                        <Image src={rewardImage} alt={reward.label} fill sizes="40px" className={`object-contain p-1.5 ${isClaimed ? "grayscale" : ""}`} />
                    ) : (
                        <Icon className="h-5 w-5" />
                    )}
                    {isClaimed ? (
                        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/95 shadow-sm">
                            <BadgeCheck className="h-3 w-3 text-emerald-600" />
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="mt-4">
                <p className="text-sm font-semibold text-slate-900">{reward.label}</p>
                <p className="mt-1 text-xs text-slate-500">จำนวน {reward.amount}</p>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] ${stateInfo.badge}`}>
                    {stateInfo.label}
                </span>
                <StateIcon className={`h-4 w-4 ${stateInfo.iconClass}`} />
            </div>
        </div>
    );
}

export default async function SeasonPassPage() {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        redirect("/login");
    }

    const state = await getSeasonPassDashboardState(userId);

    if (!state.unlocked) {
        return <LockedSeasonPassPage latestEndAtText={state.latestEndAtText} />;
    }

    const { plan, subscription, boardState, history, endAtText } = state;
    const currentReward = boardState.currentReward;
    const currentWindow = calculateSeasonPassWindow({ endAt: subscription.endAt });
    const CurrentIcon = rewardConfig[currentReward.type].icon;
    const currentRewardImage = currentReward.imageUrl;
    const canClaim = currentReward.status === "today";

    const summaryCards = [
        { label: "รับแล้ว", value: `${boardState.claimedCount} วัน`, hint: "ของสะสมเข้าคลังแล้ว" },
        { label: "พลาดสิทธิ์", value: `${boardState.missedCount} วัน`, hint: "ไม่ล็อกอินภายในวัน" },
        { label: "เหลืออีก", value: `${boardState.remainingCount} วัน`, hint: "ยังเปิดได้ในรอบนี้" },
        { label: "รีเซ็ตถัดไป", value: currentWindow.text, hint: "เวลาโดยประมาณก่อนจบรอบ" },
    ];

    return (
        <div className="space-y-6">
            <PageBreadcrumb
                items={[
                    { label: "แดชบอร์ด", href: "/dashboard" },
                    { label: "Season Pass 30 วัน" },
                ]}
            />

            <section className="relative overflow-hidden rounded-[30px] border border-border/70 bg-card px-5 py-6 shadow-[0_28px_70px_-44px_rgba(37,99,235,0.28)] sm:px-7 sm:py-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(26,86,219,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))]" />
                <div className="relative space-y-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl space-y-4">
                            <Badge className="rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-medium text-blue-700 shadow-sm">
                                Season Pass • {Number(plan.price).toLocaleString()} บาท • {plan.durationDays} วัน
                            </Badge>
                            <div className="space-y-3">
                                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                                    ตารางรับของ 30 วัน ที่ปลดล็อกจริงสำหรับบัญชีนี้แล้ว
                                </h1>
                            </div>
                        </div>

                        <div className="w-full max-w-xl rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Progress</p>
                                    <p className="mt-2 text-lg font-semibold text-slate-900">
                                        Day {boardState.currentDay} of {plan.durationDays}
                                    </p>
                                </div>
                                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                                    หมดอายุ {endAtText}
                                </Badge>
                            </div>
                            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-[linear-gradient(90deg,#1a56db_0%,#60a5fa_100%)]"
                                    style={{ width: `${Math.min((boardState.currentDay / plan.durationDays) * 100, 100)}%` }}
                                />
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                                เหลือเวลาอีก {currentWindow.text} ในรอบที่กำลังใช้งาน
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {summaryCards.map((card) => (
                            <div key={card.label} className="rounded-2xl border border-white/80 bg-white/88 p-4 shadow-sm backdrop-blur">
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
                                <p className="mt-3 text-xl font-semibold text-slate-900">{card.value}</p>
                                <p className="mt-1 text-sm text-slate-500">{card.hint}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.55fr_0.8fr]">
                <section className="rounded-[30px] border border-border/70 bg-card p-4 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-slate-900">
                                <Gift className="h-5 w-5 text-blue-600" />
                                <h2 className="text-2xl font-semibold tracking-tight">ตารางรับของรายวัน 30 วัน</h2>
                            </div>
                            <p className="max-w-2xl text-sm leading-6 text-slate-500">
                                ตารางนี้อัปเดตตามสถานะจริงของผู้ใช้ทันที วันไหนรับแล้วจะขึ้นเขียว วันไหนพลาดจะขึ้นแดง
                                และวันปัจจุบันจะปลดล็อกปุ่มรับของวันนี้
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs">
                            <Badge className="rounded-full bg-blue-600 px-3 py-1 text-white">วันนี้</Badge>
                            <Badge className="rounded-full bg-emerald-600 px-3 py-1 text-white">รับแล้ว</Badge>
                            <Badge className="rounded-full bg-rose-600 px-3 py-1 text-white">พลาดสิทธิ์</Badge>
                            <Badge variant="secondary" className="rounded-full px-3 py-1">Milestone</Badge>
                        </div>
                    </div>

                    <div className="mt-5 rounded-[28px] border border-[#eadfce] bg-[linear-gradient(180deg,#fffdfa_0%,#f9f6ef_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:p-5">
                        <div className="mx-auto mb-5 flex w-fit items-center gap-3 rounded-full border border-[#e4d7c2] bg-white/90 px-4 py-2 shadow-sm">
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                            <p className="text-sm font-semibold tracking-[0.18em] text-slate-700">
                                MONTHLY REWARD BOARD
                            </p>
                            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                        </div>

                        <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6">
                            {boardState.board.map((reward) => (
                                <RewardTile key={reward.day} reward={reward} />
                            ))}
                        </div>
                    </div>
                </section>

                <aside className="space-y-6">
                    <section className="rounded-[30px] border border-border/70 bg-card p-5 shadow-sm sm:p-6">
                        <div className="flex items-center gap-2 text-slate-900">
                            <Gift className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-semibold">ของวันนี้</h2>
                        </div>

                        <div className="mt-5 rounded-[26px] border border-blue-100 bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_100%)] p-5">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.18em] text-blue-500">Today Reward</p>
                                    <p className="mt-2 text-2xl font-semibold text-slate-900">{currentReward.label}</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Day {String(currentReward.day).padStart(2, "0")} ของรอบนี้
                                    </p>
                                </div>
                                <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[22px] bg-white shadow-sm">
                                    {currentRewardImage ? (
                                        <Image src={currentRewardImage} alt={currentReward.label} fill sizes="64px" className="object-contain p-2.5" />
                                    ) : (
                                        <CurrentIcon className="h-7 w-7 text-blue-600" />
                                    )}
                                </div>
                            </div>

                            <div className="mt-5 rounded-2xl border border-white/80 bg-white/90 p-4">
                                <p className="text-xs text-slate-400">จำนวนที่ได้รับ</p>
                                <p className="mt-2 text-xl font-semibold text-slate-900">{currentReward.amount}</p>
                                <p className="mt-1 text-sm text-slate-500">
                                    สถานะตอนนี้: {statusConfig[currentReward.status].label}
                                </p>
                            </div>

                            <SeasonPassClaimButton
                                canClaim={canClaim}
                                rewardLabel={currentReward.label}
                                rewardAmount={currentReward.amount}
                            />
                        </div>

                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                            <div className="flex items-start gap-3">
                                <CircleAlert className="mt-0.5 h-4 w-4 text-amber-700" />
                                <div className="space-y-2">
                                    <p className="text-sm font-semibold text-amber-900">กติกาที่ต้องเห็นชัด</p>
                                    <p className="text-sm leading-6 text-amber-900/85">
                                        ถ้าไม่ล็อกอินหรือไม่กดรับภายในวันนั้น สิทธิ์ของวันนั้นจะหายทันทีและไม่ย้อนรับย้อนหลัง
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-[30px] border border-border/70 bg-card p-5 shadow-sm sm:p-6">
                        <div className="flex items-center gap-2 text-slate-900">
                            <Clock3 className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-semibold">ประวัติการรับล่าสุด</h2>
                        </div>

                        <div className="mt-5 space-y-3">
                            {history.length > 0 ? (
                                history.map((entry) => (
                                    <div key={entry.id} className="rounded-2xl border border-border/70 bg-background/80 p-4">
                                        <p className="font-medium text-slate-900">
                                            Day {String(entry.dayNumber).padStart(2, "0")} • {entry.rewardLabel}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">จำนวน {entry.rewardAmount}</p>
                                        <p className="mt-2 text-xs text-slate-400">{entry.dateText}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-4 text-sm text-slate-500">
                                    ยังไม่มีประวัติการรับของในรอบนี้
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="rounded-[30px] border border-border/70 bg-card p-5 shadow-sm sm:p-6">
                        <div className="flex items-center gap-2 text-slate-900">
                            <Sparkles className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-semibold">ชนิดของรางวัล</h2>
                        </div>

                        <div className="mt-5 space-y-3">
                            {rewardLegend.map((item) => {
                                const config = rewardConfig[item.key];
                                const Icon = config.icon;

                                return (
                                    <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/80 p-4">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${config.iconWrap}`}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">{item.title}</p>
                                            <p className="mt-1 text-sm leading-6 text-slate-500">{item.detail}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
}
