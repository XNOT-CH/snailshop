import type { Metadata } from "next";
import { and, asc, count, desc, eq, gt, isNull, sql } from "drizzle-orm";
import Link from "next/link";
import { ShoppingBag, Package, TrendingUp } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { ShopControls } from "@/components/ShopControls";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { db, products } from "@/lib/db";
import { getSoldCountMap } from "@/lib/features/orders/queries";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { buildPageMetadata } from "@/lib/seo";
import { decrypt } from "@/lib/encryption";
import { getStockCount } from "@/lib/stock";
import { getMaintenanceState } from "@/lib/maintenanceMode";

export const dynamic = "force-dynamic";

type ShopPageProps = Readonly<{
    searchParams: Promise<{ category?: string; page?: string; sort?: string }>;
}>;

const SHOP_SORTS = ["latest", "featured", "price_asc", "price_desc"] as const;
type ShopSort = typeof SHOP_SORTS[number];
const PRODUCTS_PER_PAGE = 20;

type ShopProductRow = {
    id: string;
    name: string;
    price: string | number;
    discountPrice: string | number | null;
    imageUrl: string | null;
    category: string;
    isSold: boolean;
    currency: string;
    stockCount: number | null;
    isFeatured: boolean;
    sortOrder: number;
    createdAt: Date | string;
};

function normalizeShopSort(value?: string): ShopSort {
    return SHOP_SORTS.includes(value as ShopSort) ? value as ShopSort : "latest";
}

function normalizePage(value?: string) {
    const page = Number.parseInt(value ?? "", 10);
    return Number.isFinite(page) && page > 0 ? page : 1;
}

function getActivePriceValue(product: Pick<ShopProductRow, "discountPrice" | "price">) {
    return Number(product.discountPrice ?? product.price);
}

function getCreatedTime(value: Date | string) {
    return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function compareShopProducts(a: ShopProductRow, b: ShopProductRow, sort: ShopSort) {
    switch (sort) {
        case "featured":
            return Number(b.isFeatured) - Number(a.isFeatured)
                || a.sortOrder - b.sortOrder
                || getCreatedTime(b.createdAt) - getCreatedTime(a.createdAt);
        case "price_asc":
            return getActivePriceValue(a) - getActivePriceValue(b)
                || getCreatedTime(b.createdAt) - getCreatedTime(a.createdAt);
        case "price_desc":
            return getActivePriceValue(b) - getActivePriceValue(a)
                || getCreatedTime(b.createdAt) - getCreatedTime(a.createdAt);
        default:
            return getCreatedTime(b.createdAt) - getCreatedTime(a.createdAt);
    }
}

function resolveStockCount(product: ShopProductRow & { secretData?: string | null; stockSeparator?: string | null }) {
    if (typeof product.stockCount === "number") {
        return product.stockCount;
    }

    try {
        return getStockCount(decrypt(product.secretData || ""), product.stockSeparator || "newline");
    } catch {
        return 0;
    }
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
    const purchaseMaintenance = getMaintenanceState("purchase");
    const searchParams = await props.searchParams;
    const currentCategory = searchParams.category || "all";
    const currentSort = normalizeShopSort(searchParams.sort);
    const requestedPage = normalizePage(searchParams.page);
    const activePrice = sql`COALESCE(${products.discountPrice}, ${products.price})`;
    const notDeleted = isNull(products.deletedAt);
    const dbSellableFilter = and(notDeleted, eq(products.isSold, false), gt(products.stockCount, 0));
    const legacyStockFilter = and(notDeleted, eq(products.isSold, false), isNull(products.stockCount));
    const categoryDbSellableFilter = currentCategory === "all"
        ? dbSellableFilter
        : and(dbSellableFilter, eq(products.category, currentCategory));
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
        dbCategoryCounts,
        legacyProductsForCounts,
        [{ count: dbSellableProductCount }],
    ] = await Promise.all([
        db.select({ count: count() }).from(products).where(notDeleted),
        db.select({
            category: products.category,
            categoryCount: count(),
        })
            .from(products)
            .where(dbSellableFilter)
            .groupBy(products.category),
        db.query.products.findMany({
            where: legacyStockFilter,
            columns: {
                category: true,
                secretData: true,
                stockSeparator: true,
                stockCount: true,
                id: true,
                name: true,
                price: true,
                discountPrice: true,
                imageUrl: true,
                isSold: true,
                currency: true,
                isFeatured: true,
                sortOrder: true,
                createdAt: true,
            },
        }),
        db.select({ count: count() }).from(products).where(categoryDbSellableFilter),
    ]);

    const categoryCountMap = new Map<string, number>(
        dbCategoryCounts.map((row) => [row.category, Number(row.categoryCount)]),
    );

    const legacyProductsWithStock = legacyProductsForCounts.map((product) => ({
        ...product,
        stockCount: resolveStockCount(product),
    }));

    for (const product of legacyProductsWithStock) {
        const stockCount = product.stockCount;
        if (stockCount > 0) {
            categoryCountMap.set(product.category, (categoryCountMap.get(product.category) ?? 0) + 1);
        }
    }

    const availableProductCount = Array.from(categoryCountMap.values()).reduce((sum, value) => sum + value, 0);
    const categoryCounts = Array.from(categoryCountMap, ([category, categoryCount]) => ({
        category,
        count: categoryCount,
    })).sort((a, b) => a.category.localeCompare(b.category));

    const legacySellableProducts = legacyProductsWithStock
        .filter((product) => product.stockCount > 0)
        .filter((product) => currentCategory === "all" || product.category === currentCategory);
    const sellableProductCount = Number(dbSellableProductCount) + legacySellableProducts.length;
    const pageCount = Math.max(1, Math.ceil(sellableProductCount / PRODUCTS_PER_PAGE));
    const currentPage = Math.min(requestedPage, pageCount);
    const offset = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const dbVisibleProducts = await db.query.products.findMany({
        where: categoryDbSellableFilter,
        orderBy: productOrder,
        limit: legacySellableProducts.length > 0 ? undefined : PRODUCTS_PER_PAGE,
        offset: legacySellableProducts.length > 0 ? undefined : offset,
        columns: {
            id: true,
            name: true,
            price: true,
            discountPrice: true,
            imageUrl: true,
            category: true,
            isSold: true,
            currency: true,
            stockCount: true,
            isFeatured: true,
            sortOrder: true,
            createdAt: true,
        },
    });
    const visibleProducts = legacySellableProducts.length > 0
        ? [...dbVisibleProducts, ...legacySellableProducts]
            .sort((a, b) => compareShopProducts(a, b, currentSort))
            .slice(offset, offset + PRODUCTS_PER_PAGE)
        : dbVisibleProducts;
    const soldCountMap = await getSoldCountMap(visibleProducts.map((product) => product.id));
    const pageHref = (page: number) => {
        const params = new URLSearchParams();
        params.set("category", currentCategory);
        params.set("sort", currentSort);
        if (page > 1) {
            params.set("page", String(page));
        }

        return `/shop?${params.toString()}`;
    };

    return (
        <div className="relative left-1/2 w-screen -translate-x-1/2 border-y border-border/50 bg-card/95 px-3 pb-0 pt-4 shadow-xl shadow-primary/10 sm:left-auto sm:w-auto sm:translate-x-0 sm:border sm:px-5 sm:py-7 lg:px-6">
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
                        prefetch={false}
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
                            prefetch={false}
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

            {sellableProductCount === 0 ? (
                <EmptyState />
            ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {visibleProducts.map((product, index) => (
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
                            stockCount={product.stockCount ?? undefined}
                            soldCount={soldCountMap.get(product.id) ?? 0}
                            index={index}
                            priorityImage={index < 4}
                            currencySettings={currencySettings}
                            initialPurchaseMaintenance={purchaseMaintenance}
                        />
                    ))}
                </div>
            )}
            {pageCount > 1 && (
                <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="แบ่งหน้าสินค้า">
                    <Link
                        href={pageHref(Math.max(1, currentPage - 1))}
                        prefetch={false}
                        scroll={false}
                        aria-disabled={currentPage === 1}
                        className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors ${
                            currentPage === 1
                                ? "pointer-events-none bg-muted/60 text-muted-foreground/50"
                                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        }`}
                    >
                        ก่อนหน้า
                    </Link>
                    <span className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground">
                        หน้า {currentPage} / {pageCount}
                    </span>
                    <Link
                        href={pageHref(Math.min(pageCount, currentPage + 1))}
                        prefetch={false}
                        scroll={false}
                        aria-disabled={currentPage === pageCount}
                        className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors ${
                            currentPage === pageCount
                                ? "pointer-events-none bg-muted/60 text-muted-foreground/50"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                    >
                        ถัดไป
                    </Link>
                </nav>
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
