import { db } from "@/lib/db";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export async function RecentSales() {
    const orderList = await db.query.orders.findMany({
        limit: 5,
        orderBy: (t, { desc }) => desc(t.purchasedAt),
        with: { user: { columns: { username: true, email: true } } },
    });

    if (orderList.length === 0) {
        return <div className="text-center py-8 text-zinc-500">No sales yet</div>;
    }

    return (
        <div className="space-y-8">
            {orderList.map((order) => {
                const initials = order.user.username.split("_").map((w) => w.charAt(0).toUpperCase()).join("").slice(0, 2);
                return (
                    <div key={order.id} className="flex items-center">
                        <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-indigo-100 text-indigo-600 text-sm font-medium">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="ml-4 space-y-1">
                            <p className="text-sm font-medium leading-none">{order.user.username}</p>
                            <p className="text-sm text-muted-foreground">{order.user.email || "No email"}</p>
                        </div>
                        <div className="ml-auto font-medium text-green-600">+฿{Number(order.totalPrice).toLocaleString()}</div>
                    </div>
                );
            })}
        </div>
    );
}
