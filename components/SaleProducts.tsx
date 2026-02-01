"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Tag, ShoppingCart, Eye, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    const [products, setProducts] = useState<SaleProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

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
            const scrollAmount = 224;

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
                        <div key={i} className="flex-shrink-0 w-52 animate-pulse">
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
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Tag className="h-6 w-6 text-red-500" />
                    <h2 className="text-2xl font-bold">สินค้าลดราคา</h2>
                    <span className="px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full animate-pulse">SALE</span>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="rounded-full" onClick={() => scroll("left")}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full" onClick={() => scroll("right")}>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-2 px-2 snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {products.map((product) => (
                    <div key={product.id} className="flex-shrink-0 w-52 snap-start">
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
                                <Image
                                    src={product.imageUrl || "/placeholder.jpg"}
                                    alt={product.name}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold text-foreground truncate mb-1">{product.name}</h3>
                                <div className="flex items-center gap-2">
                                    <p className="text-lg font-bold text-red-500">฿{Number(product.discountPrice).toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground line-through">฿{Number(product.price).toLocaleString()}</p>
                                </div>
                                <div className="flex gap-2 mt-3">
                                    {product.isSold ? (
                                        <Button variant="outline" className="flex-1" disabled>
                                            <ShoppingCart className="h-4 w-4 mr-2" />
                                            ขายแล้ว
                                        </Button>
                                    ) : (
                                        <Link href={`/product/${product.id}`} className="flex-1">
                                            <Button className="w-full bg-red-500 hover:bg-red-600">
                                                <ShoppingCart className="h-4 w-4 mr-2" />
                                                ซื้อ
                                            </Button>
                                        </Link>
                                    )}
                                    <Link href={`/product/${product.id}`}>
                                        <Button variant="outline" size="icon">
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
