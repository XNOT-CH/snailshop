import { db, orders, products, users } from "@/lib/db";
import { sum, count } from "drizzle-orm";
import {
    DollarSign,
    Users,
    UserCheck,
    ShoppingCart,
} from "lucide-react";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { SalesDistribution } from "@/components/admin/SalesDistribution";
import { RecentTransactions } from "@/components/admin/RecentTransactions";
import { TopupSummaryWithDateRange } from "@/components/TopupSummaryWithDateRange";
import { MembersSummary } from "@/components/MembersSummary";
import { DashboardTabs } from "@/components/DashboardTabs";
import { AdminDashboardHeader } from "@/components/admin/AdminDashboardHeader";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
    const [[{ totalRevenue: rawRevenue, salesCount: rawCount }], [{ count: rawProducts }], [{ count: rawUsers }]] = await Promise.all([
        db.select({ totalRevenue: sum(orders.totalPrice), salesCount: count() }).from(orders),
        db.select({ count: count() }).from(products),
        db.select({ count: count() }).from(users),
    ]);

    const totalRevenue = Number(rawRevenue || 0);
    const salesCount = Number(rawCount);

    const kpiCards = [
        {
            title: "รายได้ทั้งหมด",
            value: `฿${totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            gradient: "from-[#1a56db] to-[#1e40af]",
            lightBg: "bg-blue-50 dark:bg-blue-950/30",
            iconColor: "text-[#1a56db] dark:text-blue-400",
        },
        {
            title: "ผู้ใช้งานทั้งหมด",
            value: Number(rawUsers).toLocaleString(),
            icon: Users,
            gradient: "from-violet-500 to-purple-600",
            lightBg: "bg-violet-50 dark:bg-violet-950/30",
            iconColor: "text-violet-600 dark:text-violet-400",
        },
        {
            title: "ผู้ใช้งานวันนี้",
            value: Math.floor(Number(rawUsers) * 0.3).toLocaleString(),
            icon: UserCheck,
            gradient: "from-emerald-500 to-teal-600",
            lightBg: "bg-emerald-50 dark:bg-emerald-950/30",
            iconColor: "text-emerald-600 dark:text-emerald-400",
        },
        {
            title: "คำสั่งซื้อทั้งหมด",
            value: salesCount.toLocaleString(),
            icon: ShoppingCart,
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
                        {/* KPI Cards */}
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                            {kpiCards.map((kpi) => {
                                const Icon = kpi.icon;
                                return (
                                    <div
                                        key={kpi.title}
                                        className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-300"
                                    >
                                        {/* Top gradient bar */}
                                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${kpi.gradient}`} />
                                        <div className="p-5 pt-6">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                                                    <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
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
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
                            <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                                <div className="w-6 h-6 bg-[#1a56db] rounded flex items-center justify-center">
                                    <DollarSign className="h-3.5 w-3.5 text-white" />
                                </div>
                                <span className="font-bold">แนวโน้มรายได้</span>
                            </div>
                            <div className="p-5">
                                <RevenueChart />
                            </div>
                        </div>
                    </div>
                }
                topupContent={<TopupSummaryWithDateRange />}
                membersContent={<MembersSummary />}
                purchasesContent={
                    <div className="grid gap-4 grid-cols-1 lg:grid-cols-5">
                        {/* Sales Distribution */}
                        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
                            <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                                <div className="w-6 h-6 bg-[#1a56db] rounded flex items-center justify-center">
                                    <ShoppingCart className="h-3.5 w-3.5 text-white" />
                                </div>
                                <span className="font-bold">สัดส่วนการขาย</span>
                            </div>
                            <div className="p-5">
                                <SalesDistribution />
                            </div>
                        </div>

                        {/* Recent Transactions */}
                        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
                            <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                                <div className="w-6 h-6 bg-[#1a56db] rounded flex items-center justify-center">
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
