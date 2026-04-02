// app/page.tsx
import type { Metadata } from "next";
import { ProductCard } from "@/components/ProductCard";
import { HeroBanner } from "@/components/HeroBanner";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { SaleProducts } from "@/components/SaleProducts";
import { NewsSection } from "@/components/NewsSection";
import { db } from "@/lib/db";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { buildPageMetadata, DEFAULT_SITE_DESCRIPTION } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return buildPageMetadata({
    title: "ร้านขายไอดีเกม",
    description: settings?.heroDescription?.trim() || DEFAULT_SITE_DESCRIPTION,
    path: "/",
    image: settings?.bannerImage1 || settings?.logoUrl,
  });
}

export default async function Home() {
  const siteSettings = await getSiteSettings();
  const showAllProducts = siteSettings?.showAllProducts ?? true;
  const pageHeading = siteSettings?.heroTitle?.trim() || "Manashop ร้านขายไอดีเกม";

  const productList = showAllProducts
    ? await db.query.products.findMany({ orderBy: (t, { desc }) => desc(t.createdAt) })
    : [];

  return (
    <div className="animate-page-enter">
      <div className="border border-border/50 bg-card/90 px-3 py-5 shadow-xl shadow-primary/10 backdrop-blur-sm space-y-6 sm:px-5 sm:py-6 lg:px-6">
        <h1 className="sr-only">{pageHeading}</h1>

        {/* Hero Banner */}
        <HeroBanner />

        {/* Featured Products Carousel */}
        <FeaturedProducts />

        {/* Sale Products Carousel */}
        <SaleProducts />

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
              <div className="text-center py-12 rounded-2xl bg-card border border-border">
                <p className="text-muted-foreground text-lg">
                  ยังไม่มีสินค้าในระบบ
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {productList.map((product, index) => (
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
          </>
        )}

        {/* News and Promotions Section */}
        <NewsSection />
      </div>
    </div>
  );
}
