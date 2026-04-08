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

interface FeaturedProduct {
  id: string;
  name: string;
  price: number;
  discountPrice?: number | null;
  imageUrl: string | null;
  category: string;
  isSold: boolean;
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

export function FeaturedProducts() {
  const router = useRouter();
  const maintenance = useMaintenanceStatus().purchase;
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleBuyClick = async (product: FeaturedProduct) => {
    if (maintenance?.enabled) {
      showWarning(maintenance.message);
      return;
    }

    const discounted = hasDiscount(product);
    const confirmed = await showPurchaseConfirm({
      productName: product.name,
      priceText: `฿${getActivePrice(product).toLocaleString()}`,
      extraHtml: discounted
        ? `<span class="text-sm text-gray-500 line-through">ราคาปกติ: ฿${product.price.toLocaleString()}</span>`
        : undefined,
      confirmButtonColor: discounted ? "#ef4444" : undefined,
    });
    if (!confirmed) return;

    setBuyingId(product.id);

    try {
      const response = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
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
  }, []);

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
          <Flame className="h-6 w-6 text-orange-500" />
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
        <div className="mb-4 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">ระบบสั่งซื้อกำลังปิดปรับปรุงชั่วคราว</p>
          <p className="mt-1 text-xs text-amber-800/90">{maintenance.message}</p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Flame className="h-6 w-6 animate-pulse text-orange-500" />
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
              <div className="group relative overflow-hidden rounded-2xl border border-slate-300/80 bg-white shadow-sm transition-all duration-300 hover:shadow-lg">
                <div className="relative aspect-square overflow-hidden border-b border-slate-300/80 bg-muted">
                  {discounted ? (
                    <div className="absolute left-3 top-3 z-10">
                      <span className="flex items-center gap-1 rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white">
                        <Percent className="h-3 w-3" />
                        -{getDiscountPercent(product)}%
                      </span>
                    </div>
                  ) : null}
                  <div className="absolute right-3 top-3 z-10">
                    <span className="rounded-full bg-primary/90 px-2 py-1 text-xs font-medium text-primary-foreground">
                      {product.category}
                    </span>
                  </div>
                  {product.isSold ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                      <span className="transform rounded-full bg-red-500 px-4 py-2 font-bold text-white -rotate-12">
                        ขายแล้ว
                      </span>
                    </div>
                  ) : null}
                  {!product.isSold ? (
                    <Link
                      href={`/product/${product.id}`}
                      className="absolute inset-0 z-10 flex items-center justify-center bg-white/10 opacity-0 backdrop-blur-[1px] transition duration-300 group-hover:opacity-100"
                    >
                      <span
                        style={{
                          border: "1.5px solid rgba(96, 165, 250, 0.85)",
                          color: "rgba(186, 230, 253, 1)",
                          backgroundColor: "rgba(29, 78, 216, 0.12)",
                        }}
                        className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold"
                      >
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
                    <p className={`text-lg font-bold ${discounted ? "text-red-500" : "text-primary"}`}>
                      ฿{Number(activePrice).toLocaleString()}
                    </p>
                    {discounted ? (
                      <p className="text-sm text-muted-foreground line-through">
                        ฿{Number(product.price).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {product.isSold ? (
                      <Button variant="outline" className="col-span-2 w-full" disabled>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        ขายแล้ว
                      </Button>
                    ) : (
                      <>
                        <Button
                          className={`col-span-2 w-full ${discounted ? "bg-red-500 hover:bg-red-600" : ""}`}
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
                            imageUrl: product.imageUrl,
                            category: product.category,
                            quantity: 1,
                          }}
                          className="w-full"
                          showText={false}
                          size="icon"
                        />
                      </>
                    )}
                    <Link href={`/product/${product.id}`} className="block">
                      <Button variant="outline" size="icon" className="w-full" aria-label={`ดูรายละเอียด ${product.name}`}>
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

