"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Tag, ShoppingCart, Eye, Percent, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showPurchaseConfirm, showPurchaseSuccessModal, showError, showWarning } from "@/lib/swal";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { useMaintenanceStatus } from "@/hooks/useMaintenanceStatus";
import { useCurrencySettings } from "@/hooks/useCurrencySettings";
import { formatCurrencyAmount } from "@/lib/currencySettings";
import { preparePurchase } from "@/lib/prepare-purchase";
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
    initialProducts,
    initialCurrencySettings,
    initialMaintenance,
}: Readonly<SaleProductsProps>) {
    const router = useRouter();
    const maintenance = useMaintenanceStatus(initialMaintenance).purchase;
    const currencySettings = useCurrencySettings(initialCurrencySettings);
    const [products, setProducts] = useState<SaleProduct[]>(() => initialProducts ?? []);
    const [loading, setLoading] = useState(!Array.isArray(initialProducts));
    const [buyingId, setBuyingId] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handleBuyClick = async (product: SaleProduct) => {
        if (maintenance?.enabled) {
            showWarning(maintenance.message);
            return;
        }

        const confirmed = await showPurchaseConfirm({
            productName: product.name,
            priceText: formatCurrencyAmount(product.discountPrice, product.currency, currencySettings),
            extraHtml: `<span class="text-sm text-gray-500 line-through">ราคาปกติ: ${formatCurrencyAmount(product.price, product.currency, currencySettings)}</span>`,
            confirmButtonColor: "#58a6ff",
        });
        if (!confirmed) return;

        const purchaseCheck = await preparePurchase({
            router,
            amount: product.discountPrice,
            currency: product.currency,
            currencySettings,
            pinActionLabel: "ยืนยัน PIN เพื่อซื้อสินค้า",
        });
        if (!purchaseCheck.allowed) return;

        setBuyingId(product.id);

        try {
            const response = await fetch("/api/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: product.id, pin: purchaseCheck.pin }),
            });

            const data = await response.json();

            if (data.success) {
                const result = await showPurchaseSuccessModal({
                    productName: data.productName,
                    title: "ซื้อสำเร็จ",
                    text: "ต้องการเข้าไปดูสินค้าที่ซื้อเลยไหม",
                    confirmText: "ไปดูสินค้าเลย",
                    cancelText: "อยู่หน้านี้",
                    showCancelButton: true,
                });
                router.refresh();
                if (result.isConfirmed) {
                    router.push("/dashboard/inventory");
                }
                setProducts((prev) =>
                    prev.map((p) =>
                        p.id === product.id ? { ...p, isSold: true } : p
                    )
                );
            } else {
                showWarning(data.message);
            }
        } catch {
            showError("เกิดข้อผิดพลาดในการสั่งซื้อ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setBuyingId(null);
        }
    };

    useEffect(() => {
        if (Array.isArray(initialProducts)) {
            return;
        }

        async function fetchSaleProducts() {
            try {
                const res = await fetch("/api/sale-products");
                if (res.ok) {
                    const data = await res.json();
                    setProducts(data);
                }
            } catch (error) {
                console.error("Error fetching sale products:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchSaleProducts();
    }, [initialProducts]);

    const scroll = (direction: "left" | "right") => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const firstCard = container.querySelector<HTMLElement>(":scope > div");
            const scrollAmount = firstCard ? firstCard.offsetWidth + 16 : 200;

            if (direction === "right") {
                const maxScroll = container.scrollWidth - container.clientWidth;
                if (container.scrollLeft >= maxScroll - 10) {
                    container.scrollTo({ left: 0, behavior: "smooth" });
                    return;
                }
            }

            container.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth",
            });
        }
    };

    useEffect(() => {
        if (products.length === 0) return;
        const interval = setInterval(() => {
            scroll("right");
        }, 6000);
        return () => clearInterval(interval);
    }, [products]);

    const getDiscountPercent = (price: number, discountPrice: number) => {
        return Math.round(((price - discountPrice) / price) * 100);
    };

    if (loading) {
        return (
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Tag className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">สินค้าลดราคา</h2>
                </div>
                <div className="flex gap-4 overflow-hidden">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex-shrink-0 w-40 sm:w-52 animate-pulse">
                            <div className="h-52 bg-muted rounded-xl"></div>
                            <div className="h-4 bg-muted rounded mt-3 w-3/4"></div>
                            <div className="h-4 bg-muted rounded mt-2 w-1/2"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

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

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <Tag className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">สินค้าลดราคา</h2>
                    <span className={`${themeClasses.sale} rounded-full px-2 py-1 text-xs font-bold text-primary-foreground animate-pulse`}>SALE</span>
                </div>
                <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="icon" className="rounded-full" onClick={() => scroll("left")} aria-label="เลื่อนเซกชันสินค้าโปรโมชันไปทางซ้าย">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full" onClick={() => scroll("right")} aria-label="เลื่อนเซกชันสินค้าโปรโมชันไปทางขวา">
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-1 snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {products.map((product) => (
                    <div key={product.id} className="flex-shrink-0 w-40 sm:w-52 snap-start">
                        <div className={`${themeClasses.surface} storefront-product-card group relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_22px_42px_-28px_rgba(39,71,121,0.24)] dark:hover:shadow-[0_26px_50px_-34px_rgba(0,0,0,0.92)]`}>
                            <div className={`${themeClasses.surfaceMedia} relative aspect-square overflow-hidden border-b border-border/80`}>
                                <div className="absolute top-3 left-3 z-10">
                                    <span className={`${themeClasses.sale} storefront-product-sale flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-white`}>
                                        <Percent className="h-3 w-3" />
                                        -{getDiscountPercent(Number(product.price), Number(product.discountPrice))}%
                                    </span>
                                </div>
                                <div className="absolute top-3 right-3 z-10">
                                    <span className={`${themeClasses.badge} storefront-product-category rounded-full px-2 py-1 text-xs font-medium`}>
                                        {product.category}
                                    </span>
                                </div>
                                {product.isSold && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                                        <span className="transform rounded-full bg-primary px-4 py-2 font-bold text-primary-foreground -rotate-12">
                                            ขายแล้ว
                                        </span>
                                    </div>
                                )}
                                {!product.isSold && (
                                    <Link href={`/product/${product.id}`} className={`${themeClasses.overlayScrim} absolute inset-0 z-10 flex items-center justify-center opacity-0 backdrop-blur-[1px] transition duration-300 group-hover:opacity-100`}>
                                        <span className={`${themeClasses.badge} storefront-product-category flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold`}>
                                            ดูรายละเอียด
                                        </span>
                                    </Link>
                                )}
                                <Image
                                    src={product.imageUrl || "/placeholder.jpg"}
                                    alt={product.name}
                                    fill
                                    sizes="(max-width: 640px) calc(50vw - 24px), 208px"
                                    className="object-cover group-hover:grayscale-[30%] group-hover:blur-[1px] transition-all duration-300 ease-out"
                                />
                            </div>
                            <div className="p-4 text-center">
                                <h3 className="mb-1 truncate text-center font-semibold text-foreground">{product.name}</h3>
                                <div className="flex items-center justify-center gap-2">
                                    <p className={`${themeClasses.saleText} storefront-product-sale-text text-lg font-bold`}>{formatCurrencyAmount(Number(product.discountPrice), product.currency, currencySettings)}</p>
                                    <p className="text-sm text-muted-foreground line-through">{formatCurrencyAmount(Number(product.price), product.currency, currencySettings)}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    {product.isSold ? (
                                        <Button variant="outline" className="col-span-2 w-full border-border/80 bg-accent/40 text-foreground" disabled>
                                            <ShoppingCart className="h-4 w-4 mr-2" />
                                            ขายแล้ว
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                className={`${themeClasses.sale} storefront-product-sale col-span-2 w-full text-white`}
                                                onClick={() => void handleBuyClick(product)}
                                                disabled={buyingId === product.id || maintenance?.enabled}
                                            >
                                                {buyingId === product.id ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        กำลังสั่งซื้อ
                                                    </>
                                                ) : (
                                                    <>
                                                        <ShoppingCart className="h-4 w-4 mr-2" />
                                                        {maintenance?.enabled ? "ปิดปรับปรุง" : "สั่งซื้อ"}
                                                    </>
                                                )}
                                            </Button>
                                            <AddToCartButton
                                                product={{
                                                    id: product.id,
                                                    name: product.name,
                                                    price: product.price,
                                                    discountPrice: product.discountPrice,
                                                    currency: product.currency,
                                                    imageUrl: product.imageUrl,
                                                    category: product.category,
                                                    quantity: 1,
                                                }}
                                                className={`${themeClasses.actionMuted} storefront-product-action w-full`}
                                                showText={false}
                                                size="icon"
                                            />
                                        </>
                                    )}
                                    <Link href={`/product/${product.id}`} className="block">
                                        <Button variant="outline" size="icon" className={`${themeClasses.actionMuted} storefront-product-action w-full`} aria-label={`ดูรายละเอียด ${product.name}`}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

