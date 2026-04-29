import type { Metadata } from "next";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { ShoppingBag, Package, TrendingUp } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { ShopControls } from "@/components/ShopControls";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { db, products } from "@/lib/db";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { buildPageMetadata } from "@/lib/seo";
import { decrypt } from "@/lib/encryption";
import { getStockCount } from "@/lib/stock";

export const dynamic = "force-dynamic";

type ShopPageProps = Readonly<{
    searchParams: Promise<{ category?: string; sort?: string }>;
}>;

const SHOP_SORTS = ["latest", "featured", "price_asc", "price_desc"] as const;
type ShopSort = typeof SHOP_SORTS[number];

function normalizeShopSort(value?: string): ShopSort {
    return SHOP_SORTS.includes(value as ShopSort) ? value as ShopSort : "latest";
}

export async function generateMetadata({ searchParams }: ShopPageProps): Promise<Metadata> {
    const params = await searchParams;
    const currentCategory = params.category || "all";
    const canonicalParams = new URLSearchParams();

    if (currentCategory !== "all") {
        canonicalParams.set("category", currentCategory);
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
    const currencySettings = await getCurrencySettings();
    const searchParams = await props.searchParams;
    const currentCategory = searchParams.category || "all";
    const currentSort = normalizeShopSort(searchParams.sort);
    const activePrice = sql`COALESCE(${products.discountPrice}, ${products.price})`;

    const availableFilter = eq(products.isSold, false);
    const categoryFilter = currentCategory === "all"
        ? availableFilter
        : and(availableFilter, eq(products.category, currentCategory));

    const productOrder = (() => {
        switch (currentSort) {
            case "featured":
                return [desc(products.isFeatured), asc(products.sortOrder), desc(products.createdAt)];
            case "price_asc":
                return [asc(activePrice), desc(products.createdAt)];
            case "price_desc":
                return [desc(activePrice), desc(products.createdAt)];
            default:
                return [desc(products.createdAt)];
        }
    })();

    const [
        [{ count: totalProductCount }],
        allAvailableProductsForCounts,
        filteredProducts,
    ] = await Promise.all([
        db.select({ count: count() }).from(products),
        db.query.products.findMany({
            where: availableFilter,
            columns: {
                category: true,
                secretData: true,
                stockSeparator: true,
            },
        }),
        db.query.products.findMany({
            where: categoryFilter,
            orderBy: productOrder,
            columns: {
                id: true,
                name: true,
                price: true,
                discountPrice: true,
                imageUrl: true,
                category: true,
                isSold: true,
                currency: true,
                secretData: true,
                stockSeparator: true,
            },
        }),
    ]);

    const categoryCountMap = new Map<string, number>();
    let availableProductCount = 0;
    for (const product of allAvailableProductsForCounts) {
        const stockCount = getStockCount(
            decrypt(product.secretData || ""),
            product.stockSeparator || "newline",
        );

        if (stockCount > 0) {
            availableProductCount += 1;
            categoryCountMap.set(product.category, (categoryCountMap.get(product.category) ?? 0) + 1);
        }
    }

    const categoryCounts = Array.from(categoryCountMap, ([category, categoryCount]) => ({
        category,
        count: categoryCount,
    })).sort((a, b) => a.category.localeCompare(b.category));

    const sellableProducts = filteredProducts
        .map((product) => {
            const stockCount = getStockCount(
                decrypt(product.secretData || ""),
                product.stockSeparator || "newline",
            );

            return {
                ...product,
                stockCount,
            };
        })
        .filter((product) => product.stockCount > 0);

    return (
        <div className="relative left-1/2 w-screen -translate-x-1/2 border-y border-border/50 bg-card/90 px-3 pb-0 pt-4 shadow-xl shadow-primary/10 backdrop-blur-sm sm:left-auto sm:w-auto sm:translate-x-0 sm:border sm:bg-card/90 sm:px-5 sm:py-7 sm:backdrop-blur-sm lg:px-6">
            <PageBreadcrumb items={[{ label: "ร้านค้า" }]} className="mb-4" />

            <div className="mb-7 sm:mb-8">
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

            <Separator className="mb-6 sm:mb-8" />

            <div className="mb-4 px-1 pb-1 sm:pb-2">
                <div className="flex flex-wrap gap-2">
                    <Link
                        href={`/shop?category=all&sort=${currentSort}`}
                        scroll={false}
                            className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-all duration-150 ${currentCategory === "all"
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
                            className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-all duration-150 ${currentCategory === category.category
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                                }`}
                        >
                            {category.category} ({Number(category.count)})
                        </Link>
                    ))}
                </div>
            </div>

            <div className="mb-6 w-full">
                <ShopControls currentSort={currentSort} />
            </div>

            {sellableProducts.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {sellableProducts.map((product, index) => (
                        <ProductCard
                            key={product.id}
                            id={product.id}
                            image={product.imageUrl || "/placeholder.jpg"}
                            title={product.name}
                            price={Number(product.price)}
                            discountPrice={
                                product.discountPrice === null || product.discountPrice === undefined
                                    ? null
                                    : Number(product.discountPrice)
                            }
                            currency={product.currency}
                            category={product.category}
                            isSold={Boolean(product.isSold)}
                            stockCount={product.stockCount}
                            index={index}
                            currencySettings={currencySettings}
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
