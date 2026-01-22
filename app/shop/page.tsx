import { ProductCard } from "@/components/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/db";
import { ShoppingBag, Package, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
    // Fetch all products
    const products = await db.product.findMany({
        orderBy: { createdAt: "desc" },
    });

    // Get unique categories
    const categories = [...new Set(products.map((p) => p.category))];

    // Filter products
    const availableProducts = products.filter((p) => !p.isSold);

    return (
        <div className="py-8 bg-white/90 backdrop-blur-sm rounded-2xl px-6 shadow-xl shadow-blue-200/50 animate-page-enter">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <ShoppingBag className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold text-foreground">ร้านค้า</h1>
                </div>
                <p className="text-muted-foreground">
                    ค้นหาและซื้อไอดีเกมที่คุณต้องการ
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 mt-4">
                    <Badge variant="secondary" className="gap-1">
                        <Package className="h-3 w-3" />
                        ทั้งหมด {products.length} รายการ
                    </Badge>
                    <Badge variant="default" className="gap-1 bg-green-600">
                        <TrendingUp className="h-3 w-3" />
                        พร้อมขาย {availableProducts.length} รายการ
                    </Badge>
                </div>
            </div>

            <Separator className="mb-8" />

            {/* Category Tabs */}
            <Tabs defaultValue="all" className="w-full">
                <TabsList className="mb-6 flex-wrap h-auto gap-2 bg-transparent p-0">
                    <TabsTrigger
                        value="all"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
                    >
                        ทั้งหมด ({availableProducts.length})
                    </TabsTrigger>
                    {categories.map((category) => {
                        const count = availableProducts.filter((p) => p.category === category).length;
                        return (
                            <TabsTrigger
                                key={category}
                                value={category}
                                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
                            >
                                {category} ({count})
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                {/* All Products */}
                <TabsContent value="all" className="mt-0">
                    {availableProducts.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {availableProducts.map((product, index) => (
                                <ProductCard
                                    key={product.id}
                                    id={product.id}
                                    image={product.imageUrl || "/placeholder.jpg"}
                                    title={product.name}
                                    price={Number(product.price)}
                                    category={product.category}
                                    isSold={Boolean(product.isSold)}
                                    index={index}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Category Filtered Products */}
                {categories.map((category) => {
                    const categoryProducts = availableProducts.filter(
                        (p) => p.category === category
                    );
                    return (
                        <TabsContent key={category} value={category} className="mt-0">
                            {categoryProducts.length === 0 ? (
                                <EmptyState />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {categoryProducts.map((product, index) => (
                                        <ProductCard
                                            key={product.id}
                                            id={product.id}
                                            image={product.imageUrl || "/placeholder.jpg"}
                                            title={product.name}
                                            price={Number(product.price)}
                                            category={product.category}
                                            isSold={Boolean(product.isSold)}
                                            index={index}
                                        />
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    );
                })}
            </Tabs>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="text-center py-20 rounded-2xl bg-card border border-border">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg">ไม่มีสินค้าในหมวดนี้</p>
        </div>
    );
}
