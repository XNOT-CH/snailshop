import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, Gift, PackageCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getPointCurrencyName } from "@/lib/currencySettings";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
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

function getRewardTypeLabel(value: string, pointCurrencyName: string) {
    switch (value) {
        case "credits":
            return "เครดิต";
        case "points":
            return pointCurrencyName;
        case "tickets":
            return "ตั๋วสุ่ม";
        default:
            return value;
    }
}

interface LogsPageProps {
    searchParams?: Promise<{ q?: string; from?: string; to?: string; page?: string }>;
}

export default async function AdminSeasonPassLogsPage(props: Readonly<LogsPageProps>) {
    // Middleware guards this path too, but every other admin page checks again
    // here so the whole surface never rests on one config file.
    const access = await requirePermission(PERMISSIONS.SEASON_PASS_VIEW);
    if (!access.success) {
        redirect("/admin?error=คุณไม่มีสิทธิ์ดู Season Pass");
    }

    const searchParams = (await props.searchParams) ?? {};
    const search = searchParams.q?.trim() ?? "";
    const from = searchParams.from?.trim() ?? "";
    const to = searchParams.to?.trim() ?? "";
    const page = Number.parseInt(searchParams.page ?? "1", 10);

    const { rows: logs, total, pageCount, pageSize, page: currentPage } = await getAdminSeasonPassClaimLogs({
        search,
        from: from || undefined,
        to: to || undefined,
        page: Number.isFinite(page) ? page : 1,
        pageSize: 50,
    });
    const currencySettings = await getCurrencySettings().catch(() => null);
    const pointCurrencyName = getPointCurrencyName(currencySettings);

    const hasFilters = Boolean(search || from || to);
    const pageHref = (nextPage: number) => {
        const params = new URLSearchParams();
        if (search) params.set("q", search);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (nextPage > 1) params.set("page", String(nextPage));
        const query = params.toString();
        return query ? `/admin/season-pass/logs?${query}` : "/admin/season-pass/logs";
    };

    return (
        <div className="space-y-6">
            <section className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card px-5 py-6 shadow-sm sm:px-7 sm:py-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Button asChild variant="outline" size="icon" className="h-10 w-10 rounded-full">
                            <Link href="/admin/season-pass">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <Badge className="w-fit rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
                            Admin • Season Pass Log
                        </Badge>
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                        log การรับกล่อง Season Pass
                    </h1>
                    <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                        รวมประวัติการกดรับกล่องล่าสุดของสมาชิก พร้อมวัน, ประเภทรางวัล, จำนวนที่ได้รับ
                        และช่วงอายุแพ็กเกจ เพื่อใช้ตรวจสอบย้อนหลังได้จากหน้าเดียว
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm">
                        <p className="text-xs text-muted-foreground">{hasFilters ? "ตรงกับที่ค้นหา" : "รายการทั้งหมด"}</p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">{total.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm">
                        <p className="text-xs text-muted-foreground">ผู้ใช้ไม่ซ้ำในหน้านี้</p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">
                            {new Set(logs.map((log) => log.username)).size.toLocaleString()}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm">
                        <p className="text-xs text-muted-foreground">รายการล่าสุดในหน้านี้</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                            {logs[0] ? formatDateTime(logs[0].createdAt) : "-"}
                        </p>
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">ประวัติการรับกล่อง</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {total > 0
                                ? `แสดง ${((currentPage - 1) * pageSize + 1).toLocaleString()}–${Math.min(currentPage * pageSize, total).toLocaleString()} จาก ${total.toLocaleString()} รายการ`
                                : "ไม่มีรายการที่ตรงกับเงื่อนไข"}
                        </p>
                    </div>

                    <form method="get" className="flex flex-wrap items-end gap-2">
                        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                            ค้นหาผู้ใช้
                            <input
                                type="search"
                                name="q"
                                defaultValue={search}
                                placeholder="ชื่อผู้ใช้หรือชื่อที่แสดง"
                                className="h-9 w-44 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                            ตั้งแต่วันที่
                            <input
                                type="date"
                                name="from"
                                defaultValue={from}
                                className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                            ถึงวันที่
                            <input
                                type="date"
                                name="to"
                                defaultValue={to}
                                className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                            />
                        </label>
                        <Button type="submit" size="sm" className="h-9">ค้นหา</Button>
                        {hasFilters ? (
                            <Button asChild size="sm" variant="ghost" className="h-9">
                                <Link href="/admin/season-pass/logs">ล้างตัวกรอง</Link>
                            </Button>
                        ) : null}
                    </form>
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
                                                <UserRound className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <p className="font-medium text-foreground">
                                                        {log.displayName || log.username}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">@{log.username}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="rounded-full px-3 py-1">
                                            Day {log.dayNumber}
                                        </Badge>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 gap-3 text-sm">
                                        <div className="rounded-xl bg-muted/50 px-3 py-3">
                                            <div className="flex items-start gap-2">
                                                <Gift className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                <div>
                                                    <p className="font-medium text-foreground">{log.rewardLabel}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {getRewardTypeLabel(log.rewardType, pointCurrencyName)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-xl bg-muted/50 px-3 py-3">
                                                <p className="text-xs text-muted-foreground">จำนวน</p>
                                                <p className="mt-1 font-medium text-foreground">
                                                    {log.rewardAmount}
                                                </p>
                                            </div>
                                            <div className="rounded-xl bg-muted/50 px-3 py-3">
                                                <p className="text-xs text-muted-foreground">คีย์วันที่</p>
                                                <p className="mt-1 font-medium text-foreground">
                                                    {log.claimDateKey}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-muted/50 px-3 py-3">
                                            <div className="flex items-start gap-2">
                                                <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <p className="font-medium text-foreground">
                                                        {formatDateTime(log.createdAt)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">วันที่รับรางวัล</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-muted/50 px-3 py-3">
                                            <div className="flex items-start gap-2">
                                                <PackageCheck className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                <div>
                                                    <p className="text-xs text-muted-foreground">
                                                        เริ่ม {formatDateTime(log.subscriptionStartAt)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
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
                            <thead className="bg-muted/50 text-muted-foreground">
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
                                                <UserRound className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <p className="font-medium text-foreground">{log.displayName || log.username}</p>
                                                    <p className="text-xs text-muted-foreground">@{log.username}</p>
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
                                                <Gift className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                <div>
                                                    <p className="font-medium text-foreground">{log.rewardLabel}</p>
                                                    <p className="text-xs text-muted-foreground">{getRewardTypeLabel(log.rewardType, pointCurrencyName)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-foreground">{log.rewardAmount}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-start gap-2">
                                                <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <p className="font-medium text-foreground">{formatDateTime(log.createdAt)}</p>
                                                    <p className="text-xs text-muted-foreground">คีย์วันที่ {log.claimDateKey}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-start gap-2">
                                                <PackageCheck className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                <div>
                                                    <p className="text-xs text-muted-foreground">เริ่ม {formatDateTime(log.subscriptionStartAt)}</p>
                                                    <p className="text-xs text-muted-foreground">หมดอายุ {formatDateTime(log.subscriptionEndAt)}</p>
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

                {pageCount > 1 ? (
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                        <p className="text-sm text-muted-foreground">
                            หน้า {currentPage.toLocaleString()} จาก {pageCount.toLocaleString()}
                        </p>
                        <div className="flex gap-2">
                            <Button asChild size="sm" variant="outline" disabled={currentPage <= 1}>
                                <Link href={pageHref(Math.max(currentPage - 1, 1))}>ก่อนหน้า</Link>
                            </Button>
                            <Button asChild size="sm" variant="outline" disabled={currentPage >= pageCount}>
                                <Link href={pageHref(Math.min(currentPage + 1, pageCount))}>ถัดไป</Link>
                            </Button>
                        </div>
                    </div>
                ) : null}
            </section>
        </div>
    );
}
