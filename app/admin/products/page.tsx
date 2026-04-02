import Link from "next/link";
import { db } from "@/lib/db";
import { runAutoDelete } from "@/lib/autoDelete";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, Trash2 } from "lucide-react";
import { ProductTable } from "@/components/admin/ProductTable";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
    await runAutoDelete();

    const productList = await db.query.products.findMany({
        orderBy: (t, { desc }) => desc(t.createdAt),
        columns: {
            id: true,
            name: true,
            price: true,
            imageUrl: true,
            category: true,
            isSold: true,
            isFeatured: true,
            autoDeleteAfterSale: true,
        },
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
                <div className="flex items-center gap-2 flex-wrap">
                    <Link href="/admin/products/trash">
                        <Button variant="outline" size="sm" className="gap-2 border-orange-300 text-orange-600 hover:bg-orange-50">
                            <Trash2 className="h-4 w-4" />
                            ถังขยะสินค้า
                        </Button>
                    </Link>
                    <Link href="/admin/products/new">
                        <Button className="gap-2 w-full sm:w-auto">
                            <Plus className="h-4 w-4" />
                            เพิ่มสินค้าใหม่
                        </Button>
                    </Link>
                </div>
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
                            products={productList.map((p) => ({
                                id: p.id,
                                name: p.name,
                                price: Number(p.price),
                                imageUrl: p.imageUrl,
                                category: p.category,
                                isSold: p.isSold,
                                isFeatured: p.isFeatured,
                                stockCount: p.isSold ? 0 : undefined,
                                autoDeleteAfterSale: p.autoDeleteAfterSale,
                            }))}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
