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

interface SaleProduct {
    id: string;
    name: string;
    price: number;
    discountPrice: number;
    imageUrl: string | null;
    category: string;
    isSold: boolean;
}

export function SaleProducts() {
    const router = useRouter();
    const maintenance = useMaintenanceStatus().purchase;
    const [products, setProducts] = useState<SaleProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [buyingId, setBuyingId] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handleBuyClick = async (product: SaleProduct) => {
        if (maintenance?.enabled) {
            showWarning(maintenance.message);
            return;
        }

        const confirmed = await showPurchaseConfirm({
            productName: product.name,
            priceText: `฿${product.discountPrice.toLocaleString()}`,
            extraHtml: `<span class="text-sm text-gray-500 line-through">ราคาปกติ: ฿${product.price.toLocaleString()}</span>`,
            confirmButtonColor: "#ef4444",
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
    }, []);

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
                    <Tag className="h-6 w-6 text-red-500" />
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
                <div className="mb-4 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <p className="font-semibold">ระบบสั่งซื้อกำลังปิดปรับปรุงชั่วคราว</p>
                    <p className="mt-1 text-xs text-amber-800/90">{maintenance.message}</p>
                </div>
            )}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <Tag className="h-6 w-6 text-red-500" />
                    <h2 className="text-2xl font-bold">สินค้าลดราคา</h2>
                    <span className="px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full animate-pulse">SALE</span>
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
                        <div className="group relative bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                            <div className="relative aspect-square overflow-hidden bg-muted">
                                <div className="absolute top-3 left-3 z-10">
                                    <span className="px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full flex items-center gap-1">
                                        <Percent className="h-3 w-3" />
                                        -{getDiscountPercent(Number(product.price), Number(product.discountPrice))}%
                                    </span>
                                </div>
                                <div className="absolute top-3 right-3 z-10">
                                    <span className="px-2 py-1 text-xs font-medium bg-primary/90 text-primary-foreground rounded-full">
                                        {product.category}
                                    </span>
                                </div>
                                {product.isSold && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                                        <span className="px-4 py-2 bg-red-500 text-white font-bold rounded-full transform -rotate-12">
                                            ขายแล้ว
                                        </span>
                                    </div>
                                )}
                                {!product.isSold && (
                                    <Link href={`/product/${product.id}`} className="absolute inset-0 z-10 bg-white/10 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                                        <span
                                            style={{
                                                border: "1.5px solid rgba(96, 165, 250, 0.85)",
                                                color: "rgba(186, 230, 253, 1)",
                                                backgroundColor: "rgba(29, 78, 216, 0.12)",
                                            }}
                                            className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold"
                                        >
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
                                <h3 className="font-semibold text-foreground truncate mb-1 text-center">{product.name}</h3>
                                <div className="flex items-center justify-center gap-2">
                                    <p className="text-lg font-bold text-red-500">฿{Number(product.discountPrice).toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground line-through">฿{Number(product.price).toLocaleString()}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    {product.isSold ? (
                                        <Button variant="outline" className="col-span-2 w-full" disabled>
                                            <ShoppingCart className="h-4 w-4 mr-2" />
                                            ขายแล้ว
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                className="col-span-2 w-full bg-red-500 hover:bg-red-600"
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
                ))}
            </div>
        </div>
    );
}

