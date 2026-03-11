import { ProductCard } from "@/components/ProductCard";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { ShopControls } from "@/components/ShopControls";
import { db } from "@/lib/db";
import { ShoppingBag, Package, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ShopPage(props: {
    searchParams: Promise<{ category?: string; sort?: string; page?: string }>;
}) {
    const searchParams = await props.searchParams;
    const currentCategory = searchParams.category || "all";
    const currentSort = searchParams.sort || "latest";
    const currentPage = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
    const ITEMS_PER_PAGE = 12;

    const allProducts = await db.query.products.findMany();

    // Get unique categories (before any filtering)
    const categories = [...new Set(allProducts.map((p) => p.category))];

    // Filter available products
    let availableProducts = allProducts.filter((p) => !p.isSold);

    // Apply Sorting
    availableProducts.sort((a, b) => {
        if (currentSort === "price_asc") {
            return Number(a.price) - Number(b.price);
        } else if (currentSort === "price_desc") {
            return Number(b.price) - Number(a.price);
        } else if (currentSort === "best_selling") {
            // Since we don't have a direct 'sales' count on the product model easily accessible here without a join,
            // we'll fallback to latest for now, or keep it as a placeholder.
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else {
            // latest
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
    });

    // We don't filter by category here for the whole `availableProducts` array because
    // the Tabs component handles category filtering on the client side conceptually
    // However, for pagination, we MIGHT need to know the active category.
    // If the active category is "all", we paginate all. If a specific category, we paginate that subset.

    // Apply Category Filter for Pagination Logic
    const categoryProducts = currentCategory === "all"
        ? availableProducts
        : availableProducts.filter(p => p.category === currentCategory);

    // Calculate pagination info
    const totalItems = categoryProducts.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
    const validPage = Math.min(currentPage, totalPages);

    // Apply Pagination slice
    const paginatedProducts = categoryProducts.slice((validPage - 1) * ITEMS_PER_PAGE, validPage * ITEMS_PER_PAGE);

    return (
        <div className="py-6 sm:py-8 bg-card/90 backdrop-blur-sm rounded-2xl px-4 sm:px-6 shadow-xl shadow-primary/10">
            {/* Breadcrumb */}
            <PageBreadcrumb items={[{ label: "ร้านค้า" }]} className="mb-4" />

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
                        ทั้งหมด {allProducts.length} รายการ
                    </Badge>
                    <Badge variant="default" className="gap-1 bg-green-600">
                        <TrendingUp className="h-3 w-3" />
                        พร้อมขาย {availableProducts.length} รายการ
                    </Badge>
                </div>
            </div>

            <Separator className="mb-8" />

            {/* Category Filters & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex flex-wrap gap-2">
                    <Link
                        href={`/shop?category=all&sort=${currentSort}`}
                        scroll={false}
                        className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 flex-shrink-0 rounded-full ${currentCategory === 'all' ? 'bg-[#2563eb] text-white shadow-sm' : 'text-foreground hover:text-primary'}`}
                    >
                        ทั้งหมด ({availableProducts.length})
                    </Link>
                    {categories
                        .filter(category => availableProducts.some(p => p.category === category))
                        .map((category) => {
                            const count = availableProducts.filter((p) => p.category === category).length;
                            return (
                                <Link
                                    key={category}
                                    href={`/shop?category=${encodeURIComponent(category)}&sort=${currentSort}`}
                                    scroll={false}
                                    className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 flex-shrink-0 rounded-full ${currentCategory === category ? 'bg-[#2563eb] text-white shadow-sm' : 'text-foreground hover:text-primary'}`}
                                >
                                    {category} ({count})
                                </Link>
                            );
                        })}
                </div>

                <div className="flex-shrink-0">
                    <ShopControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        currentSort={currentSort}
                    />
                </div>
            </div>

            {/* Products Grid */}
            {paginatedProducts.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {paginatedProducts.map((product, index) => (
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
