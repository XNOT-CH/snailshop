import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";
import { ProductTable } from "@/components/admin/ProductTable";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
    // Fetch all products from database
    const products = await db.product.findMany({
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 flex items-center gap-2">
                        จัดการสินค้า <span className="text-3xl">📦</span>
                    </h1>
                    <p className="text-zinc-500">
                        จัดการสินค้าเกมของคุณ
                    </p>
                </div>
                <Link href="/admin/products/new">
                    <Button className="gap-2">
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
                        สินค้าทั้งหมด ({products.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {products.length === 0 ? (
                        <div className="py-12 text-center">
                            <Package className="mx-auto h-12 w-12 text-zinc-300" />
                            <p className="mt-4 text-zinc-500">ยังไม่มีสินค้า</p>
                            <Link href="/admin/products/new">
                                <Button className="mt-4 gap-2">
                                    <Plus className="h-4 w-4" />
                                    เพิ่มสินค้าแรกของคุณ
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <ProductTable
                            products={products.map((p) => ({
                                id: p.id,
                                name: p.name,
                                price: Number(p.price),
                                imageUrl: p.imageUrl,
                                category: p.category,
                                isSold: p.isSold,
                                isFeatured: p.isFeatured,
                            }))}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
