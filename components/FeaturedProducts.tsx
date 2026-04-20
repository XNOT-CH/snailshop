"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Flame,
  Loader2,
  Percent,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import {
  showError,
  showPurchaseConfirm,
  showPurchaseSuccessModal,
  showWarning,
} from "@/lib/swal";
import { useMaintenanceStatus } from "@/hooks/useMaintenanceStatus";
import { useCurrencySettings } from "@/hooks/useCurrencySettings";
import { formatCurrencyAmount } from "@/lib/currencySettings";
import { preparePurchase } from "@/lib/prepare-purchase";
import { themeClasses } from "@/lib/theme";
import type { PublicCurrencySettings } from "@/lib/currencySettings";
import type { MaintenanceMap } from "@/hooks/useMaintenanceStatus";

interface FeaturedProduct {
  id: string;
  name: string;
  price: number;
  discountPrice?: number | null;
  currency?: string | null;
  imageUrl: string | null;
  category: string;
  isSold: boolean;
}

interface FeaturedProductsProps {
  initialProducts?: FeaturedProduct[];
  initialCurrencySettings?: PublicCurrencySettings | null;
  initialMaintenance?: MaintenanceMap;
}

function normalizeFeaturedProduct(product: FeaturedProduct) {
  return {
    ...product,
    price: Number(product.price),
    discountPrice:
      product.discountPrice === null || product.discountPrice === undefined
        ? null
        : Number(product.discountPrice),
  };
}

function getActivePrice(product: FeaturedProduct) {
  return product.discountPrice != null && product.discountPrice < product.price
    ? product.discountPrice
    : product.price;
}

function hasDiscount(product: FeaturedProduct) {
  return product.discountPrice != null && product.discountPrice < product.price;
}

function getDiscountPercent(product: FeaturedProduct) {
  if (!hasDiscount(product)) {
    return 0;
  }

  return Math.round(((product.price - Number(product.discountPrice)) / product.price) * 100);
}

export function FeaturedProducts({
  initialProducts,
  initialCurrencySettings,
  initialMaintenance,
}: Readonly<FeaturedProductsProps>) {
  const router = useRouter();
  const maintenance = useMaintenanceStatus(initialMaintenance).purchase;
  const currencySettings = useCurrencySettings(initialCurrencySettings);
  const [products, setProducts] = useState<FeaturedProduct[]>(() =>
    Array.isArray(initialProducts) ? initialProducts.map(normalizeFeaturedProduct) : []
  );
  const [loading, setLoading] = useState(!Array.isArray(initialProducts));
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleBuyClick = async (product: FeaturedProduct) => {
    if (maintenance?.enabled) {
      showWarning(maintenance.message);
      return;
    }

    const discounted = hasDiscount(product);
    const activePrice = getActivePrice(product);
    const confirmed = await showPurchaseConfirm({
      productName: product.name,
      priceText: formatCurrencyAmount(activePrice, product.currency, currencySettings),
      extraHtml: discounted
        ? `<span class="text-sm text-gray-500 line-through">ราคาปกติ: ${formatCurrencyAmount(product.price, product.currency, currencySettings)}</span>`
        : undefined,
      confirmButtonColor: discounted ? "#58a6ff" : undefined,
    });
    if (!confirmed) return;

    const purchaseCheck = await preparePurchase({
      router,
      amount: activePrice,
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
          prev.map((item) => (item.id === product.id ? { ...item, isSold: true } : item))
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

    async function fetchFeatured() {
      try {
        const res = await fetch("/api/featured-products", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setProducts(Array.isArray(data) ? data.map(normalizeFeaturedProduct) : []);
        }
      } catch (error) {
        console.error("Error fetching featured products:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchFeatured();
  }, [initialProducts]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) {
      return;
    }

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
  };

  useEffect(() => {
    if (products.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      scroll("right");
    }, 5000);

    return () => clearInterval(interval);
  }, [products]);

  if (loading) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Flame className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">สินค้าแนะนำ</h2>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="w-40 flex-shrink-0 sm:w-52">
              <div className="skeleton-wave h-52 rounded-xl" />
              <div className="skeleton-wave mt-3 h-4 w-3/4 rounded" />
              <div className="skeleton-wave mt-2 h-4 w-1/2 rounded" />
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
          <Flame className="h-6 w-6 animate-pulse text-orange-500 dark:text-red-400" />
          <h2 className="text-2xl font-bold">สินค้าแนะนำ</h2>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="icon" className="rounded-full" onClick={() => scroll("left")} aria-label="เลื่อนเซกชันโปรโมชันไปทางซ้าย">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full" onClick={() => scroll("right")} aria-label="เลื่อนเซกชันโปรโมชันไปทางขวา">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="swipe-container scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((product) => {
          const discounted = hasDiscount(product);
          const activePrice = getActivePrice(product);

          return (
            <div key={product.id} className="swipe-item w-40 flex-shrink-0 snap-start sm:w-52">
              <div className={`${themeClasses.surface} storefront-product-card group relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_22px_42px_-28px_rgba(39,71,121,0.24)] dark:hover:shadow-[0_26px_50px_-34px_rgba(0,0,0,0.92)]`}>
                <div className={`${themeClasses.surfaceMedia} relative aspect-square overflow-hidden border-b border-border/80`}>
                  {discounted ? (
                    <div className="absolute left-3 top-3 z-10">
                      <span className={`${themeClasses.sale} storefront-product-sale flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-white`}>
                        <Percent className="h-3 w-3" />
                        -{getDiscountPercent(product)}%
                      </span>
                    </div>
                  ) : null}
                  <div className="absolute right-3 top-3 z-10">
                    <span className={`${themeClasses.badge} storefront-product-category rounded-full px-2 py-1 text-xs font-medium`}>
                      {product.category}
                    </span>
                  </div>
                  {product.isSold ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                      <span className="transform rounded-full bg-primary px-4 py-2 font-bold text-primary-foreground -rotate-12">
                        ขายแล้ว
                      </span>
                    </div>
                  ) : null}
                  {!product.isSold ? (
                    <Link
                      href={`/product/${product.id}`}
                      className={`${themeClasses.overlayScrim} absolute inset-0 z-10 flex items-center justify-center opacity-0 backdrop-blur-[1px] transition duration-300 group-hover:opacity-100`}
                    >
                      <span className={`${themeClasses.badge} storefront-product-category flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold`}>
                        ดูรายละเอียด
                      </span>
                    </Link>
                  ) : null}
                  <Image
                    src={product.imageUrl || "/placeholder.jpg"}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) calc(50vw - 24px), 208px"
                    className="object-cover transition-all duration-300 ease-out group-hover:grayscale-[30%] group-hover:blur-[1px]"
                  />
                </div>
                <div className="p-4 text-center">
                  <h3 className="mb-1 truncate text-center font-semibold text-foreground">{product.name}</h3>
                  <div className={`mb-1 flex items-center justify-center gap-2 ${discounted ? "" : "flex-col"}`}>
                    <p className={`text-lg font-bold ${discounted ? `${themeClasses.saleText} storefront-product-sale-text` : "text-primary"}`}>
                      {formatCurrencyAmount(Number(activePrice), product.currency, currencySettings)}
                    </p>
                    {discounted ? (
                      <p className="text-sm text-muted-foreground line-through">
                        {formatCurrencyAmount(Number(product.price), product.currency, currencySettings)}
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {product.isSold ? (
                      <Button variant="outline" className="col-span-2 w-full border-border/80 bg-accent/40 text-foreground" disabled>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        ขายแล้ว
                      </Button>
                    ) : (
                      <>
                        <Button
                          className={`col-span-2 w-full ${discounted ? `${themeClasses.sale} storefront-product-sale text-white` : ""}`}
                          onClick={() => void handleBuyClick(product)}
                          disabled={buyingId === product.id || maintenance?.enabled}
                        >
                          {buyingId === product.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              กำลังสั่งซื้อ
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="mr-2 h-4 w-4" />
                              {maintenance?.enabled ? "ปิดปรับปรุง" : "สั่งซื้อ"}
                            </>
                          )}
                        </Button>
                        <AddToCartButton
                          product={{
                            id: product.id,
                            name: product.name,
                            price: activePrice,
                            discountPrice: discounted ? activePrice : undefined,
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
          );
        })}
      </div>
    </div>
  );
}

