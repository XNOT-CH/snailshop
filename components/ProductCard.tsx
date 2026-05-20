import Image from "next/image";
import Link from "next/link";
import { ProductCardActions } from "@/components/ProductCardActions";
import { formatCurrencyAmount, type PublicCurrencySettings } from "@/lib/currencySettings";
import { themeClasses } from "@/lib/theme";
import type { MaintenanceEntry } from "@/hooks/useMaintenanceStatus";

interface ProductCardProps {
    id: string;
    image: string;
    title: string;
    price: number;
    discountPrice?: number | null;
    currency?: string | null;
    category: string;
    isSold: boolean;
    stockCount?: number;
    index?: number;
    priorityImage?: boolean;
    currencySettings?: PublicCurrencySettings;
    initialPurchaseMaintenance?: MaintenanceEntry;
}

export function ProductCard({
    id,
    image,
    title,
    price,
    discountPrice = null,
    currency = "THB",
    category,
    isSold,
    stockCount,
    index = 0,
    priorityImage = false,
    currencySettings,
    initialPurchaseMaintenance,
}: Readonly<ProductCardProps>) {
    const hasDiscount = discountPrice !== null && discountPrice < price;
    const activePrice = hasDiscount && discountPrice !== null ? discountPrice : price;
    const isUnavailable = isSold || stockCount === 0;

    return (
        <div
            className="animate-product-card"
            style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
        >
            <div
                className={`
                    ${themeClasses.surface} storefront-product-card group relative flex flex-col overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_20px_38px_-28px_rgba(39,71,121,0.18)] dark:hover:shadow-[0_24px_48px_-32px_rgba(0,0,0,0.9)]
                `}
            >
                <div className={`${themeClasses.surfaceMedia} relative aspect-square overflow-hidden border-b border-border/80`}>
                    <div className="absolute top-3 left-3 z-10">
                        <span className={`${themeClasses.badge} storefront-product-category rounded-full px-2 py-1 text-xs font-medium shadow-sm`}>
                            {category}
                        </span>
                    </div>
                    {isUnavailable && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                            <span className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-full transform -rotate-12">
                                {isSold ? "ขายแล้ว" : "สินค้าหมด"}
                            </span>
                        </div>
                    )}
                    {!isUnavailable && (
                        <Link href={`/product/${id}`} prefetch={false} className={`${themeClasses.overlayScrim} absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100`}>
                            <span className={`${themeClasses.badge} storefront-product-category flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold`}>
                                ดูรายละเอียด
                            </span>
                        </Link>
                    )}
                    <Image
                        src={image || "/placeholder.jpg"}
                        alt={title}
                        fill
                        sizes="(max-width: 640px) calc(50vw - 24px), (max-width: 1024px) calc(50vw - 32px), (max-width: 1280px) calc(33vw - 32px), (max-width: 1536px) calc(25vw - 32px), 20vw"
                        loading={priorityImage ? undefined : "lazy"}
                        fetchPriority={priorityImage ? "high" : "low"}
                        preload={priorityImage}
                        className="object-cover"
                    />
                </div>
                <div className="p-3 text-center sm:p-4">
                    <h3 className="mb-1 truncate text-center text-[14px] font-semibold leading-tight text-foreground sm:text-base">
                        {title}
                    </h3>
                    <div className="text-center">
                        {hasDiscount && (
                            <p className="text-sm text-muted-foreground line-through">
                                {formatCurrencyAmount(price, currency, currencySettings)}
                            </p>
                        )}
                        <p className={`text-[16px] font-bold leading-tight sm:text-lg ${hasDiscount ? "text-red-500 dark:text-red-400" : "text-primary"}`}>
                            {formatCurrencyAmount(activePrice, currency, currencySettings)}
                        </p>
                    </div>
                    <ProductCardActions
                        id={id}
                        image={image}
                        title={title}
                        price={price}
                        activePrice={activePrice}
                        hasDiscount={hasDiscount}
                        currency={currency}
                        category={category}
                        isUnavailable={isUnavailable}
                        isSold={isSold}
                        currencySettings={currencySettings}
                        initialPurchaseMaintenance={initialPurchaseMaintenance}
                    />
                </div>
            </div>
        </div>
    );
}
