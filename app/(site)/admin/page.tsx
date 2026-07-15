import { redirect } from "next/navigation";
import { db, orders, users } from "@/lib/db";
import { sum, count, countDistinct, isNull, gte } from "drizzle-orm";
import { getThaiDayStartUtc, toMySQLDatetime } from "@/lib/utils/date";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
    DollarSign,
    Users,
    UserCheck,
    ShoppingCart,
    ShoppingBag,
    Wallet,
} from "lucide-react";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { SalesDistribution } from "@/components/admin/SalesDistribution";
import { RecentTransactions } from "@/components/admin/RecentTransactions";
import { KpiSummaryCards } from "@/components/admin/KpiSummaryCards";
import { ComparisonSection } from "@/components/admin/ComparisonSection";
import { GachaSummary } from "@/components/admin/GachaSummary";
import { CategoryDistribution } from "@/components/admin/CategoryDistribution";
import { ActionCenter } from "@/components/admin/ActionCenter";
import { BestSellers } from "@/components/admin/BestSellers";
import { SalesHeatmap } from "@/components/admin/SalesHeatmap";
import { TopupSummaryWithDateRange } from "@/components/TopupSummaryWithDateRange";
import { MembersSummary } from "@/components/MembersSummary";
import { DashboardTabs } from "@/components/DashboardTabs";
import { AdminDashboardHeader } from "@/components/admin/AdminDashboardHeader";

export const dynamic = "force-dynamic";

function getFallbackAdminRoute(permissions: string[]) {
    const permissionRoutes: Array<[string, string]> = [
        [PERMISSIONS.PRODUCT_VIEW, "/admin/products"],
        [PERMISSIONS.CHAT_VIEW, "/admin/chat"],
        [PERMISSIONS.SLIP_VIEW, "/admin/slips"],
        [PERMISSIONS.USER_VIEW, "/admin/users"],
        [PERMISSIONS.CONTENT_VIEW, "/admin/news"],
        [PERMISSIONS.PROMO_VIEW, "/admin/promo-codes"],
        [PERMISSIONS.GACHA_VIEW, "/admin/gacha-machines"],
        [PERMISSIONS.SEASON_PASS_VIEW, "/admin/season-pass"],
        [PERMISSIONS.SETTINGS_VIEW, "/admin/settings"],
        [PERMISSIONS.AUDIT_LOG_VIEW, "/admin/audit-logs"],
        [PERMISSIONS.EXPORT_DATA, "/admin/export"],
    ];

    return permissionRoutes.find(([permission]) => permissions.includes(permission))?.[1] ?? null;
}

export default async function AdminDashboardPage() {
    const access = await requirePermission(PERMISSIONS.ADMIN_PANEL);
    if (!access.success || !access.permissions) {
        redirect("/?error=คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
    }

    if (!access.permissions.includes(PERMISSIONS.DASHBOARD_VIEW)) {
        const fallbackAdminRoute = getFallbackAdminRoute(access.permissions);

        if (fallbackAdminRoute) {
            redirect(fallbackAdminRoute);
        }
    }

    // "Today" starts at Thai midnight; lastLoginAt is stored in UTC.
    const todayStartSql = toMySQLDatetime(getThaiDayStartUtc());

    // Range-scoped revenue/orders KPIs moved to <KpiSummaryCards /> (client, via
    // /api/admin/dashboard/kpi-summary). This row keeps the system-wide numbers.
    const [[{ creditOutstanding: rawCredit, count: rawUsers }], [{ count: rawActiveUsersToday }], [{ buyers: rawBuyers }]] = await Promise.all([
        db.select({ creditOutstanding: sum(users.creditBalance), count: count() }).from(users),
        // Active users today = distinct users whose last successful login is today.
        db.select({ count: count() }).from(users).where(gte(users.lastLoginAt, todayStartSql)),
        // Exclude soft-deleted orders so buyer counts match the rest of the app.
        db.select({ buyers: countDistinct(orders.userId) }).from(orders).where(isNull(orders.deletedAt)),
    ]);

    const creditOutstanding = Number(rawCredit || 0);
    const totalUsers = Number(rawUsers);
    const buyers = Number(rawBuyers);

    const kpiCards = [
        {
            title: "เครดิตค้างในระบบ",
            value: `฿${creditOutstanding.toLocaleString()}`,
            sub: "ยอดรวมกระเป๋าเงินลูกค้าทุกคน",
            icon: Wallet,
            gradient: "from-[#145de7] to-[#114fc4]",
            lightBg: "bg-blue-50 dark:bg-blue-950/30",
            iconColor: "text-[#145de7] dark:text-blue-400",
        },
        {
            title: "ผู้ใช้งานทั้งหมด",
            value: totalUsers.toLocaleString(),
            sub: undefined as string | undefined,
            icon: Users,
            gradient: "from-violet-500 to-purple-600",
            lightBg: "bg-violet-50 dark:bg-violet-950/30",
            iconColor: "text-violet-600 dark:text-violet-400",
        },
        {
            title: "ผู้ใช้งานวันนี้",
            value: Number(rawActiveUsersToday).toLocaleString(),
            sub: undefined as string | undefined,
            icon: UserCheck,
            gradient: "from-emerald-500 to-teal-600",
            lightBg: "bg-emerald-50 dark:bg-emerald-950/30",
            iconColor: "text-emerald-600 dark:text-emerald-400",
        },
        {
            title: "ลูกค้าที่เคยซื้อ",
            value: buyers.toLocaleString(),
            sub: `จากผู้ใช้ทั้งหมด ${totalUsers.toLocaleString()} คน`,
            icon: ShoppingBag,
            gradient: "from-amber-500 to-orange-500",
            lightBg: "bg-amber-50 dark:bg-amber-950/30",
            iconColor: "text-amber-600 dark:text-amber-400",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <AdminDashboardHeader />

            {/* Tabbed Content */}
            <DashboardTabs
                overviewContent={
                    <div className="space-y-6">
                        {/* Actionable work queue (pending slips / unread chat / low stock) */}
                        <ActionCenter permissions={access.permissions} />

                        {/* Range-scoped KPIs with vs-previous-period deltas */}
                        <KpiSummaryCards />

                        {/* System-wide KPI Cards */}
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                            {kpiCards.map((kpi) => {
                                const Icon = kpi.icon;
                                return (
                                    <div
                                        key={kpi.title}
                                        className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)] transition-shadow duration-300 hover:shadow-[0_24px_50px_-28px_rgba(15,23,42,0.18)]"
                                    >
                                        {/* Top gradient bar */}
                                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${kpi.gradient}`} />
                                        <div className="p-5 pt-6">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                                                    <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                                                    {kpi.sub && <p className="text-xs text-muted-foreground">{kpi.sub}</p>}
                                                </div>
                                                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${kpi.lightBg}`}>
                                                    <Icon className={`h-5 w-5 ${kpi.iconColor}`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Revenue Chart */}
                        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)]">
                            <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                                <div className="w-6 h-6 bg-[#145de7] rounded flex items-center justify-center">
                                    <DollarSign className="h-3.5 w-3.5 text-white" />
                                </div>
                                <span className="font-bold">แนวโน้มรายได้</span>
                            </div>
                            <div className="p-5">
                                <RevenueChart />
                            </div>
                        </div>

                        {/* Revenue/order share by product category */}
                        <CategoryDistribution />

                        {/* Period-vs-period comparison (pick two ranges, any metric) */}
                        <ComparisonSection />

                        {/* Best Sellers + Peak Hours */}
                        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)]">
                                <div className="p-5">
                                    <BestSellers />
                                </div>
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)]">
                                <div className="p-5">
                                    <SalesHeatmap />
                                </div>
                            </div>
                        </div>
                    </div>
                }
                topupContent={<TopupSummaryWithDateRange />}
                membersContent={<MembersSummary />}
                gachaContent={<GachaSummary />}
                purchasesContent={
                    <div className="grid gap-4 grid-cols-1 lg:grid-cols-5">
                        {/* Sales Distribution */}
                        <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)]">
                            <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                                <div className="w-6 h-6 bg-[#145de7] rounded flex items-center justify-center">
                                    <ShoppingCart className="h-3.5 w-3.5 text-white" />
                                </div>
                                <span className="font-bold">สัดส่วนการเติมเงิน</span>
                            </div>
                            <div className="p-5">
                                <SalesDistribution />
                            </div>
                        </div>

                        {/* Recent Transactions */}
                        <div className="lg:col-span-3 overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)]">
                            <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                                <div className="w-6 h-6 bg-[#145de7] rounded flex items-center justify-center">
                                    <Users className="h-3.5 w-3.5 text-white" />
                                </div>
                                <span className="font-bold">รายการล่าสุด</span>
                            </div>
                            <div className="p-5">
                                <RecentTransactions />
                            </div>
                        </div>
                    </div>
                }
            />
        </div>
    );
}
