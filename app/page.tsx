// app/page.tsx
import { ProductCard } from "@/components/ProductCard";
import { HeroBanner } from "@/components/HeroBanner";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { SaleProducts } from "@/components/SaleProducts";
import { NewsSection } from "@/components/NewsSection";
import { db, siteSettings as siteSettingsTable, products } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const siteSettings = await db.query.siteSettings.findFirst({
    columns: { showAllProducts: true },
  });
  const showAllProducts = siteSettings?.showAllProducts ?? true;

  const productList = showAllProducts
    ? await db.query.products.findMany({ orderBy: (t, { desc }) => desc(t.createdAt) })
    : [];

  return (
    <div className="animate-page-enter">
      <div className="py-6 bg-card/90 backdrop-blur-sm px-4 sm:px-6 shadow-xl shadow-primary/10 border border-border/50 space-y-6">
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