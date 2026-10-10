import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { HomeHero } from "@/components/HomeHero";
import { HomeProductTabs } from "@/components/HomeProductTabs";
import { NewsSection } from "@/components/NewsSection";
import { WelcomeRedirect } from "@/components/WelcomeRedirect";
import { db } from "@/lib/db";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { buildPageMetadata, DEFAULT_SITE_DESCRIPTION, resolveSiteName } from "@/lib/seo";
import { cacheOrFetch, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { getSoldCountMap } from "@/lib/features/orders/queries";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { products, newsArticles, orders, users } from "@/lib/db";
import { themeClasses } from "@/lib/theme";
import { and, asc, count, desc, eq, gt, isNotNull, isNull, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

const HOMEPAGE_PRODUCT_LIMIT = 12;
const HOMEPAGE_CAROUSEL_PRODUCT_LIMIT = 12;
const HOMEPAGE_GRID_PRODUCT_LIMIT = 10;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return buildPageMetadata({
    title: "ร้านขายไอดีเกม",
    description: settings?.heroDescription?.trim() || DEFAULT_SITE_DESCRIPTION,
    path: "/",
    image: settings?.ogImageUrl || settings?.bannerImage1 || settings?.logoUrl,
    siteName: settings?.heroTitle,
  });
}

function toSerializableDate(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

export default async function HomePage() {
  const [siteSettings, currencySettings, featuredProducts, saleProducts, news] = await Promise.all([
    getSiteSettings(),
    getCurrencySettings(),
    cacheOrFetch(
      CACHE_KEYS.FEATURED_PRODUCTS,
      async () => db.select({
        id: products.id,
        name: products.name,
        price: products.price,
        discountPrice: products.discountPrice,
        currency: products.currency,
        imageUrl: products.imageUrl,
        category: products.category,
        isSold: products.isSold,
      }).from(products)
        .where(and(
          isNull(products.deletedAt),
          eq(products.isFeatured, true),
          eq(products.isSold, false),
          or(gt(products.stockCount, 0), isNull(products.stockCount)),
        ))
        .orderBy(asc(products.isSold), asc(products.sortOrder), desc(products.createdAt))
        .limit(HOMEPAGE_CAROUSEL_PRODUCT_LIMIT),
      CACHE_TTL.MEDIUM
    ),
    cacheOrFetch(
      CACHE_KEYS.SALE_PRODUCTS,
      async () => {
        const result = await db.select({
          id: products.id,
          name: products.name,
          price: products.price,
          discountPrice: products.discountPrice,
          currency: products.currency,
          imageUrl: products.imageUrl,
          category: products.category,
          isSold: products.isSold,
        }).from(products)
          .where(and(
            isNull(products.deletedAt),
            isNotNull(products.discountPrice),
            eq(products.isSold, false),
            or(gt(products.stockCount, 0), isNull(products.stockCount)),
          ))
          .orderBy(asc(products.isSold), desc(products.createdAt))
          .limit(HOMEPAGE_CAROUSEL_PRODUCT_LIMIT);

        return result.filter(
          (product) => product.discountPrice && Number(product.discountPrice) < Number(product.price)
        );
      },
      CACHE_TTL.MEDIUM
    ),
    cacheOrFetch(
      CACHE_KEYS.NEWS_ARTICLES,
      async () => db.query.newsArticles.findMany({
        where: eq(newsArticles.isActive, true),
        orderBy: (t, { asc: orderAsc, desc: orderDesc }) => [orderAsc(t.sortOrder), orderDesc(t.createdAt)],
        limit: 6,
      }),
      CACHE_TTL.MEDIUM
    ),
  ]);
  const showAllProducts = siteSettings?.showAllProducts ?? true;
  const siteName = resolveSiteName(siteSettings?.heroTitle);
  const maintenance = {
    gacha: getMaintenanceState("gacha"),
    purchase: getMaintenanceState("purchase"),
    topup: getMaintenanceState("topup"),
  };

  let productList: Awaited<ReturnType<typeof db.query.products.findMany>> = [];

  if (showAllProducts) {
    try {
      productList = await db.query.products.findMany({
        where: and(
          isNull(products.deletedAt),
          eq(products.isSold, false),
          or(gt(products.stockCount, 0), isNull(products.stockCount)),
        ),
        orderBy: (t, { desc: orderDesc }) => orderDesc(t.createdAt),
        limit: HOMEPAGE_PRODUCT_LIMIT,
      });
    } catch (error) {
      console.error("Error fetching homepage products:", error);
    }
  }

  const availableProductFilter = and(
    isNull(products.deletedAt),
    eq(products.isSold, false),
    or(gt(products.stockCount, 0), isNull(products.stockCount)),
  );
  const [stats, soldCountMap] = await Promise.all([
    cacheOrFetch(
      "home_hero_stats",
      async () => {
        const [[available], [completed], [members]] = await Promise.all([
          db.select({ value: count() }).from(products).where(availableProductFilter),
          db.select({ value: count() }).from(orders).where(eq(orders.status, "COMPLETED")),
          db.select({ value: count() }).from(users),
        ]);
        return {
          availableProducts: available?.value ?? 0,
          completedOrders: completed?.value ?? 0,
          members: members?.value ?? 0,
        };
      },
      CACHE_TTL.SHORT
    ),
    getSoldCountMap([
    ...featuredProducts.map((product) => product.id),
    ...saleProducts.map((product) => product.id),
    ...productList.map((product) => product.id),
    ]),
  ]);

  const renderGrid = (
    items: { id: string; name: string; price: unknown; discountPrice?: unknown; currency: string | null; imageUrl: string | null; category: string; isSold: boolean | null }[],
  ) => (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.slice(0, HOMEPAGE_GRID_PRODUCT_LIMIT).map((product, index) => (
        <ProductCard
          key={product.id}
          id={product.id}
          image={product.imageUrl || "/placeholder.jpg"}
          title={product.name}
          price={Number(product.price)}
          discountPrice={product.discountPrice === null || product.discountPrice === undefined ? null : Number(product.discountPrice)}
          currency={product.currency}
          category={product.category}
          isSold={Boolean(product.isSold)}
          soldCount={soldCountMap.get(product.id) ?? 0}
          index={index}
          currencySettings={currencySettings}
          initialPurchaseMaintenance={maintenance.purchase}
        />
      ))}
    </div>
  );

  const productTabs = [
    { key: "featured", label: "แนะนำ", items: featuredProducts },
    { key: "sale", label: "ลดราคา", items: saleProducts },
    { key: "latest", label: "ใหม่ล่าสุด", items: showAllProducts ? productList : [] },
  ]
    .filter((tab) => tab.items.length > 0)
    .map((tab) => ({ key: tab.key, label: tab.label, content: renderGrid(tab.items) }));

  return (
    <div className="animate-page-enter">
      <WelcomeRedirect />
      <div className={`${themeClasses.shell} relative left-1/2 w-screen -translate-x-1/2 space-y-10 px-3 pb-6 pt-4 sm:left-auto sm:w-auto sm:translate-x-0 sm:px-5 sm:py-8 lg:px-8`}>
        <HomeHero siteName={siteName} description={siteSettings?.heroDescription} stats={stats} />

        {maintenance.purchase.enabled && (
          <div className={`${themeClasses.alert} rounded-2xl px-4 py-3 text-sm`}>
            <p className="font-semibold">ระบบสั่งซื้อกำลังปิดปรับปรุงชั่วคราว</p>
            <p className="mt-1 text-xs">{maintenance.purchase.message}</p>
          </div>
        )}

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-xl font-bold leading-tight text-foreground sm:text-2xl">สินค้าแนะนำ</h2>
            <Link href="/shop" prefetch={false} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              ดูทั้งหมด
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {productTabs.length === 0 ? (
            <div className={`${themeClasses.surfaceSoft} rounded-2xl py-12 text-center`}>
              <p className="text-muted-foreground text-lg">ยังไม่มีสินค้าในระบบ</p>
            </div>
          ) : (
            <HomeProductTabs tabs={productTabs} />
          )}
        </section>

        <NewsSection
          initialNews={news.map((article) => ({
            ...article,
            createdAt: toSerializableDate(article.createdAt),
          }))}
        />
      </div>
    </div>
  );
}
