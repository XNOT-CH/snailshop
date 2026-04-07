import Link from "next/link";
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
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
    title: "Season Pass",
    path: "/admin/season-pass",
    noIndex: true,
});

const kpis = [
    { label: "สมาชิกที่ใช้งานอยู่", value: "128", icon: Users, tone: "bg-blue-50 text-blue-700" },
    { label: "รายได้รอบนี้", value: "6,400 บาท", icon: Coins, tone: "bg-emerald-50 text-emerald-700" },
    { label: "พลาดสิทธิ์วันนี้", value: "19 คน", icon: TriangleAlert, tone: "bg-amber-50 text-amber-700" },
    { label: "กำลังจะหมดอายุ", value: "32 คน", icon: Clock3, tone: "bg-slate-100 text-slate-700" },
] as const;

const rewards = [
    { item: "Coins 80-200", rate: "52%", stock: "ไม่จำกัด", state: "เปิดใช้งาน" },
    { item: "Rare Box", rate: "22%", stock: "120 กล่อง", state: "เปิดใช้งาน" },
    { item: "Boost Card 24H", rate: "18%", stock: "65 ใบ", state: "เปิดใช้งาน" },
    { item: "Crystal Key", rate: "8%", stock: "20 ชิ้น", state: "ติดตามใกล้ชิด" },
] as const;

const subscribers = [
    { user: "icegamer", status: "รับแล้ว", progress: "17/30 วัน", expiresAt: "18 เม.ย. 2026", note: "ปกติ" },
    { user: "mintra88", status: "ยังไม่ได้รับ", progress: "04/30 วัน", expiresAt: "02 พ.ค. 2026", note: "ควรแจ้งเตือน" },
    { user: "sunnyshop", status: "พลาดสิทธิ์", progress: "09/30 วัน", expiresAt: "22 เม.ย. 2026", note: "พลาด 2 วันติด" },
] as const;

export default function AdminSeasonPassPage() {
    return (
        <div className="space-y-6">
            <section className="flex flex-col gap-4 rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(239,246,255,0.88))] px-5 py-6 shadow-[0_24px_60px_-42px_rgba(37,99,235,0.32)] sm:px-7 sm:py-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl space-y-3">
                    <Badge className="w-fit rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-medium text-blue-700">
                        Admin • Season Pass รายเดือน
                    </Badge>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                        คุมแพ็กเกจ 50 บาท, กล่องรายวัน และวันที่ผู้ใช้พลาดสิทธิ์จากหน้าเดียว
                    </h1>
                    <p className="text-sm leading-6 text-slate-600 sm:text-base">
                        หน้านี้ถูกจัดให้เป็นจุดรวมสำหรับแพ็กเกจ, reward pool, การติดตามสมาชิกที่ยังไม่รับกล่อง
                        และกติกาเรื่องไม่ล็อกอินแล้วเสียสิทธิ์ประจำวัน
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button asChild className="rounded-full px-5">
                        <Link href="/admin/season-pass/edit">แก้ไขแพ็กเกจ</Link>
                    </Button>
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
                                <p className="mt-3 text-2xl font-semibold text-slate-900">50 บาท</p>
                                <p className="mt-1 text-sm text-slate-500">ต่อรอบสมาชิก 30 วัน</p>
                            </div>
                            <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Claim rule</p>
                                <p className="mt-3 text-lg font-semibold text-slate-900">1 กล่อง / 1 วัน</p>
                                <p className="mt-1 text-sm text-slate-500">ไม่สะสมสิทธิ์ย้อนหลัง</p>
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
                            {rewards.map((reward) => (
                                <div key={reward.item} className="rounded-2xl border border-border/70 bg-background/80 p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="font-medium text-slate-900">{reward.item}</p>
                                            <p className="mt-1 text-sm text-slate-500">อัตราสุ่ม {reward.rate}</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="secondary" className="rounded-full px-3 py-1">{reward.stock}</Badge>
                                            <Badge className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-blue-700">
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
                            {subscribers.map((subscriber) => (
                                <div key={subscriber.user} className="rounded-2xl border border-border/70 bg-background/80 p-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <p className="font-medium text-slate-900">{subscriber.user}</p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                ความคืบหน้า {subscriber.progress} • หมดอายุ {subscriber.expiresAt}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="secondary" className="rounded-full px-3 py-1">{subscriber.status}</Badge>
                                            <Badge className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700">
                                                {subscriber.note}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[26px] border border-border/70 bg-card p-5 shadow-sm sm:p-6">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-semibold text-slate-900">Checklist ก่อนต่อ backend</h2>
                        </div>
                        <div className="mt-5 space-y-3">
                            {[
                                "บันทึก claim แยกตาม user และวันที่เพื่อกันการรับซ้ำ",
                                "มีสถานะ missed day ไว้แสดงวันที่พลาดสิทธิ์ในหน้า user",
                                "ตั้ง notification banner ใน dashboard เมื่อวันนี้ยังไม่ได้รับกล่อง",
                                "ให้แอดมินมี log และปุ่มชดเชยกรณีระบบมีปัญหา",
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
                                    ควรมีแบนเนอร์ “วันนี้คุณยังไม่ได้รับกล่อง Season Pass” พร้อมปุ่มลัดเข้า
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
