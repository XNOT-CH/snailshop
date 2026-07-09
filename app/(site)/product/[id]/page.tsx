import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductActions } from "@/components/ProductActions";
import { ProductCard } from "@/components/ProductCard";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { ShareButtons } from "@/components/ShareButtons";
import { StructuredData } from "@/components/StructuredData";
import { Info } from "lucide-react";
import { db, products } from "@/lib/db";
import { and, desc, eq, gt, isNull, ne, or } from "drizzle-orm";
import { getStockCount } from "@/lib/stock";
import { decrypt } from "@/lib/encryption";
import { absoluteUrl, buildPageMetadata, resolveSiteName, toAbsoluteAssetUrl } from "@/lib/seo";
import { formatCurrencyAmount } from "@/lib/currencySettings";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { themeClasses } from "@/lib/theme";
import { getPrimaryProductImage, normalizeProductImageUrls } from "@/lib/productImages";
import { getMaintenanceState } from "@/lib/maintenanceMode";

const getProduct = cache(async (id: string) => {
    return db.query.products.findFirst({
        where: eq(products.id, id),
        columns: {
            id: true,
            name: true,
            description: true,
            price: true,
            discountPrice: true,
            imageUrl: true,
            imageUrls: true,
            category: true,
            currency: true,
            isSold: true,
            stockCount: true,
            secretData: true,
            stockSeparator: true,
        },
    });
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
    const purchaseMaintenance = getMaintenanceState("purchase");

    if (!product) {
        notFound();
    }

    const isSold = Boolean(product.isSold);
    const price = Number(product.price);
    const discountPrice = product.discountPrice ? Number(product.discountPrice) : null;
    const stockCount = product.stockCount ?? getStockCount(
        decrypt(product.secretData || ""),
        product.stockSeparator || "newline"
    );
    const isAvailable = !isSold && stockCount > 0;
    const displayPrice = discountPrice ?? price;

    const relatedProducts = await db.query.products.findMany({
        where: and(
            eq(products.category, product.category),
            ne(products.id, product.id),
            eq(products.isSold, false),
            or(gt(products.stockCount, 0), isNull(products.stockCount))
        ),
        orderBy: [desc(products.createdAt)],
        columns: {
            id: true,
            name: true,
            price: true,
            discountPrice: true,
            currency: true,
            imageUrl: true,
            category: true,
            isSold: true,
            stockCount: true,
            secretData: true,
            stockSeparator: true,
        },
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
        <div className="animate-page-enter relative left-1/2 w-screen -translate-x-1/2 bg-gradient-to-b from-background via-muted/25 to-background pt-6 pb-0 sm:left-auto sm:w-auto sm:translate-x-0 sm:py-10">
            <StructuredData data={structuredData} />

            <div
                className={`${themeClasses.shell} relative mx-auto max-w-screen-2xl overflow-hidden rounded-3xl backdrop-blur-xl`}
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
                        <div className={`${themeClasses.panelSoft} w-full rounded-3xl px-4 py-6 sm:px-6`}>
                            <ProductGallery images={productImages} />
                            <div className="mt-5 border-t border-border/60 pt-4">
                                <ShareButtons title={product.name} />
                            </div>
                        </div>

                        <div className={`${themeClasses.panel} min-w-0 rounded-3xl px-4 py-6 sm:px-6`}>
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

                            <div className="mt-5">
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

                            {product.description && (
                                <div className="mt-5 space-y-2 border-t border-border/60 pt-5">
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        <Info className="h-3.5 w-3.5" />
                                        รายละเอียดสินค้า
                                    </p>
                                    <div className={`${themeClasses.surfaceSoft} min-h-[60px] w-full rounded-3xl px-6 py-5 text-sm leading-loose text-foreground whitespace-pre-line`}>
                                        {product.description}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {relatedProducts.length > 0 && (
                <div className={`${themeClasses.shell} mx-auto mt-10 mb-2 max-w-screen-2xl rounded-3xl p-4 sm:mt-16 sm:mb-8 sm:p-6`}>
                    <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                        รายการสินค้าอื่น ๆ
                    </h2>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                        {relatedProducts.map((related, index) => {
                            const relPrice = Number(related.price);
                            const relDiscount =
                                related.discountPrice === null || related.discountPrice === undefined
                                    ? null
                                    : Number(related.discountPrice);
                            const relStock = related.stockCount ?? getStockCount(
                                decrypt(related.secretData || ""),
                                related.stockSeparator || "newline"
                            );

                            return (
                                <ProductCard
                                    key={related.id}
                                    id={related.id}
                                    image={related.imageUrl || "/placeholder.jpg"}
                                    title={related.name}
                                    price={relPrice}
                                    discountPrice={relDiscount}
                                    currency={related.currency}
                                    category={related.category}
                                    isSold={Boolean(related.isSold)}
                                    stockCount={relStock}
                                    index={index}
                                    currencySettings={currencySettings}
                                    initialPurchaseMaintenance={purchaseMaintenance}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
