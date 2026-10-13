import { notFound } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";
import type { Metadata } from "next";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductActions } from "@/components/ProductActions";
import { ProductStickyBuyBar } from "@/components/ProductStickyBuyBar";
import { ProductCard } from "@/components/ProductCard";
import { PageBand } from "@/components/PageBand";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { HomeSectionHeading, HomeSeeAllLink } from "@/components/HomeSections";
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
import { getPrimaryProductImage, normalizeProductImageUrls } from "@/lib/productImages";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { recordProductView } from "@/lib/features/products/productViews";
import { getSoldCountMap } from "@/lib/features/orders/queries";
import { listProductCheckboxes } from "@/lib/features/products/productCheckboxes";

const getProduct = cache(async (id: string) => {
    return db.query.products.findFirst({
        where: and(eq(products.id, id), isNull(products.deletedAt)),
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
    const [product, currencySettings, checkboxes] = await Promise.all([
        getProduct(id),
        getCurrencySettings(),
        listProductCheckboxes(id),
    ]);
    const purchaseMaintenance = getMaintenanceState("purchase");

    if (!product) {
        notFound();
    }

    // Analytics only — runs after the response is sent, never blocks the page.
    after(() => recordProductView(product.id));

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
            isNull(products.deletedAt),
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
    const soldCountMap = await getSoldCountMap(relatedProducts.map((related) => related.id));

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

    // No boxes: the lead band carries the product, the tinted band the related
    // items, and the column fills the screen so the old background never shows.
    return (
        <div className="animate-page-enter flex min-h-[calc(100dvh-4rem)] flex-col">
            <StructuredData data={structuredData} />

            <PageBand tone="lead" className={`pt-6 pb-4 lg:pt-8 lg:pb-6 ${relatedProducts.length === 0 ? "flex-1" : ""}`}>
                <PageBreadcrumb
                    items={[
                        { label: "ร้านค้า", href: "/shop" },
                        { label: product.name },
                    ]}
                    className="mb-6 justify-start"
                />

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] xl:gap-12">
                    <div className="w-full">
                        <ProductGallery images={productImages} />
                        <div className="mt-5">
                            <ShareButtons title={product.name} />
                        </div>
                    </div>

                    <div className="min-w-0">
                        <span className="inline-block max-w-full truncate rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {product.category}
                        </span>
                        <h1 className="mt-2 text-2xl font-bold leading-snug text-[var(--page-heading)] sm:text-3xl">
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

                        <div id="product-purchase" className="mt-6 scroll-mt-24">
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
                                checkboxes={checkboxes}
                            />
                        </div>

                        {product.description && (
                            <div className="mt-8">
                                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                                    <Info className="h-3.5 w-3.5" />
                                    รายละเอียดสินค้า
                                </h2>
                                <p className="mt-2 whitespace-pre-line text-sm leading-loose text-foreground">
                                    {product.description}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </PageBand>

            {isAvailable && (
                <ProductStickyBuyBar
                    priceLabel={formatCurrencyAmount(displayPrice, product.currency, currencySettings)}
                    targetId="product-purchase"
                />
            )}

            {relatedProducts.length > 0 && (
                <PageBand tone="plain" className="flex-1 pt-10 lg:pt-12">
                    <HomeSectionHeading title="รายการสินค้าอื่น ๆ" action={<HomeSeeAllLink href="/shop" />} />

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
                                    soldCount={soldCountMap.get(related.id) ?? 0}
                                    index={index}
                                    currencySettings={currencySettings}
                                    initialPurchaseMaintenance={purchaseMaintenance}
                                />
                            );
                        })}
                    </div>
                </PageBand>
            )}
        </div>
    );
}
