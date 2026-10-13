import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db, users, orders } from "@/lib/db";
import { and, eq, isNull } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";
import { PurchasedItem } from "@/components/PurchasedItem";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

// One undecryptable order (e.g. data written under a key that has since left
// the keyring) must not take down the whole inventory page.
function safeDecrypt(givenData: string | null): string {
    if (!givenData) return "ไม่พบข้อมูล";
    try {
        return decrypt(givenData);
    } catch {
        return "ไม่สามารถถอดรหัสข้อมูลได้ กรุณาติดต่อผู้ดูแลร้าน";
    }
}

export default async function InventoryPage() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) redirect("/login");

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) redirect("/login");

    const orderList = await db.query.orders.findMany({
        where: and(eq(orders.userId, user.id), isNull(orders.deletedAt)),
        with: { product: true },
        orderBy: (t, { desc }) => desc(t.purchasedAt),
    });

    return (
        <div className="space-y-6">
            <PageBreadcrumb
                items={[
                    { label: "แดชบอร์ด", href: "/dashboard" },
                    { label: "สินค้าของฉัน" },
                ]}
            />

            <div>
                <h1 className="text-3xl font-bold leading-tight text-[var(--page-heading)] sm:text-4xl">
                    คลังสินค้าของฉัน
                </h1>
                <p className="mt-2 text-muted-foreground">
                    รายการสินค้าที่คุณซื้อไปแล้ว
                </p>
            </div>

            {orderList.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-center">
                    <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground/40" />
                    <h3 className="mb-2 text-lg font-semibold text-foreground">
                        ยังไม่มีสินค้าในคลัง
                    </h3>
                    <p className="text-muted-foreground">
                        คุณยังไม่ได้ซื้อสินค้าใดๆ ลองไปเลือกดูสินค้าก่อนนะ
                    </p>
                    <Link
                        href="/shop"
                        className="mt-5 inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-medium text-foreground transition-colors duration-300 ease-out hover:border-primary hover:text-primary"
                    >
                        <ShoppingBag className="h-4 w-4" />
                        ไปช้อปปิ้งเลย
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 min-[900px]:grid-cols-2 xl:grid-cols-3 items-start">
                    {orderList.map((order) => (
                        <PurchasedItem
                            key={order.id}
                            orderId={order.id}
                            title={order.productName ?? order.product?.name ?? "สินค้าที่ซื้อแล้ว"}
                            image={order.productImage || order.product?.imageUrl || "/placeholder.jpg"}
                            date={new Date(order.purchasedAt).toLocaleDateString(
                                "th-TH",
                                {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                }
                            )}
                            secretData={safeDecrypt(order.givenData)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
