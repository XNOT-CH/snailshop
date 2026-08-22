import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { HeroBanner } from "@/components/HeroBanner";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { SaleProducts } from "@/components/SaleProducts";
import { NewsSection } from "@/components/NewsSection";
import { WelcomeRedirect } from "@/components/WelcomeRedirect";
import { db } from "@/lib/db";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { buildPageMetadata, DEFAULT_SITE_DESCRIPTION, resolveSiteName } from "@/lib/seo";
import { cacheOrFetch, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { getSoldCountMap } from "@/lib/features/orders/queries";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { products, newsArticles } from "@/lib/db";
import { themeClasses } from "@/lib/theme";
import { and, asc, desc, eq, gt, isNotNull, isNull, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

const HOMEPAGE_PRODUCT_LIMIT = 12;
const HOMEPAGE_CAROUSEL_PRODUCT_LIMIT = 12;

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
  const pageHeading = `${resolveSiteName(siteSettings?.heroTitle)} ร้านขายไอดีเกม`;
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

  const soldCountMap = await getSoldCountMap([
    ...featuredProducts.map((product) => product.id),
    ...saleProducts.map((product) => product.id),
    ...productList.map((product) => product.id),
  ]);

  return (
    <div className="animate-page-enter">
      <WelcomeRedirect />
      <div className={`${themeClasses.shell} relative left-1/2 w-screen -translate-x-1/2 space-y-6 px-3 pb-0 pt-4 sm:left-auto sm:w-auto sm:translate-x-0 sm:px-5 sm:py-6 lg:px-6`}>
        <h1 className="sr-only">{pageHeading}</h1>

        <div className="relative left-1/2 w-screen -translate-x-1/2 px-2 sm:left-auto sm:w-auto sm:translate-x-0 sm:px-0">
          <HeroBanner />
        </div>

        <FeaturedProducts
          initialProducts={featuredProducts.slice(0, HOMEPAGE_CAROUSEL_PRODUCT_LIMIT).map((product) => ({
            ...product,
            price: Number(product.price),
            discountPrice:
              product.discountPrice === null || product.discountPrice === undefined
                ? null
                : Number(product.discountPrice),
            soldCount: soldCountMap.get(product.id) ?? 0,
          }))}
          initialCurrencySettings={currencySettings}
          initialMaintenance={maintenance}
        />

        <SaleProducts
          initialProducts={saleProducts.slice(0, HOMEPAGE_CAROUSEL_PRODUCT_LIMIT).map((product) => ({
            ...product,
            price: Number(product.price),
            discountPrice: Number(product.discountPrice),
            soldCount: soldCountMap.get(product.id) ?? 0,
          }))}
          initialCurrencySettings={currencySettings}
          initialMaintenance={maintenance}
        />

        {showAllProducts && (
          <>
            <div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                    สินค้าล่าสุด
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    เลือกดูรายการใหม่ก่อน แล้วไปหน้าร้านค้าเพื่อค้นหาทั้งหมด
                  </p>
                </div>
                <Link
                  href="/shop"
                  prefetch={false}
                  className={`${themeClasses.actionMuted} inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors hover:text-primary`}
                >
                  ดูสินค้าทั้งหมด
                </Link>
              </div>
            </div>

            {productList.length === 0 ? (
              <div className={`${themeClasses.surfaceSoft} rounded-2xl py-12 text-center`}>
                <p className="text-muted-foreground text-lg">
                  ยังไม่มีสินค้าในระบบ
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {productList.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    image={product.imageUrl || "/placeholder.jpg"}
                    title={product.name}
                    price={Number(product.price)}
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
            )}
          </>
        )}

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
