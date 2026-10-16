import Link from "next/link";
import { Package } from "lucide-react";
import { ThumbImage } from "@/components/ThumbImage";
import { ProductCardActions } from "@/components/ProductCardActions";
import { RevealOnScroll } from "@/components/RevealOnScroll";
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
    soldCount?: number;
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
    soldCount,
    index = 0,
    priorityImage = false,
    currencySettings,
    initialPurchaseMaintenance,
}: Readonly<ProductCardProps>) {
    const hasDiscount = discountPrice !== null && discountPrice < price;
    const activePrice = hasDiscount && discountPrice !== null ? discountPrice : price;
    const isUnavailable = isSold || stockCount === 0;

    return (
        <RevealOnScroll index={index} className="h-full">
            <div
                className={`
                    ${themeClasses.surface} storefront-product-card group relative flex h-full flex-col overflow-hidden rounded-2xl transition-colors duration-200 hover:border-primary/40
                `}
            >
                <div className={`${themeClasses.surfaceMedia} relative m-2 mb-0 aspect-square overflow-hidden rounded-xl sm:m-2.5 sm:mb-0`}>
                    {isUnavailable && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                            <span className="rounded-lg bg-background/90 px-4 py-2 text-sm font-bold text-foreground">
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
                    <ThumbImage
                        src={image || "/placeholder.jpg"}
                        alt={title}
                        fill
                        sizes="(max-width: 640px) calc(50vw - 24px), (max-width: 1024px) calc(50vw - 32px), (max-width: 1280px) calc(33vw - 32px), (max-width: 1536px) calc(25vw - 32px), 20vw"
                        loading={priorityImage ? undefined : "lazy"}
                        fetchPriority={priorityImage ? "high" : "low"}
                        preload={priorityImage}
                        className="object-cover"
                        skeleton
                    />
                </div>
                <div className="flex flex-1 flex-col p-3 sm:p-4">
                    {/* Text block grows so the actions sit level across a grid row,
                        whether a name takes one line or two. */}
                    <div className="flex-1">
                    <span className="mb-1.5 inline-block max-w-full truncate rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {category}
                    </span>
                    <h3 className="mb-1 line-clamp-2 text-sm font-semibold leading-snug text-foreground sm:text-base">
                        <Link href={`/product/${id}`} prefetch={false} className="transition-colors hover:text-primary">
                            {title}
                        </Link>
                    </h3>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                        <p className={`text-base font-bold leading-tight sm:text-lg ${hasDiscount ? themeClasses.saleText : "text-foreground"}`}>
                            {formatCurrencyAmount(activePrice, currency, currencySettings)}
                        </p>
                        {hasDiscount && (
                            <p className="text-sm text-muted-foreground line-through">
                                {formatCurrencyAmount(price, currency, currencySettings)}
                            </p>
                        )}
                    </div>
                    {/* "Sold 0" reads as nobody buys here, so the line waits for a first sale. */}
                    {(soldCount ?? 0) > 0 && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Package className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">ขายไปแล้ว {(soldCount ?? 0).toLocaleString("th-TH")} ชิ้น</span>
                        </div>
                    )}
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
        </RevealOnScroll>
    );
}
