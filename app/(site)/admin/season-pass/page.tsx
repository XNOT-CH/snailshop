import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    Coins,
    Gift,
    ShieldCheck,
    Sparkles,
    TriangleAlert,
    Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/lib/permissions";
import { buildPageMetadata } from "@/lib/seo";
import { getAdminSeasonPassOverview } from "@/lib/seasonPass";

export const metadata = buildPageMetadata({
    title: "Season Pass",
    path: "/admin/season-pass",
    noIndex: true,
});

export default async function AdminSeasonPassPage() {
    const access = await requirePermission(PERMISSIONS.SEASON_PASS_VIEW);
    const canEditSeasonPass = access.success && access.permissions?.includes(PERMISSIONS.SEASON_PASS_EDIT);
    const overview = await getAdminSeasonPassOverview();
    const { plan, stats, rewardSummary, subscribers } = overview;
    const kpis = [
        { label: "สมาชิกที่ใช้งานอยู่", value: `${stats.activeCount.toLocaleString()} คน`, icon: Users, tone: "bg-blue-50 text-blue-700" },
        { label: "ยอดขายเดือนนี้", value: `${stats.salesAmountThisMonth.toLocaleString()} บาท`, icon: Coins, tone: "bg-emerald-50 text-emerald-700" },
        { label: "ยังไม่ได้รับวันนี้", value: `${stats.pendingTodayCount.toLocaleString()} คน`, icon: TriangleAlert, tone: "bg-amber-50 text-amber-700" },
        { label: "ใกล้หมดอายุ 3 วัน", value: `${stats.expiringSoonCount.toLocaleString()} คน`, icon: Clock3, tone: "bg-slate-100 text-slate-700" },
    ] as const;

    return (
        <div className="admin-season-pass-page space-y-6">
            <section className="admin-season-pass-hero flex flex-col gap-4 rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(239,246,255,0.88))] px-5 py-6 shadow-[0_24px_60px_-42px_rgba(37,99,235,0.32)] dark:border-[#2d4362] dark:bg-[linear-gradient(180deg,rgba(15,25,39,0.98),rgba(20,32,49,0.94))] dark:shadow-[0_24px_60px_-42px_rgba(0,0,0,0.7)] sm:px-7 sm:py-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl space-y-3">
                    <Badge className="w-fit rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-medium text-blue-700 dark:border-[#4d6f98] dark:bg-[#132133] dark:text-[#8cc4ff]">
                        Admin • Season Pass รายเดือน
                    </Badge>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#f2f7ff] sm:text-4xl">
                        คุมแพ็กเกจ {Number(plan.price).toLocaleString()} บาท, กล่องรายวัน และสมาชิกที่ต้องติดตามจากหน้าเดียว
                    </h1>
                    <p className="text-sm leading-6 text-slate-600 dark:text-[#b8cbe3] sm:text-base">
                        ใช้ข้อมูลจริงจาก plan, subscription และ claim เพื่อให้ทีมงานเห็นทั้งสถานะการขาย,
                        reward board, และคนที่ยังไม่ได้รับของวันนี้ในมุมเดียว
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    {canEditSeasonPass ? (
                        <Button asChild className="rounded-full px-5">
                            <Link href="/admin/season-pass/edit">แก้ไขแพ็กเกจ</Link>
                        </Button>
                    ) : null}
                    <Button asChild variant="outline" className="rounded-full px-5">
                        <Link href="/admin/season-pass/logs">ดู log การรับกล่อง</Link>
                    </Button>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {kpis.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="rounded-[24px] border border-border/70 bg-card p-5 shadow-sm">
                            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.tone}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <p className="mt-4 text-sm text-slate-500">{card.label}</p>
                            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{card.value}</p>
                        </div>
                    );
                })}
            </section>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <section className="space-y-6">
                    <div className="rounded-[26px] border border-border/70 bg-card p-5 shadow-sm sm:p-6">
                        <div className="flex items-center gap-2">
                            <Gift className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-semibold text-slate-900">ตั้งค่าแพ็กเกจ</h2>
                        </div>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Price</p>
                                <p className="mt-3 text-2xl font-semibold text-slate-900">{Number(plan.price).toLocaleString()} บาท</p>
                                <p className="mt-1 text-sm text-slate-500">ต่อรอบสมาชิก {plan.durationDays} วัน</p>
                            </div>
                            <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Plan status</p>
                                <p className="mt-3 text-lg font-semibold text-slate-900">{plan.isActive ? "เปิดขายอยู่" : "ปิดขายชั่วคราว"}</p>
                                <p className="mt-1 text-sm text-slate-500">ขายได้แล้ว {stats.salesCountThisMonth.toLocaleString()} รายการในเดือนนี้</p>
                            </div>
                        </div>
                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm leading-6 text-amber-900">
                            คำอธิบายที่ควรแสดงทุกจุด: ถ้าผู้ใช้ไม่ล็อกอินหรือไม่กดรับในวันนั้น จะเสียของในกล่องไป 1 วันทันที
                        </div>
                    </div>

                    <div className="rounded-[26px] border border-border/70 bg-card p-5 shadow-sm sm:p-6">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-semibold text-slate-900">Reward Pool</h2>
                        </div>
                        <div className="mt-5 space-y-3">
                            {rewardSummary.map((reward) => (
                                <div key={reward.item} className="rounded-2xl border border-border/70 bg-background/80 p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="font-medium text-slate-900">{reward.item}</p>
                                            <p className="mt-1 text-sm text-slate-500">ใช้งาน {reward.days.toLocaleString()} วันบน reward board</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="secondary" className="rounded-full px-3 py-1">
                                                รวม {reward.amount.toLocaleString()}
                                            </Badge>
                                            <Badge className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-blue-700 dark:border-[#4d6f98] dark:bg-[#173154] dark:text-[#9bd0ff]">
                                                {reward.state}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="rounded-[26px] border border-border/70 bg-card p-5 shadow-sm sm:p-6">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-semibold text-slate-900">สมาชิกที่ต้องติดตาม</h2>
                        </div>
                        <div className="mt-5 space-y-3">
                            {subscribers.length > 0 ? (
                                subscribers.map((subscriber) => (
                                    <div key={subscriber.userId} className="rounded-2xl border border-border/70 bg-background/80 p-4">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                            <div>
                                                <p className="font-medium text-slate-900">{subscriber.displayName || subscriber.username}</p>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    ความคืบหน้า {subscriber.progressText} • หมดอายุ {subscriber.expiresAtText}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="secondary" className="rounded-full px-3 py-1">{subscriber.statusLabel}</Badge>
                                                <Badge className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 dark:border-[#435d82] dark:bg-[#16253b] dark:text-[#d7e4f4]">
                                                    {subscriber.note}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-4 text-sm text-slate-500">
                                    ยังไม่มีสมาชิกที่มี Season Pass ใช้งานอยู่ตอนนี้
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-[26px] border border-border/70 bg-card p-5 shadow-sm sm:p-6">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-semibold text-slate-900">สถานะระบบที่ล็อกไว้แล้ว</h2>
                        </div>
                        <div className="mt-5 space-y-3">
                            {[
                                "ต่ออายุจะเข้าคิวเป็นรอบถัดไป ไม่ยืดรอบเดิมจน Day 30 พัง",
                                "ปิดขายจากแอดมินแล้วฝั่งหน้าเว็บและ API จะซื้อไม่ได้จริง",
                                `reward board ถูกล็อกเป็น ${plan.durationDays} วันทั้งระบบเพื่อตรงกับกติกาการเคลม`,
                                "มี claim log และสถานะ missed/today/claimed ใช้งานจริงแล้ว",
                            ].map((item) => (
                                <div key={item} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/80 p-4">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                                    <p className="text-sm leading-6 text-slate-600">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[26px] border border-blue-100 bg-blue-50/70 p-5 shadow-sm sm:p-6">
                        <div className="flex items-start gap-3">
                            <CalendarDays className="mt-0.5 h-5 w-5 text-blue-600" />
                            <div>
                                <p className="font-medium text-slate-900">จุดที่ควรต่อเพิ่มบนหน้าแรกของผู้ใช้</p>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    ควรมีแบนเนอร์ &quot;วันนี้คุณยังไม่ได้รับกล่อง Season Pass&quot; พร้อมปุ่มลัดเข้า
                                    `/dashboard/season-pass` เพื่อช่วยลดการลืมล็อกอินแล้วเสียสิทธิ์
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
