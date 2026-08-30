import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { buildPageMetadata } from "@/lib/seo";
import { getAdminSeasonPassSubscribers } from "@/lib/seasonPass";
import { SeasonPassSubscriberActions } from "@/components/admin/SeasonPassSubscriberActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = buildPageMetadata({
    title: "สมาชิก Season Pass",
    path: "/admin/season-pass/subscribers",
    noIndex: true,
});

export const dynamic = "force-dynamic";

const STATUS_CLASSES: Record<string, string> = {
    "รับแล้ว": "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/15",
    "ยังไม่ได้รับ": "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/15",
    "พลาดสิทธิ์": "bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/15",
    "หมดอายุแล้ว": "bg-muted text-muted-foreground hover:bg-muted",
};

const STATUS_TABS = [
    { value: "active", label: "ใช้งานอยู่" },
    { value: "expired", label: "หมดอายุแล้ว" },
    { value: "all", label: "ทั้งหมด" },
] as const;

interface SubscribersPageProps {
    searchParams?: Promise<{ q?: string; status?: string; page?: string }>;
}

export default async function AdminSeasonPassSubscribersPage(props: Readonly<SubscribersPageProps>) {
    const access = await requirePermission(PERMISSIONS.SEASON_PASS_VIEW);
    if (!access.success) {
        redirect("/admin?error=คุณไม่มีสิทธิ์ดู Season Pass");
    }
    const canEditSeasonPass = access.permissions?.includes(PERMISSIONS.SEASON_PASS_EDIT);

    const searchParams = (await props.searchParams) ?? {};
    const search = searchParams.q?.trim() ?? "";
    const status = STATUS_TABS.some((tab) => tab.value === searchParams.status)
        ? (searchParams.status as "active" | "expired" | "all")
        : "active";
    const requestedPage = Number.parseInt(searchParams.page ?? "1", 10);

    const { subscribers, total, page, pageSize, pageCount } = await getAdminSeasonPassSubscribers({
        search,
        status,
        page: Number.isFinite(requestedPage) ? requestedPage : 1,
        pageSize: 25,
    });

    const buildHref = (next: { status?: string; page?: number }) => {
        const params = new URLSearchParams();
        if (search) params.set("q", search);
        const nextStatus = next.status ?? status;
        if (nextStatus !== "active") params.set("status", nextStatus);
        if (next.page && next.page > 1) params.set("page", String(next.page));
        const query = params.toString();
        return query ? `/admin/season-pass/subscribers?${query}` : "/admin/season-pass/subscribers";
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Button asChild variant="ghost" size="icon">
                        <Link href="/admin/season-pass">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
                            <Users className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                            สมาชิก Season Pass
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {total.toLocaleString()} รายการ{search ? ` ที่ตรงกับ "${search}"` : ""}
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {STATUS_TABS.map((tab) => (
                            <Button
                                key={tab.value}
                                asChild
                                size="sm"
                                variant={status === tab.value ? "default" : "outline"}
                                className="rounded-full"
                            >
                                <Link href={buildHref({ status: tab.value, page: 1 })}>{tab.label}</Link>
                            </Button>
                        ))}
                    </div>

                    <form method="get" className="flex flex-wrap items-end gap-2">
                        {status !== "active" ? <input type="hidden" name="status" value={status} /> : null}
                        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                            ค้นหาสมาชิก
                            <input
                                type="search"
                                name="q"
                                defaultValue={search}
                                placeholder="ชื่อผู้ใช้หรือชื่อที่แสดง"
                                className="h-9 w-52 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                            />
                        </label>
                        <Button type="submit" size="sm" className="h-9">ค้นหา</Button>
                        {search ? (
                            <Button asChild size="sm" variant="ghost" className="h-9">
                                <Link href={buildHref({ page: 1 })}>ล้าง</Link>
                            </Button>
                        ) : null}
                    </form>
                </div>

                <div className="mt-5 space-y-3">
                    {subscribers.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                            ไม่พบสมาชิกที่ตรงกับเงื่อนไข
                        </div>
                    ) : (
                        subscribers.map((subscriber) => (
                            <div key={subscriber.subscriptionId} className="rounded-xl border border-border bg-muted/40 p-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-foreground">
                                            {subscriber.displayName || subscriber.username}
                                            <span className="ml-2 text-xs text-muted-foreground">@{subscriber.username}</span>
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            ความคืบหน้า {subscriber.progressText} • หมดอายุ {subscriber.expiresAtText}
                                            {subscriber.pricePaid !== null ? ` • จ่าย ${subscriber.pricePaid.toLocaleString()} เครดิต` : ""}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge
                                            className={cn(
                                                "rounded-full px-3 py-1 text-xs font-semibold",
                                                STATUS_CLASSES[subscriber.statusLabel] ?? "bg-muted text-muted-foreground hover:bg-muted",
                                            )}
                                        >
                                            {subscriber.statusLabel}
                                        </Badge>
                                        {subscriber.missedCount > 0 ? (
                                            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs text-muted-foreground">
                                                พลาดสะสม {subscriber.missedCount} วัน
                                            </Badge>
                                        ) : null}
                                        {canEditSeasonPass ? (
                                            <SeasonPassSubscriberActions
                                                subscriptionId={subscriber.subscriptionId}
                                                customerName={subscriber.displayName || subscriber.username}
                                                pricePaid={subscriber.pricePaid}
                                                isRunning={subscriber.isRunning}
                                            />
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {pageCount > 1 ? (
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                        <p className="text-sm text-muted-foreground">
                            แสดง {((page - 1) * pageSize + 1).toLocaleString()}–{Math.min(page * pageSize, total).toLocaleString()} จาก {total.toLocaleString()}
                        </p>
                        <div className="flex gap-2">
                            <Button asChild size="sm" variant="outline" disabled={page <= 1}>
                                <Link href={buildHref({ page: Math.max(page - 1, 1) })}>ก่อนหน้า</Link>
                            </Button>
                            <Button asChild size="sm" variant="outline" disabled={page >= pageCount}>
                                <Link href={buildHref({ page: Math.min(page + 1, pageCount) })}>ถัดไป</Link>
                            </Button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
