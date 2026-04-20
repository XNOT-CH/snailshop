import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductActions } from "@/components/ProductActions";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { ShareButtons } from "@/components/ShareButtons";
import { StructuredData } from "@/components/StructuredData";
import { Info } from "lucide-react";
import { db, products } from "@/lib/db";
import { eq, and, ne, desc } from "drizzle-orm";
import { getStockCount } from "@/lib/stock";
import { decrypt } from "@/lib/encryption";
import { absoluteUrl, buildPageMetadata, resolveSiteName, toAbsoluteAssetUrl } from "@/lib/seo";
import { formatCurrencyAmount } from "@/lib/currencySettings";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { themeClasses } from "@/lib/theme";
import Image from "next/image";
import Link from "next/link";
import { getPrimaryProductImage, normalizeProductImageUrls } from "@/lib/productImages";

const getProduct = cache(async (id: string) => {
    return db.query.products.findFirst({ where: eq(products.id, id) });
});

interface ProductDetailPageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Readonly<ProductDetailPageProps>): Promise<Metadata> {
    const { id } = await params;
    const [product, siteSettings] = await Promise.all([getProduct(id), getSiteSettings()]);
    const siteName = resolveSiteName(siteSettings?.heroTitle);

    if (!product) {
        return buildPageMetadata({
            title: "ไม่พบสินค้า",
            path: `/product/${id}`,
            noIndex: true,
            siteName,
        });
    }

    const description = product.description || `ซื้อ ${product.name} ราคา ${Number(product.price).toLocaleString()} บาท`;
    const image = toAbsoluteAssetUrl(getPrimaryProductImage(product.imageUrls, product.imageUrl));

    return {
        ...buildPageMetadata({
            title: product.name,
            description,
            path: `/product/${product.id}`,
            image,
            siteName,
        }),
        title: product.name,
        description,
        alternates: {
            canonical: `/product/${product.id}`,
        },
        openGraph: {
            title: `${product.name} | ${siteName}`,
            description,
            url: absoluteUrl(`/product/${product.id}`),
            siteName,
            type: "website",
            ...(image ? { images: [{ url: image }] } : {}),
        },
        twitter: {
            card: image ? "summary_large_image" : "summary",
            title: `${product.name} | ${siteName}`,
            description,
            ...(image ? { images: [image] } : {}),
        },
    };
}

export default async function ProductDetailPage({
    params,
}: Readonly<ProductDetailPageProps>) {
    const { id } = await params;
    const [product, currencySettings] = await Promise.all([
        getProduct(id),
        getCurrencySettings(),
    ]);

    if (!product) {
        notFound();
    }

    const isSold = Boolean(product.isSold);
    const price = Number(product.price);
    const discountPrice = product.discountPrice ? Number(product.discountPrice) : null;
    const stockCount = getStockCount(
        decrypt(product.secretData || ""),
        product.stockSeparator || "newline"
    );
    const isAvailable = !isSold && stockCount > 0;
    const displayPrice = discountPrice ?? price;

    const relatedProducts = await db.query.products.findMany({
        where: and(
            eq(products.category, product.category),
            ne(products.id, product.id)
        ),
        orderBy: [desc(products.createdAt)],
        limit: 4,
    });

    const productImages = normalizeProductImageUrls(product.imageUrls, product.imageUrl);
    const productImage = toAbsoluteAssetUrl(getPrimaryProductImage(product.imageUrls, product.imageUrl) || "/placeholder.jpg");
    const structuredImages = productImages
        .map((imageUrl) => toAbsoluteAssetUrl(imageUrl))
        .filter(Boolean) as string[];
    const productDescription =
        product.description || `ซื้อ ${product.name} ราคา ${formatCurrencyAmount(displayPrice, product.currency, currencySettings)}`;
    const structuredData = [
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
                {
                    "@type": "ListItem",
                    position: 1,
                    name: "ร้านค้า",
                    item: absoluteUrl("/shop"),
                },
                {
                    "@type": "ListItem",
                    position: 2,
                    name: product.name,
                    item: absoluteUrl(`/product/${product.id}`),
                },
            ],
        },
        {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: productDescription,
            sku: product.id,
            category: product.category,
            ...(structuredImages.length > 0 ? { image: structuredImages } : productImage ? { image: [productImage] } : {}),
            offers: {
                "@type": "Offer",
                priceCurrency: product.currency || "THB",
                price: displayPrice.toFixed(2),
                availability: isAvailable
                    ? "https://schema.org/InStock"
                    : "https://schema.org/OutOfStock",
                url: absoluteUrl(`/product/${product.id}`),
            },
        },
    ];

    return (
        <div className="animate-page-enter relative left-1/2 w-screen -translate-x-1/2 bg-gradient-to-b from-background via-muted/25 to-background py-6 sm:left-auto sm:w-auto sm:translate-x-0 sm:py-10">
            <StructuredData data={structuredData} />

            <div
                className={`${themeClasses.shell} relative mx-auto max-w-screen-2xl overflow-hidden rounded-[28px] backdrop-blur-xl`}
            >
                <div className="border-b border-border/60 bg-gradient-to-r from-card/92 via-card to-card/92 p-6 sm:p-8">
                    <PageBreadcrumb
                        items={[
                            { label: "ร้านค้า", href: "/shop" },
                            { label: product.name },
                        ]}
                        className="mb-6"
                    />

                    <div className="mt-2 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] xl:gap-8">
                        <div className={`${themeClasses.panelSoft} w-full rounded-[24px] px-4 py-6 sm:px-6`}>
                            <ProductGallery images={productImages} />
                            <div className="mt-5 border-t border-border/60 pt-4">
                                <ShareButtons title={product.name} />
                            </div>
                        </div>

                        <div className={`${themeClasses.panel} min-w-0 rounded-[24px] px-4 py-6 sm:px-6`}>
                            <div className="border-b border-border/60 pb-5">
                                <h1 className="text-2xl font-bold leading-snug text-foreground">
                                    {product.name}
                                </h1>

                                <div className="mt-3">
                                    <div className="flex flex-wrap items-baseline gap-2">
                                        <span className="text-2xl font-bold text-primary">
                                            {formatCurrencyAmount(displayPrice, product.currency, currencySettings)} ต่อชิ้น
                                        </span>
                                        {discountPrice && (
                                            <span className="text-base text-muted-foreground line-through">
                                                {formatCurrencyAmount(price, product.currency, currencySettings)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        มีสินค้าทั้งหมด {stockCount} ชิ้น
                                    </p>
                                </div>
                            </div>

                            {product.description && (
                                <div className="mt-5 space-y-2">
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        <Info className="h-3.5 w-3.5" />
                                        รายละเอียดสินค้า
                                    </p>
                                    <div className={`${themeClasses.surface} min-h-[60px] w-full rounded-2xl px-4 py-4 text-sm leading-relaxed text-foreground whitespace-pre-line`}>
                                        {product.description}
                                    </div>
                                </div>
                            )}

                            <div className="mt-5 border-t border-border/60 pt-5">
                                <ProductActions
                                    product={{
                                        id: product.id,
                                        name: product.name,
                                        price,
                                        discountPrice,
                                        currency: product.currency,
                                        imageUrl: product.imageUrl,
                                        category: product.category,
                                    }}
                                    disabled={!isAvailable}
                                    maxQuantity={stockCount}
                                    currencySettings={currencySettings}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {relatedProducts.length > 0 && (
                <div className={`${themeClasses.shell} mx-auto mt-10 mb-2 max-w-screen-2xl rounded-[28px] p-4 sm:mt-16 sm:mb-8 sm:p-6`}>
                    <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                        รายการสินค้าอื่น ๆ
                    </h2>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
                        {relatedProducts.map((related) => {
                            const relPrice = Number(related.price);
                            const relDiscount = related.discountPrice ? Number(related.discountPrice) : null;
                            const relDisplayPrice = relDiscount ?? relPrice;
                            const relStock = getStockCount(
                                decrypt(related.secretData || ""),
                                related.stockSeparator || "newline"
                            );
                            const relIsSold = Boolean(related.isSold);
                            const relAvailable = !relIsSold && relStock > 0;

                            return (
                                <Link href={`/product/${related.id}`} key={related.id} className="group cursor-pointer">
                                    <div className={`${themeClasses.surface} flex h-full flex-col rounded-xl p-4 transition-shadow duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.28)]`}>
                                        <div className="group relative mb-4 aspect-square w-full overflow-hidden rounded-lg bg-muted">
                                            <Image
                                                src={related.imageUrl || "/placeholder.jpg"}
                                                alt={related.name}
                                                fill
                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                className="object-cover transition-all duration-500 group-hover:grayscale"
                                            />
                                            {relAvailable && (
                                                <div className={`${themeClasses.overlayScrim} absolute inset-0 flex items-center justify-center backdrop-blur-[1px] opacity-0 transition duration-300 group-hover:opacity-100`}>
                                                    <span className={`${themeClasses.badge} flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold`}>
                                                        ดูรายละเอียด
                                                    </span>
                                                </div>
                                            )}
                                            {relDiscount && (
                                                <div className="absolute top-2 left-2 z-10 rounded bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm">
                                                    ลดราคา
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col flex-1 text-center">
                                            <h3 className="mb-1 line-clamp-2 text-center text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                                                {related.name}
                                            </h3>

                                            <div className="mt-auto pt-2 flex flex-col items-center gap-1">
                                                <div className="text-center">
                                                    {relDiscount && (
                                                        <div className="text-[10px] sm:text-xs text-muted-foreground line-through mb-0.5">
                                                            {formatCurrencyAmount(relPrice, related.currency, currencySettings)}
                                                        </div>
                                                    )}
                                                    <div className="text-sm font-semibold text-primary">
                                                        {formatCurrencyAmount(relDisplayPrice, related.currency, currencySettings)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                                                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                                                    คงเหลือ {relStock} ชิ้น
                                                </span>
                                                <div className={`text-[10px] px-2 py-1 rounded-full font-semibold ${relAvailable
                                                    ? "bg-primary/10 text-primary"
                                                    : "bg-destructive/10 text-destructive"
                                                    }`}>
                                                    {relAvailable ? "พร้อมขาย" : "สินค้าหมด"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
