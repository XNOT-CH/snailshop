import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import {
    Clock3,
    Coins,
    Gift,
    Sparkles,
    TriangleAlert,
    Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PERMISSIONS } from "@/lib/permissions";
import { buildPageMetadata } from "@/lib/seo";
import { getAdminSeasonPassOverview } from "@/lib/seasonPass";

export const metadata = buildPageMetadata({
    title: "Season Pass",
    path: "/admin/season-pass",
    noIndex: true,
});

const SUBSCRIBER_STATUS_CLASSES: Record<string, string> = {
    "รับแล้ว": "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/15",
    "ยังไม่ได้รับ": "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/15",
    "พลาดสิทธิ์": "bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/15",
};

export default async function AdminSeasonPassPage() {
    const access = await requirePermission(PERMISSIONS.SEASON_PASS_VIEW);
    if (!access.success) {
        redirect("/admin?error=คุณไม่มีสิทธิ์ดู Season Pass");
    }
    const canEditSeasonPass = access.permissions?.includes(PERMISSIONS.SEASON_PASS_EDIT);

    const overview = await getAdminSeasonPassOverview();
    const { plan, stats, rewardSummary, subscribers } = overview;

    const rewardRows = rewardSummary.filter((reward) => reward.item !== "Milestone Days");
    const highlightSummary = rewardSummary.find((reward) => reward.item === "Milestone Days");

    const kpis = [
        {
            label: "สมาชิกที่ใช้งานอยู่",
            value: `${stats.activeCount.toLocaleString()} คน`,
            icon: Users,
            tone: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
        },
        {
            label: "ยอดขายเดือนนี้",
            value: `${stats.salesAmountThisMonth.toLocaleString()} บาท`,
            icon: Coins,
            tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
        },
        {
            label: "ยังไม่ได้รับวันนี้",
            value: `${stats.pendingTodayCount.toLocaleString()} คน`,
            icon: TriangleAlert,
            tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
        },
        {
            label: "ใกล้หมดอายุใน 3 วัน",
            value: `${stats.expiringSoonCount.toLocaleString()} คน`,
            icon: Clock3,
            tone: "bg-muted text-muted-foreground",
        },
    ] as const;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                        Season Pass
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base">
                        จัดการแพ็กเกจรายเดือน กล่องรางวัลรายวัน และสมาชิกที่ใช้งานอยู่
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline">
                        <Link href="/admin/season-pass/logs">ประวัติการรับกล่อง</Link>
                    </Button>
                    {canEditSeasonPass ? (
                        <Button asChild>
                            <Link href="/admin/season-pass/edit">แก้ไขแพ็กเกจ</Link>
                        </Button>
                    ) : null}
                </div>
            </div>

            {/* KPI Cards */}
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {kpis.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                            <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", card.tone)}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <p className="mt-4 text-sm text-muted-foreground">{card.label}</p>
                            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{card.value}</p>
                        </div>
                    );
                })}
            </section>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <section className="space-y-6">
                    {/* Plan Settings */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                        <div className="flex items-center gap-2">
                            <Gift className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <h2 className="text-xl font-semibold text-foreground">ตั้งค่าแพ็กเกจ</h2>
                        </div>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl border border-border bg-muted/40 p-4">
                                <p className="text-xs text-muted-foreground">ราคา</p>
                                <p className="mt-2 text-2xl font-semibold text-foreground">{Number(plan.price).toLocaleString()} บาท</p>
                                <p className="mt-1 text-sm text-muted-foreground">ต่อรอบสมาชิก {plan.durationDays} วัน</p>
                            </div>
                            <div className="rounded-xl border border-border bg-muted/40 p-4">
                                <p className="text-xs text-muted-foreground">สถานะการขาย</p>
                                <p className="mt-2 text-2xl font-semibold text-foreground">{plan.isActive ? "เปิดขายอยู่" : "ปิดขายชั่วคราว"}</p>
                                <p className="mt-1 text-sm text-muted-foreground">ขายแล้ว {stats.salesCountThisMonth.toLocaleString()} รายการในเดือนนี้</p>
                            </div>
                        </div>
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm leading-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                            สมาชิกที่ไม่กดรับกล่องภายในวันนั้น จะเสียของประจำวันนั้นทันทีและย้อนกลับมารับไม่ได้
                        </div>
                    </div>

                    {/* Reward Board */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <h2 className="text-xl font-semibold text-foreground">รางวัลบนบอร์ด</h2>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            บอร์ดทั้งหมด {plan.durationDays} วัน
                            {highlightSummary ? ` • วันไฮไลต์ ${highlightSummary.amount.toLocaleString()} วัน` : ""}
                        </p>
                        <div className="mt-4 space-y-3">
                            {rewardRows.map((reward) => (
                                <div key={reward.item} className="rounded-xl border border-border bg-muted/40 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="font-medium text-foreground">{reward.item}</p>
                                            <p className="mt-1 text-sm text-muted-foreground">อยู่บนบอร์ด {reward.days.toLocaleString()} วัน</p>
                                        </div>
                                        <Badge variant="secondary" className="rounded-full px-3 py-1">
                                            รวม {reward.amount.toLocaleString()}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Subscribers */}
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <h2 className="text-xl font-semibold text-foreground">สมาชิกที่ใช้งานอยู่</h2>
                    </div>
                    <div className="mt-5 space-y-3">
                        {subscribers.length > 0 ? (
                            subscribers.map((subscriber) => (
                                <div key={subscriber.userId} className="rounded-xl border border-border bg-muted/40 p-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-foreground">{subscriber.displayName || subscriber.username}</p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                ความคืบหน้า {subscriber.progressText} • หมดอายุ {subscriber.expiresAtText}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge
                                                className={cn(
                                                    "rounded-full px-3 py-1 text-xs font-semibold",
                                                    SUBSCRIBER_STATUS_CLASSES[subscriber.statusLabel] ?? "bg-muted text-muted-foreground hover:bg-muted",
                                                )}
                                            >
                                                {subscriber.statusLabel}
                                            </Badge>
                                            <Badge variant="outline" className="rounded-full border-border px-3 py-1 text-muted-foreground">
                                                {subscriber.note}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                                ยังไม่มีสมาชิกที่มี Season Pass ใช้งานอยู่ตอนนี้
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
