import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { runAutoDelete } from "@/lib/autoDelete";
import { getStockCount } from "@/lib/stock";
import { decrypt } from "@/lib/encryption";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, Trash2 } from "lucide-react";
import ProductTable from "@/components/admin/ProductTable";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
    const access = await requirePermission(PERMISSIONS.PRODUCT_VIEW);
    if (!access.success) {
        redirect("/admin?error=คุณไม่มีสิทธิ์ดูสินค้า");
    }
    const permissionSet = new Set(access.permissions ?? []);

    await runAutoDelete();

    const productList = await db.query.products.findMany({
        orderBy: (t, { desc }) => desc(t.createdAt),
        columns: {
            id: true,
            name: true,
            price: true,
            discountPrice: true,
            imageUrl: true,
            category: true,
            secretData: true,
            stockSeparator: true,
            isSold: true,
            isFeatured: true,
            autoDeleteAfterSale: true,
        },
    });

    const productsWithStock = productList.map((product) => {
        let stockCount = 0;

        if (!product.isSold) {
            try {
                stockCount = getStockCount(
                    decrypt(product.secretData ?? ""),
                    product.stockSeparator ?? "newline"
                );
            } catch {
                stockCount = 0;
            }
        }

        return {
            ...product,
            stockCount,
        };
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
                    {permissionSet.has(PERMISSIONS.PRODUCT_CREATE) ? (
                        <Link href="/admin/products/new">
                            <Button className="gap-2 w-full sm:w-auto">
                                <Plus className="h-4 w-4" />
                                เพิ่มสินค้าใหม่
                            </Button>
                        </Link>
                    ) : null}
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
                            {permissionSet.has(PERMISSIONS.PRODUCT_CREATE) ? (
                                <Link href="/admin/products/new">
                                    <Button className="mt-4 gap-2">
                                        <Plus className="h-4 w-4" />
                                        เพิ่มสินค้าแรกของคุณ
                                    </Button>
                                </Link>
                            ) : null}
                        </div>
                    ) : (
                        <ProductTable
                            products={productsWithStock.map((p) => ({
                                id: p.id,
                                name: p.name,
                                price: Number(p.price),
                                discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
                                imageUrl: p.imageUrl,
                                category: p.category,
                                isSold: p.isSold,
                                isFeatured: p.isFeatured,
                                stockCount: p.stockCount,
                                autoDeleteAfterSale: p.autoDeleteAfterSale,
                            }))}
                            canCreate={permissionSet.has(PERMISSIONS.PRODUCT_CREATE)}
                            canEdit={permissionSet.has(PERMISSIONS.PRODUCT_EDIT)}
                            canDelete={permissionSet.has(PERMISSIONS.PRODUCT_DELETE)}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
