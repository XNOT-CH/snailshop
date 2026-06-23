import { Tag } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { ProductCarouselControls } from "@/components/ProductCarouselControls";
import { themeClasses } from "@/lib/theme";
import type { PublicCurrencySettings } from "@/lib/currencySettings";
import type { MaintenanceMap } from "@/hooks/useMaintenanceStatus";

interface SaleProduct {
    id: string;
    name: string;
    price: number;
    discountPrice: number;
    currency?: string | null;
    imageUrl: string | null;
    category: string;
    isSold: boolean;
}

interface SaleProductsProps {
    initialProducts?: SaleProduct[];
    initialCurrencySettings?: PublicCurrencySettings | null;
    initialMaintenance?: MaintenanceMap;
}

export function SaleProducts({
    initialProducts = [],
    initialCurrencySettings,
    initialMaintenance,
}: Readonly<SaleProductsProps>) {
    const maintenance = initialMaintenance?.purchase;
    const products = initialProducts.map((product) => ({
        ...product,
        price: Number(product.price),
        discountPrice: Number(product.discountPrice),
    }));

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
                intervalMs={6000}
                scrollLabel="เซกชันสินค้าโปรโมชัน"
                containerClassName="-mt-3 flex gap-4 overflow-x-auto scrollbar-hide pb-10 pt-3 px-3 snap-x snap-mandatory"
                header={(
                    <div className="flex min-w-0 items-center gap-2">
                        <Tag className="h-6 w-6 text-primary" />
                        <h2 className="text-2xl font-bold">สินค้าลดราคา</h2>
                        <span className={`${themeClasses.sale} rounded-full px-2 py-1 text-xs font-bold text-primary-foreground animate-pulse`}>SALE</span>
                    </div>
                )}
            >
                {products.map((product, index) => (
                    <div key={product.id} className="flex-shrink-0 w-40 sm:w-52 snap-start">
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
