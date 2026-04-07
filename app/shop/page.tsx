import type { Metadata } from "next";
import { and, asc, count, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { ShoppingBag, Package, TrendingUp } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { ShopControls } from "@/components/ShopControls";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { db, products } from "@/lib/db";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type ShopPageProps = Readonly<{
    searchParams: Promise<{ category?: string; sort?: string; page?: string }>;
}>;

export async function generateMetadata({ searchParams }: ShopPageProps): Promise<Metadata> {
    const params = await searchParams;
    const currentCategory = params.category || "all";
    const currentPage = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
    const canonicalParams = new URLSearchParams();

    if (currentCategory !== "all") {
        canonicalParams.set("category", currentCategory);
    }
    if (currentPage > 1) {
        canonicalParams.set("page", String(currentPage));
    }

    const path = canonicalParams.size > 0 ? `/shop?${canonicalParams.toString()}` : "/shop";
    const title = currentCategory === "all" ? "ร้านค้า" : `ร้านค้า ${currentCategory}`;
    const description = currentCategory === "all"
        ? "เลือกซื้อไอดีเกมและสินค้าในร้าน พร้อมกรองหมวดหมู่และค้นหาสินค้าที่พร้อมขาย"
        : `เลือกซื้อสินค้าในหมวด ${currentCategory} พร้อมรายการที่อัปเดตล่าสุดจากร้านค้า`;

    return buildPageMetadata({
        title,
        description,
        path,
    });
}

export default async function ShopPage(props: ShopPageProps) {
    const searchParams = await props.searchParams;
    const currentCategory = searchParams.category || "all";
    const currentSort = searchParams.sort || "latest";
    const currentPage = Math.max(1, Number.parseInt(searchParams.page || "1", 10) || 1);
    const ITEMS_PER_PAGE = 12;

    const availableFilter = eq(products.isSold, false);
    const categoryFilter = currentCategory === "all"
        ? availableFilter
        : and(availableFilter, eq(products.category, currentCategory));

    const productOrder = (() => {
        switch (currentSort) {
            case "price_asc":
                return [asc(products.price), desc(products.createdAt)];
            case "price_desc":
                return [desc(products.price), desc(products.createdAt)];
            case "best_selling":
                return [desc(products.createdAt)];
            default:
                return [desc(products.createdAt)];
        }
    })();

    const [
        [{ count: totalProductCount }],
        [{ count: availableProductCount }],
        [{ count: filteredProductCount = 0 } = { count: 0 }],
        categoryCounts,
    ] = await Promise.all([
        db.select({ count: count() }).from(products),
        db.select({ count: count() }).from(products).where(availableFilter),
        db.select({ count: count() }).from(products).where(categoryFilter),
        db.select({
            category: products.category,
            count: count(),
        })
            .from(products)
            .where(availableFilter)
            .groupBy(products.category)
            .orderBy(asc(products.category)),
    ]);

    const totalItems = Number(filteredProductCount);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
    const validPage = Math.min(currentPage, totalPages);

    const paginatedProducts = await db.query.products.findMany({
        where: categoryFilter,
        orderBy: productOrder,
        limit: ITEMS_PER_PAGE,
        offset: (validPage - 1) * ITEMS_PER_PAGE,
        columns: {
            id: true,
            name: true,
            price: true,
            imageUrl: true,
            category: true,
            isSold: true,
        },
    });

    return (
        <div className="border border-border/50 bg-card/90 px-3 py-5 shadow-xl shadow-primary/10 backdrop-blur-sm sm:px-5 sm:py-7 lg:px-6">
            <PageBreadcrumb items={[{ label: "ร้านค้า" }]} className="mb-4" />

            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <ShoppingBag className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">ร้านค้า</h1>
                </div>
                <p className="text-muted-foreground">
                    ค้นหาและซื้อไอดีเกมที่คุณต้องการ
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Badge variant="secondary" className="gap-1">
                        <Package className="h-3 w-3" />
                        ทั้งหมด {Number(totalProductCount)} รายการ
                    </Badge>
                    <Badge variant="default" className="gap-1 bg-green-600">
                        <TrendingUp className="h-3 w-3" />
                        พร้อมขาย {Number(availableProductCount)} รายการ
                    </Badge>
                </div>
            </div>

            <Separator className="mb-8" />

            <div className="-mx-1 mb-4 overflow-x-auto px-1 pb-2">
                <div className="flex min-w-max gap-2">
                    <Link
                        href={`/shop?category=all&sort=${currentSort}`}
                        scroll={false}
                        className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-150 h-8 px-4 rounded-full flex-shrink-0 ${currentCategory === "all"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                            }`}
                    >
                        ทั้งหมด ({Number(availableProductCount)})
                    </Link>
                    {categoryCounts.map((category) => (
                        <Link
                            key={category.category}
                            href={`/shop?category=${encodeURIComponent(category.category)}&sort=${currentSort}`}
                            scroll={false}
                            className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-150 h-8 px-4 rounded-full flex-shrink-0 ${currentCategory === category.category
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                                }`}
                        >
                            {category.category} ({Number(category.count)})
                        </Link>
                    ))}
                </div>
            </div>

            <div className="w-full mb-6">
                <ShopControls
                    currentPage={validPage}
                    totalPages={totalPages}
                    currentSort={currentSort}
                />
            </div>

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