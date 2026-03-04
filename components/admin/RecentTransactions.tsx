import { db, orders } from "@/lib/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export async function RecentTransactions() {
    const orderList = await db.query.orders.findMany({
        limit: 5,
        orderBy: (t, { desc }) => desc(t.purchasedAt),
        with: {
            user: { columns: { username: true } },
            product: { columns: { name: true } },
        },
    });

    if (orderList.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">ยังไม่มีรายการ</p>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-4">
                <h3 className="text-lg font-semibold">รายการล่าสุด</h3>
                <p className="text-sm text-muted-foreground">{orderList.length} คำสั่งซื้อล่าสุด</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left py-3 px-2 font-medium text-muted-foreground">ผู้ใช้</th>
                            <th className="text-left py-3 px-2 font-medium text-muted-foreground">สินค้า</th>
                            <th className="text-right py-3 px-2 font-medium text-muted-foreground">จำนวนเงิน</th>
                            <th className="text-left py-3 px-2 font-medium text-muted-foreground">สถานะ</th>
                            <th className="text-right py-3 px-2 font-medium text-muted-foreground">วันที่</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orderList.map((order) => {
                            const statusColor =
                                order.status === "COMPLETED"
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                                    : order.status === "PENDING"
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                                        : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400";
                            return (
                                <tr key={order.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                                    <td className="py-3 px-2"><span className="font-medium">{order.user.username}</span></td>
                                    <td className="py-3 px-2 text-muted-foreground max-w-[150px] truncate">{order.product?.name || "—"}</td>
                                    <td className="py-3 px-2 text-right font-medium tabular-nums">฿{Number(order.totalPrice).toLocaleString()}</td>
                                    <td className="py-3 px-2"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{order.status}</span></td>
                                    <td className="py-3 px-2 text-right text-muted-foreground text-xs tabular-nums">
                                        {new Date(order.purchasedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
