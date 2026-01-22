import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PurchasedItem } from "@/components/PurchasedItem";
import { Package, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
    // Find test user
    const user = await db.user.findFirst({
        where: { email: "test@gamestore.com" },
    });

    if (!user) {
        return (
            <div className="text-center py-20">
                <p className="text-zinc-600">User not found</p>
            </div>
        );
    }

    // Fetch orders with products
    const orders = await db.order.findMany({
        where: { userId: user.id },
        include: { product: true },
        orderBy: { purchasedAt: "desc" },
    });

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-zinc-900 flex items-center gap-2">
                    <Package className="h-8 w-8 text-indigo-600" />
                    My Inventory
                </h1>
                <p className="text-zinc-500 mt-1">
                    รายการสินค้าที่คุณซื้อไปแล้ว ({orders.length} items)
                </p>
            </div>

            {orders.length === 0 ? (
                /* Empty State */
                <Card className="py-12">
                    <CardContent className="text-center">
                        <ShoppingBag className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
                        <h3 className="text-lg font-semibold text-zinc-700 mb-2">
                            ยังไม่มีสินค้าในคลัง
                        </h3>
                        <p className="text-zinc-500 mb-4">
                            คุณยังไม่ได้ซื้อสินค้าใดๆ ลองไปเลือกดูสินค้าก่อนนะ
                        </p>
                        <Link href="/shop">
                            <Button className="gap-2">
                                <ShoppingBag className="h-4 w-4" />
                                ไปช้อปปิ้งเลย
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                /* Inventory Grid */
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {orders.map(
                        (order) =>
                            order.product && (
                                <PurchasedItem
                                    key={order.id}
                                    title={order.product.name}
                                    image={order.product.imageUrl || "/placeholder.jpg"}
                                    date={new Date(order.purchasedAt).toLocaleDateString(
                                        "th-TH",
                                        {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        }
                                    )}
                                    secretData={order.product.secretData}
                                />
                            )
                    )}
                </div>
            )}
        </div>
    );
}
