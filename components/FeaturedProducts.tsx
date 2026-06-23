import { ProductCard } from "@/components/ProductCard";
import { ProductCarouselControls } from "@/components/ProductCarouselControls";
import { themeClasses } from "@/lib/theme";
import type { PublicCurrencySettings } from "@/lib/currencySettings";
import type { MaintenanceMap } from "@/hooks/useMaintenanceStatus";

interface FeaturedProduct {
  id: string;
  name: string;
  price: number;
  discountPrice?: number | null;
  currency?: string | null;
  imageUrl: string | null;
  category: string;
  isSold: boolean;
}

interface FeaturedProductsProps {
  initialProducts?: FeaturedProduct[];
  initialCurrencySettings?: PublicCurrencySettings | null;
  initialMaintenance?: MaintenanceMap;
}

function normalizeFeaturedProduct(product: FeaturedProduct) {
  return {
    ...product,
    price: Number(product.price),
    discountPrice:
      product.discountPrice === null || product.discountPrice === undefined
        ? null
        : Number(product.discountPrice),
  };
}

export function FeaturedProducts({
  initialProducts = [],
  initialCurrencySettings,
  initialMaintenance,
}: Readonly<FeaturedProductsProps>) {
  const maintenance = initialMaintenance?.purchase;
  const products = initialProducts.map(normalizeFeaturedProduct);

  if (products.length === 0) {
    return null;
  }

  return (
    <div>
      {maintenance?.enabled && (
        <div className={`${themeClasses.alert} mb-4 rounded-2xl px-4 py-3 text-sm`}>
          <p className="font-semibold">ระบบสั่งซื้อกำลังปิดปรับปรุงชั่วคราว</p>
          <p className="mt-1 text-xs text-amber-800/90">{maintenance.message}</p>
        </div>
      )}

      <ProductCarouselControls
        itemCount={products.length}
        intervalMs={5000}
        scrollLabel="เซกชันโปรโมชัน"
        containerClassName="swipe-container scrollbar-hide -mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-3 pb-10 pt-3"
        header={(
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-xl font-bold leading-tight text-foreground sm:text-2xl">สินค้าแนะนำ</h2>
          </div>
        )}
      >
        {products.map((product, index) => (
          <div key={product.id} className="swipe-item w-40 flex-shrink-0 snap-start sm:w-52">
            <ProductCard
              id={product.id}
              image={product.imageUrl || "/placeholder.jpg"}
              title={product.name}
              price={product.price}
              discountPrice={product.discountPrice}
              currency={product.currency}
              category={product.category}
              isSold={Boolean(product.isSold)}
              index={index}
              currencySettings={initialCurrencySettings ?? undefined}
              initialPurchaseMaintenance={maintenance}
            />
          </div>
        ))}
      </ProductCarouselControls>
    </div>
  );
}
