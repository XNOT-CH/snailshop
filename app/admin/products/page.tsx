import Link from "next/link";
import { db, products } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";
import { ProductTable } from "@/components/admin/ProductTable";
import { decrypt } from "@/lib/encryption";
import { getStockCount } from "@/lib/stock";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
    const productList = await db.query.products.findMany({
        orderBy: (t, { desc }) => desc(t.createdAt),
    });

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                        จัดการสินค้า <span className="text-2xl sm:text-3xl">📦</span>
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base">
                        จัดการสินค้าเกมของคุณ
                    </p>
                </div>
                <Link href="/admin/products/new">
                    <Button className="gap-2 w-full sm:w-auto">
                        <Plus className="h-4 w-4" />
                        เพิ่มสินค้าใหม่
                    </Button>
                </Link>
            </div>

            {/* Product Table Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        สินค้าทั้งหมด ({productList.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {productList.length === 0 ? (
                        <div className="py-12 text-center">
                            <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
                            <p className="mt-4 text-muted-foreground">ยังไม่มีสินค้า</p>
                            <Link href="/admin/products/new">
                                <Button className="mt-4 gap-2">
                                    <Plus className="h-4 w-4" />
                                    เพิ่มสินค้าแรกของคุณ
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <ProductTable
                            products={productList.map((p) => {
                                let stockCount = 0;
                                try {
                                    const decrypted = decrypt(p.secretData || "");
                                    const sep = (p as unknown as { stockSeparator: string }).stockSeparator || "newline";
                                    stockCount = p.isSold ? 0 : getStockCount(decrypted, sep);
                                } catch { }
                                return {
                                    id: p.id,
                                    name: p.name,
                                    price: Number(p.price),
                                    imageUrl: p.imageUrl,
                                    category: p.category,
                                    isSold: p.isSold,
                                    isFeatured: p.isFeatured,
                                    stockCount,
                                };
                            })}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
