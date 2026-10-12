import type { Metadata } from "next";
import { auth } from "@/auth";
import { HomeHero } from "@/components/HomeHero";
import { getHeroBanners } from "@/components/HeroBanner";
import { HomeProductTabs } from "@/components/HomeProductTabs";
import {
  HomeFaq,
  HomeBand,
  HOME_CATEGORIES,
  HomeCategories,
  HomeGachaMachines,
  HomeGameChips,
  HomeHowToBuy,
  HomeJoinCta,
  HOME_PREMIUM_APPS,
  HomePremiumApps,
  HomeProductTile,
  HomeSectionHeading,
  HomeSeeAllLink,
  HomeTopupShowcase,
} from "@/components/HomeSections";
import { NewsSection } from "@/components/NewsSection";
import { WelcomeRedirect } from "@/components/WelcomeRedirect";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { buildPageMetadata, DEFAULT_SITE_DESCRIPTION, resolveSiteName } from "@/lib/seo";
import { cacheOrFetch, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { products, newsArticles, gachaMachines, helpArticles } from "@/lib/db";
import { themeClasses } from "@/lib/theme";
import { and, asc, count, desc, eq, gt, isNotNull, isNull, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

const HOMEPAGE_PRODUCT_LIMIT = 12;
const HOMEPAGE_CAROUSEL_PRODUCT_LIMIT = 12;
const HOMEPAGE_TILE_LIMIT = 6;
const HOMEPAGE_GACHA_LIMIT = 4;
const HOMEPAGE_FAQ_LIMIT = 5;

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
  const [games, machines, faqs, session] = await Promise.all([
    cacheOrFetch(
      "home_games",
      async () =>
        db.select({ name: products.category, count: count() })
          .from(products)
          .where(availableProductFilter)
          .groupBy(products.category)
          .orderBy(desc(count())),
      CACHE_TTL.SHORT
    ),
    cacheOrFetch(
      "home_gacha_machines",
      async () =>
        db.select({
          id: gachaMachines.id,
          name: gachaMachines.name,
          imageUrl: gachaMachines.imageUrl,
          gameType: gachaMachines.gameType,
          costType: gachaMachines.costType,
          costAmount: gachaMachines.costAmount,
        })
          .from(gachaMachines)
          .where(and(eq(gachaMachines.isActive, true), eq(gachaMachines.isEnabled, true)))
          .orderBy(asc(gachaMachines.sortOrder))
          .limit(HOMEPAGE_GACHA_LIMIT),
      CACHE_TTL.SHORT
    ),
    cacheOrFetch(
      "home_faq",
      async () =>
        db.select({ id: helpArticles.id, question: helpArticles.question, answer: helpArticles.answer })
          .from(helpArticles)
          .where(eq(helpArticles.isActive, true))
          .orderBy(asc(helpArticles.category), asc(helpArticles.sortOrder))
          .limit(HOMEPAGE_FAQ_LIMIT),
      CACHE_TTL.SHORT
    ),
    auth(),
  ]);

  const toTile = (product: { id: string; name: string; price: unknown; discountPrice?: unknown; currency: string | null; imageUrl: string | null; category: string }) => ({
    id: product.id,
    name: product.name,
    price: Number(product.price),
    discountPrice: product.discountPrice === null || product.discountPrice === undefined ? null : Number(product.discountPrice),
    currency: product.currency,
    imageUrl: product.imageUrl,
    category: product.category,
  });

  const productTabs = [
    { key: "featured", label: "แนะนำ", items: featuredProducts },
    { key: "sale", label: "ลดราคา", items: saleProducts },
    { key: "latest", label: "ใหม่ล่าสุด", items: showAllProducts ? productList : [] },
  ]
    .filter((tab) => tab.items.length > 0)
    .map((tab) => ({
      key: tab.key,
      label: tab.label,
      content: (
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tab.items.slice(0, HOMEPAGE_TILE_LIMIT).map((product, index) => (
            <RevealOnScroll key={product.id} index={index}>
              <HomeProductTile product={toTile(product)} currencySettings={currencySettings} />
            </RevealOnScroll>
          ))}
        </div>
      ),
    }));

  // Each section gets its own full-width band, alternating with the hero's
  // color, so scrolling reads as moving from one scene to the next. Tones are
  // assigned after empty sections drop out, so the alternation never breaks.
  const sectionCandidates: (false | { key: string; node: ReactNode })[] = [
    { key: "categories", node: <HomeCategories categories={HOME_CATEGORIES} /> },
    {
      key: "products",
      node: (
        <section>
          {games.length > 0 && (
            <div className="mb-12">
              <HomeSectionHeading title="เลือกตามเกม" />
              <HomeGameChips games={games} />
            </div>
          )}
          <HomeSectionHeading title="สินค้า" action={<HomeSeeAllLink href="/shop" />} />
          {productTabs.length === 0 ? (
            <div className={`${themeClasses.surfaceSoft} rounded-2xl py-12 text-center`}>
              <p className="text-muted-foreground text-lg">ยังไม่มีสินค้าในระบบ</p>
            </div>
          ) : (
            <HomeProductTabs tabs={productTabs} />
          )}
        </section>
      ),
    },
    HOME_PREMIUM_APPS.length > 0 && {
      key: "premium-apps",
      node: <RevealOnScroll><HomePremiumApps apps={HOME_PREMIUM_APPS} /></RevealOnScroll>,
    },
    news.length > 0 && {
      key: "news",
      node: (
        <RevealOnScroll>
          <NewsSection
            initialNews={news.map((article) => ({
              ...article,
              createdAt: toSerializableDate(article.createdAt),
            }))}
          />
        </RevealOnScroll>
      ),
    },
    { key: "topup", node: <RevealOnScroll><HomeTopupShowcase /></RevealOnScroll> },
    machines.length > 0 && {
      key: "gacha",
      node: (
        <section>
          <HomeSectionHeading title="ตู้กาชา" subtitle="สุ่มรางวัลจากตู้ที่เปิดอยู่ตอนนี้" action={<HomeSeeAllLink href="/gachapons" />} />
          <HomeGachaMachines
            machines={machines.map((machine) => ({ ...machine, costAmount: Number(machine.costAmount) }))}
            currencySettings={currencySettings}
          />
        </section>
      ),
    },
    { key: "how-to-buy", node: <RevealOnScroll><HomeHowToBuy /></RevealOnScroll> },
    faqs.length > 0 && { key: "faq", node: <RevealOnScroll><HomeFaq articles={faqs} /></RevealOnScroll> },
    !session?.user && { key: "join", node: <RevealOnScroll><HomeJoinCta siteName={siteName} /></RevealOnScroll> },
  ];
  const sections = sectionCandidates.filter((section) => section !== false);
  // Until the admin sets any banners, the owner's Level Up banner fills the hero.
  const adminBanners = getHeroBanners(siteSettings);
  const heroBanners = adminBanners.length > 0
    ? adminBanners
    : [{ id: 0, image: "/home-hero-banner.webp", title: "", subtitle: "" }];

  return (
    <div className="animate-page-enter">
      <WelcomeRedirect />
      <HomeHero siteName={siteName} banners={heroBanners} />
      {maintenance.purchase.enabled && (
        <HomeBand tone="plain" className="pb-0 lg:pb-0">
          <div className={`${themeClasses.alert} rounded-2xl px-4 py-3 text-sm`}>
            <p className="font-semibold">ระบบสั่งซื้อกำลังปิดปรับปรุงชั่วคราว</p>
            <p className="mt-1 text-xs">{maintenance.purchase.message}</p>
          </div>
        </HomeBand>
      )}
      {sections.map((section, index) => (
        <HomeBand key={section.key} tone={index % 2 === 0 ? "plain" : "raised"}>
          {section.node}
        </HomeBand>
      ))}
    </div>
  );
}
