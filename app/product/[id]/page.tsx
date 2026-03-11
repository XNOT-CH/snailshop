import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductActions } from "@/components/ProductActions";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { ShareButtons } from "@/components/ShareButtons";
import { Info } from "lucide-react";

import { db, products } from "@/lib/db";
import { eq, and, ne, desc } from "drizzle-orm";
import { getStockCount } from "@/lib/stock";
import { decrypt } from "@/lib/encryption";
import Image from "next/image";
import Link from "next/link";

// Cache the DB lookup so generateMetadata and the page share one request
const getProduct = cache(async (id: string) => {
    return db.query.products.findFirst({ where: eq(products.id, id) });
});

interface ProductDetailPageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
    const { id } = await params;
    const product = await getProduct(id);
    if (!product) return { title: "ไม่พบสินค้า" };
    return {
        title: product.name,
        description: product.description || `ซื้อ ${product.name} ราคา ${Number(product.price).toLocaleString()} บาท`,
        openGraph: {
            title: product.name,
            description: product.description || `ซื้อ ${product.name}`,
            ...(product.imageUrl ? { images: [{ url: product.imageUrl }] } : {}),
        },
    };
}


export default async function ProductDetailPage({
    params,
}: ProductDetailPageProps) {
    const { id } = await params;

    const product = await getProduct(id);

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

    // Fetch related products (same category, excluding current, max 4)
    const relatedProducts = await db.query.products.findMany({
        where: and(
            eq(products.category, product.category),
            ne(products.id, product.id)
        ),
        orderBy: [desc(products.createdAt)],
        limit: 4,
    });

    return (
        <div className="min-h-screen bg-[#e5e7eb] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 animate-page-enter">
            {/* Outer card */}
            <div className="relative max-w-screen-2xl mx-auto bg-white rounded-2xl border border-gray-200 overflow-hidden" style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.14)' }}>


                <div className="p-6 sm:p-8">
                    {/* Breadcrumb */}
                    <PageBreadcrumb
                        items={[
                            { label: "ร้านค้า", href: "/shop" },
                            { label: product.name },
                        ]}
                        className="mb-6"
                    />

                    {/* Main layout: image left | info right */}
                    <div className="flex flex-col lg:flex-row items-start -mx-6 sm:-mx-8 mt-2">

                        {/* Left — Gallery (muted bg) */}
                        <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 bg-muted/40 lg:rounded-bl-2xl px-6 sm:px-8 py-6 border-b lg:border-b-0 lg:border-r border-border/60">
                            <ProductGallery mainImage={product.imageUrl || "/placeholder.jpg"} />
                            {/* Share buttons under gallery */}
                            <div className="mt-4">
                                <ShareButtons title={product.name} />
                            </div>
                        </div>

                        {/* Right — Info */}
                        <div className="flex-1 px-6 sm:px-8 py-6">

                            {/* Title */}
                            <h1 className="text-2xl font-bold text-foreground leading-snug">
                                {product.name}
                            </h1>

                            {/* Price */}
                            <div>
                                <div className="flex items-baseline gap-2 flex-wrap">
                                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {displayPrice.toLocaleString()}฿ ต่อชิ้น
                                    </span>
                                    {discountPrice && (
                                        <span className="text-base text-muted-foreground line-through">
                                            {price.toLocaleString()}฿
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    มีสินค้าทั้งหมด {stockCount} ชิ้น
                                </p>
                            </div>

                            {/* Description */}
                            {product.description && (
                                <div className="space-y-1.5">
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        <Info className="h-3.5 w-3.5" />
                                        รายละเอียดสินค้า
                                    </p>
                                    <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-foreground leading-relaxed whitespace-pre-line min-h-[60px]">
                                        {product.description}
                                    </div>
                                </div>
                            )}

                            {/* Actions (quantity, promo, buy, cart) */}
                            <div className="mt-1">
                                <ProductActions
                                    product={{
                                        id: product.id,
                                        name: product.name,
                                        price: price,
                                        discountPrice: discountPrice,
                                        imageUrl: product.imageUrl,
                                        category: product.category,
                                    }}
                                    disabled={!isAvailable}
                                    maxQuantity={stockCount}
                                />
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* Related Products Section */}
            {relatedProducts.length > 0 && (
                <div className="max-w-screen-2xl mx-auto mt-16 mb-8 bg-white rounded-2xl border border-gray-200 p-6" style={{ boxShadow: '0 12px 48px rgba(0,0,0,0.10)' }}>
                    <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                        รายการสินค้าอื่นๆ
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
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
                                    <div className="bg-white rounded-xl border border-gray-100 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] flex flex-col h-full">

                                        {/* Image */}
                                        <div className="group relative h-28 w-full rounded-lg overflow-hidden bg-gray-50 mb-4">
                                            <Image
                                                src={related.imageUrl || "/placeholder.jpg"}
                                                alt={related.name}
                                                fill
                                                sizes="(max-width: 768px) 50vw, 25vw"
                                                className="object-cover transition-all duration-500 group-hover:grayscale"
                                            />
                                            {/* Hover Overlay */}
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

                                        {/* Info */}
                                        <div className="flex flex-col flex-1 text-center">
                                            <h3 className="font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors text-sm text-center">
                                                {related.name}
                                            </h3>

                                            <div className="mt-auto pt-2 flex flex-col items-center gap-1">
                                                <div className="text-center">
                                                    {relDiscount && (
                                                        <div className="text-[10px] sm:text-xs text-muted-foreground line-through mb-0.5">
                                                            ฿{relPrice.toLocaleString()}
                                                        </div>
                                                    )}
                                                    <div className="font-semibold text-blue-500 text-sm">
                                                        ฿{relDisplayPrice.toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stock / Button */}
                                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                                                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                                                    คงเหลือ {relStock} ชิ้น
                                                </span>
                                                <div className={`text-[10px] px-2 py-1 rounded-full font-semibold ${relAvailable
                                                    ? "bg-blue-50 text-blue-600"
                                                    : "bg-red-50 text-red-500"
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
