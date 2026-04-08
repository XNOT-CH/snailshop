import Link from "next/link";
import { ArrowLeft, CalendarDays, Gift, PackageCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildPageMetadata } from "@/lib/seo";
import { getAdminSeasonPassClaimLogs } from "@/lib/seasonPass";
import { mysqlDateTimeToIso, TH_TIME_ZONE } from "@/lib/utils/date";

export const metadata = buildPageMetadata({
    title: "Season Pass Claim Logs",
    path: "/admin/season-pass/logs",
    noIndex: true,
});

function formatDateTime(value: string) {
    const iso = mysqlDateTimeToIso(value) ?? value;
    return new Date(iso).toLocaleString("th-TH", {
        timeZone: TH_TIME_ZONE,
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getRewardTypeLabel(value: string) {
    switch (value) {
        case "credits":
            return "เครดิต";
        case "points":
            return "พอยต์";
        case "tickets":
            return "ตั๋วสุ่ม";
        default:
            return value;
    }
}

export default async function AdminSeasonPassLogsPage() {
    const logs = await getAdminSeasonPassClaimLogs(150);

    return (
        <div className="space-y-6">
            <section className="flex flex-col gap-4 rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(239,246,255,0.88))] px-5 py-6 shadow-[0_24px_60px_-42px_rgba(37,99,235,0.32)] sm:px-7 sm:py-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Button asChild variant="outline" size="icon" className="h-10 w-10 rounded-full">
                            <Link href="/admin/season-pass">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <Badge className="w-fit rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-medium text-blue-700">
                            Admin • Season Pass Log
                        </Badge>
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                        log การรับกล่อง Season Pass
                    </h1>
                    <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                        รวมประวัติการกดรับกล่องล่าสุดของสมาชิก พร้อมวัน, ประเภทรางวัล, จำนวนที่ได้รับ
                        และช่วงอายุแพ็กเกจ เพื่อใช้ตรวจสอบย้อนหลังได้จากหน้าเดียว
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border/70 bg-white/90 px-4 py-3 shadow-sm">
                        <p className="text-xs text-slate-500">รายการล่าสุด</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-900">{logs.length.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-white/90 px-4 py-3 shadow-sm">
                        <p className="text-xs text-slate-500">ผู้ใช้ไม่ซ้ำในชุดนี้</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-900">
                            {new Set(logs.map((log) => log.username)).size.toLocaleString()}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-white/90 px-4 py-3 shadow-sm">
                        <p className="text-xs text-slate-500">วันล่าสุดที่มีการรับ</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                            {logs[0] ? formatDateTime(logs[0].createdAt) : "-"}
                        </p>
                    </div>
                </div>
            </section>

            <section className="rounded-[26px] border border-border/70 bg-card p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">ประวัติการรับกล่อง</h2>
                        <p className="mt-1 text-sm text-slate-500">แสดง 150 รายการล่าสุดจากตาราง SeasonPassClaim</p>
                    </div>
                    <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                        ใช้งานได้จริง
                    </Badge>
                </div>

                {logs.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                        ยังไม่มี log การรับกล่องในระบบ
                    </div>
                ) : (
                    <>
                        <div className="mt-5 space-y-3 md:hidden">
                            {logs.map((log) => (
                                <div key={log.id} className="rounded-2xl border border-border p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-start gap-2">
                                                <UserRound className="mt-0.5 h-4 w-4 text-slate-400" />
                                                <div>
                                                    <p className="font-medium text-slate-900">
                                                        {log.displayName || log.username}
                                                    </p>
                                                    <p className="text-xs text-slate-500">@{log.username}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="rounded-full px-3 py-1">
                                            Day {log.dayNumber}
                                        </Badge>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 gap-3 text-sm">
                                        <div className="rounded-xl bg-slate-50 px-3 py-3">
                                            <div className="flex items-start gap-2">
                                                <Gift className="mt-0.5 h-4 w-4 text-blue-600" />
                                                <div>
                                                    <p className="font-medium text-slate-900">{log.rewardLabel}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {getRewardTypeLabel(log.rewardType)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-xl bg-slate-50 px-3 py-3">
                                                <p className="text-xs text-slate-500">จำนวน</p>
                                                <p className="mt-1 font-medium text-slate-900">
                                                    {log.rewardAmount}
                                                </p>
                                            </div>
                                            <div className="rounded-xl bg-slate-50 px-3 py-3">
                                                <p className="text-xs text-slate-500">คีย์วันที่</p>
                                                <p className="mt-1 font-medium text-slate-900">
                                                    {log.claimDateKey}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 px-3 py-3">
                                            <div className="flex items-start gap-2">
                                                <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" />
                                                <div>
                                                    <p className="font-medium text-slate-900">
                                                        {formatDateTime(log.createdAt)}
                                                    </p>
                                                    <p className="text-xs text-slate-500">วันที่รับรางวัล</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 px-3 py-3">
                                            <div className="flex items-start gap-2">
                                                <PackageCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                                                <div>
                                                    <p className="text-xs text-slate-500">
                                                        เริ่ม {formatDateTime(log.subscriptionStartAt)}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        หมดอายุ {formatDateTime(log.subscriptionEndAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-border md:block">
                            <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">สมาชิก</th>
                                    <th className="px-4 py-3 text-left font-semibold">วัน</th>
                                    <th className="px-4 py-3 text-left font-semibold">รางวัล</th>
                                    <th className="px-4 py-3 text-left font-semibold">จำนวน</th>
                                    <th className="px-4 py-3 text-left font-semibold">วันที่รับ</th>
                                    <th className="px-4 py-3 text-left font-semibold">ช่วงแพ็กเกจ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id} className="border-t border-border align-top">
                                        <td className="px-4 py-3">
                                            <div className="flex items-start gap-2">
                                                <UserRound className="mt-0.5 h-4 w-4 text-slate-400" />
                                                <div>
                                                    <p className="font-medium text-slate-900">{log.displayName || log.username}</p>
                                                    <p className="text-xs text-slate-500">@{log.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="secondary" className="rounded-full px-3 py-1">
                                                Day {log.dayNumber}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-start gap-2">
                                                <Gift className="mt-0.5 h-4 w-4 text-blue-600" />
                                                <div>
                                                    <p className="font-medium text-slate-900">{log.rewardLabel}</p>
                                                    <p className="text-xs text-slate-500">{getRewardTypeLabel(log.rewardType)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-900">{log.rewardAmount}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-start gap-2">
                                                <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" />
                                                <div>
                                                    <p className="font-medium text-slate-900">{formatDateTime(log.createdAt)}</p>
                                                    <p className="text-xs text-slate-500">คีย์วันที่ {log.claimDateKey}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-start gap-2">
                                                <PackageCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                                                <div>
                                                    <p className="text-xs text-slate-500">เริ่ม {formatDateTime(log.subscriptionStartAt)}</p>
                                                    <p className="text-xs text-slate-500">หมดอายุ {formatDateTime(log.subscriptionEndAt)}</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    </>
                )}

                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-slate-600">
                    หน้านี้ใช้ข้อมูลจริงจาก `SeasonPassClaim` และ `SeasonPassSubscription` แล้ว
                    ถ้าต้องการต่อยอด ผมสามารถเพิ่มช่องค้นหา username, filter ตามวัน และ export CSV ให้ได้ต่อจากจุดนี้
                </div>
            </section>
        </div>
    );
}
