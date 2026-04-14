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
import Image from "next/image";
import Link from "next/link";

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
    const image = toAbsoluteAssetUrl(product.imageUrl);

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

    const productImage = toAbsoluteAssetUrl(product.imageUrl || "/placeholder.jpg");
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
            ...(productImage ? { image: [productImage] } : {}),
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
        <div className="animate-page-enter rounded-none bg-muted/60 py-6 dark:bg-background sm:py-10">
            <StructuredData data={structuredData} />

            <div className="relative mx-auto max-w-screen-2xl overflow-hidden rounded-none border border-border bg-card" style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.14)" }}>
                <div className="p-6 sm:p-8">
                    <PageBreadcrumb
                        items={[
                            { label: "ร้านค้า", href: "/shop" },
                            { label: product.name },
                        ]}
                        className="mb-6"
                    />

                    <div className="mt-2 grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
                        <div className="w-full border-b border-border/60 bg-muted/40 px-4 py-6 sm:px-6 lg:border-b-0 lg:border-r">
                            <ProductGallery mainImage={product.imageUrl || "/placeholder.jpg"} />
                            <div className="mt-4">
                                <ShareButtons title={product.name} />
                            </div>
                        </div>

                        <div className="min-w-0 px-4 py-6 sm:px-6">
                            <h1 className="text-2xl font-bold text-foreground leading-snug">
                                {product.name}
                            </h1>

                            <div>
                                <div className="flex items-baseline gap-2 flex-wrap">
                                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {formatCurrencyAmount(displayPrice, product.currency, currencySettings)} ต่อชิ้น
                                    </span>
                                    {discountPrice && (
                                        <span className="text-base text-muted-foreground line-through">
                                            {formatCurrencyAmount(price, product.currency, currencySettings)}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    มีสินค้าทั้งหมด {stockCount} ชิ้น
                                </p>
                            </div>

                            {product.description && (
                                <div className="space-y-1.5">
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        <Info className="h-3.5 w-3.5" />
                                        รายละเอียดสินค้า
                                    </p>
                                    <div className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground leading-relaxed whitespace-pre-line min-h-[60px]">
                                        {product.description}
                                    </div>
                                </div>
                            )}

                            <div className="mt-1">
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
                <div className="mx-auto mt-10 mb-2 max-w-screen-2xl rounded-none border border-border bg-card p-4 sm:mt-16 sm:mb-8 sm:p-6" style={{ boxShadow: "0 12px 48px rgba(0,0,0,0.10)" }}>
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
                                    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.18)]">
                                        <div className="group relative mb-4 aspect-square w-full overflow-hidden rounded-lg bg-muted">
                                            <Image
                                                src={related.imageUrl || "/placeholder.jpg"}
                                                alt={related.name}
                                                fill
                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                className="object-cover transition-all duration-500 group-hover:grayscale"
                                            />
                                            {relAvailable && (
                                                <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                                                    <span
                                                        style={{
                                                            border: "1.5px solid rgba(96, 165, 250, 0.85)",
                                                            color: "rgba(186, 230, 253, 1)",
                                                            backgroundColor: "rgba(29, 78, 216, 0.12)",
                                                        }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                                                    >
                                                        ดูรายละเอียด
                                                    </span>
                                                </div>
                                            )}
                                            {relDiscount && (
                                                <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm z-10">
                                                    ลดราคา
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col flex-1 text-center">
                                            <h3 className="font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors text-sm text-center">
                                                {related.name}
                                            </h3>

                                            <div className="mt-auto pt-2 flex flex-col items-center gap-1">
                                                <div className="text-center">
                                                    {relDiscount && (
                                                        <div className="text-[10px] sm:text-xs text-muted-foreground line-through mb-0.5">
                                                            {formatCurrencyAmount(relPrice, related.currency, currencySettings)}
                                                        </div>
                                                    )}
                                                    <div className="font-semibold text-blue-500 text-sm">
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
