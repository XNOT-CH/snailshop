import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db, users, orders } from "@/lib/db";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PurchasedItem } from "@/components/PurchasedItem";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Package, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;
    if (!userId) redirect("/login");

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) redirect("/login");

    const orderList = await db.query.orders.findMany({
        where: eq(orders.userId, user.id),
        with: { product: true },
        orderBy: (t, { desc }) => desc(t.purchasedAt),
    });

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <PageBreadcrumb
                items={[
                    { label: "แดชบอร์ด", href: "/dashboard" },
                    { label: "สินค้าของฉัน" },
                ]}
            />

            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Package className="h-6 w-6 text-primary" />
                    คลังสินค้าของฉัน
                </h1>
                <p className="text-muted-foreground mt-1">
                    รายการสินค้าที่คุณซื้อไปแล้ว ({orderList.length} รายการ)
                </p>
            </div>

            {orderList.length === 0 ? (
                /* Empty State */
                <Card className="py-12">
                    <CardContent className="text-center">
                        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            ยังไม่มีสินค้าในคลัง
                        </h3>
                        <p className="text-muted-foreground mb-4">
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
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {orderList.map(
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
                                    secretData={order.givenData ? decrypt(order.givenData) : "ไม่พบข้อมูล"}
                                />
                            )
                    )}
                </div>
            )}
        </div>
    );
}

