import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductActions } from "@/components/ProductActions";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { ShareButtons } from "@/components/ShareButtons";
import { Info } from "lucide-react";
import { db, products } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getStockCount } from "@/lib/stock";

interface ProductDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({
    params,
}: ProductDetailPageProps) {
    const { id } = await params;

    const product = await db.query.products.findFirst({ where: eq(products.id, id) });

    if (!product) {
        notFound();
    }

    const isSold = Boolean(product.isSold);
    const price = Number(product.price);
    const discountPrice = product.discountPrice ? Number(product.discountPrice) : null;
    const stockCount = getStockCount(product.secretData || "", product.stockSeparator || "newline");
    const isAvailable = !isSold && stockCount > 0;
    const displayPrice = discountPrice ?? price;

    return (
        <div className="min-h-screen bg-background animate-page-enter">
            <main className="py-6 sm:py-10 px-4 sm:px-8 max-w-5xl mx-auto">
                {/* Breadcrumb */}
                <PageBreadcrumb
                    items={[
                        { label: "ร้านค้า", href: "/shop" },
                        { label: product.name },
                    ]}
                    className="mb-8"
                />

                {/* Main layout */}
                <div className="grid gap-10 lg:grid-cols-[420px_1fr] items-start">

                    {/* Left — Gallery + share */}
                    <div className="space-y-4">
                        <ProductGallery mainImage={product.imageUrl || "/placeholder.jpg"} />
                        <ShareButtons title={product.name} />
                    </div>

                    {/* Right — Info */}
                    <div className="flex flex-col gap-5">

                        {/* Title */}
                        <h1 className="text-2xl font-bold text-foreground leading-snug">
                            {product.name}
                        </h1>

                        {/* Price */}
                        <div>
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">
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
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                    <Info className="h-3.5 w-3.5" />
                                    รายละเอียดสินค้า
                                </p>
                                <div className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground leading-relaxed whitespace-pre-line min-h-[60px]">
                                    {product.description}
                                </div>
                            </div>
                        )}

                        {/* Actions (quantity, buy, cart, contact) */}
                        <div className="mt-2">
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
            </main>
        </div>
    );
}
