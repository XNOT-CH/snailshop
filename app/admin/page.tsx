import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CreditCard, Package, Users } from "lucide-react";
import { Overview } from "@/components/admin/Overview";
import { RecentSales } from "@/components/admin/RecentSales";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
    // Fetch real stats from database
    const [ordersData, productsCount, usersCount] = await Promise.all([
        db.order.aggregate({
            _sum: { totalPrice: true },
            _count: true,
        }),
        db.product.count(),
        db.user.count(),
    ]);

    const totalRevenue = Number(ordersData._sum.totalPrice || 0);
    const salesCount = ordersData._count;

    const stats = [
        {
            title: "รายได้ทั้งหมด",
            value: `฿${totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            description: "ยอดขายรวม",
        },
        {
            title: "ยอดขาย",
            value: `+${salesCount}`,
            icon: CreditCard,
            description: "คำสั่งซื้อทั้งหมด",
        },
        {
            title: "สินค้า",
            value: `${productsCount}`,
            icon: Package,
            description: "ในระบบทั้งหมด",
        },
        {
            title: "ผู้ใช้งาน",
            value: `+${usersCount}`,
            icon: Users,
            description: "สมาชิกทั้งหมด",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">แดชบอร์ด</h1>
                <p className="text-muted-foreground">
                    ภาพรวมข้อมูลธุรกิจของคุณ
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.title}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {stat.title}
                                </CardTitle>
                                <Icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                                <p className="text-xs text-muted-foreground">
                                    {stat.description}
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Overview Chart - Takes 4 columns */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>ภาพรวม</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <Overview />
                    </CardContent>
                </Card>

                {/* Recent Sales - Takes 3 columns */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>ยอดขายล่าสุด</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            คุณมี {salesCount} รายการขายในเดือนนี้
                        </p>
                    </CardHeader>
                    <CardContent>
                        <RecentSales />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
