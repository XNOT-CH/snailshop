// app/page.tsx
import type { Metadata } from "next";
import { ProductCard } from "@/components/ProductCard";
import { HeroBanner } from "@/components/HeroBanner";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { SaleProducts } from "@/components/SaleProducts";
import { NewsSection } from "@/components/NewsSection";
import { db } from "@/lib/db";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { buildPageMetadata, DEFAULT_SITE_DESCRIPTION, resolveSiteName } from "@/lib/seo";
import { cacheOrFetch, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { products, newsArticles } from "@/lib/db";
import { themeClasses } from "@/lib/theme";
import { asc, desc, eq, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

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

export default async function Home() {
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
        .where(eq(products.isFeatured, true))
        .orderBy(asc(products.isSold), asc(products.sortOrder), desc(products.createdAt))
        .limit(20),
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
          .where(isNotNull(products.discountPrice))
          .orderBy(asc(products.isSold), desc(products.createdAt))
          .limit(20);

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
        orderBy: (t, { desc }) => desc(t.createdAt),
      });
    } catch (error) {
      console.error("Error fetching homepage products:", error);
    }
  }

  return (
    <div className="animate-page-enter">
      <div className={`${themeClasses.shell} relative left-1/2 w-screen -translate-x-1/2 px-3 pb-0 pt-4 backdrop-blur-sm space-y-6 sm:left-auto sm:w-auto sm:translate-x-0 sm:px-5 sm:py-6 sm:backdrop-blur-sm lg:px-6`}>
        <h1 className="sr-only">{pageHeading}</h1>

        {/* Hero Banner */}
        <div className="relative left-1/2 w-screen -translate-x-1/2 px-2 sm:left-auto sm:w-auto sm:translate-x-0 sm:px-0">
          <HeroBanner />
        </div>

        {/* Featured Products Carousel */}
        <FeaturedProducts
          initialProducts={featuredProducts.map((product) => ({
            ...product,
            price: Number(product.price),
            discountPrice:
              product.discountPrice === null || product.discountPrice === undefined
                ? null
                : Number(product.discountPrice),
          }))}
          initialCurrencySettings={currencySettings}
          initialMaintenance={maintenance}
        />

        {/* Sale Products Carousel */}
        <SaleProducts
          initialProducts={saleProducts.map((product) => ({
            ...product,
            price: Number(product.price),
            discountPrice: Number(product.discountPrice),
          }))}
          initialCurrencySettings={currencySettings}
          initialMaintenance={maintenance}
        />

        {/* All Products Section - Toggled from admin */}
        {showAllProducts && (
          <>
            {/* Section Header - All Products */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                สินค้าทั้งหมด
              </h2>
              <p className="text-muted-foreground mt-1">
                ค้นหาไอดีเกมที่คุณต้องการ
              </p>
            </div>

            {/* Product Grid */}
            {productList.length === 0 ? (
              <div className={`${themeClasses.surfaceSoft} rounded-2xl py-12 text-center`}>
                <p className="text-muted-foreground text-lg">
                  ยังไม่มีสินค้าในระบบ
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
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
                    index={index}
                    currencySettings={currencySettings}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* News and Promotions Section */}
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
