"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { showPurchaseConfirm, showPurchaseSuccessModal, showError, showWarning } from "@/lib/swal";
import { ShoppingCart, Eye, Loader2, ArrowRight } from "lucide-react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

interface ProductCardProps {
    id: string;
    image: string;
    title: string;
    price: number;
    category: string;
    isSold: boolean;
    index?: number;
}

export function ProductCard({
    id,
    image,
    title,
    price,
    category,
    isSold,
    index = 0,
}: ProductCardProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Trigger animation after mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, index * 50); // Stagger delay
        return () => clearTimeout(timer);
    }, [index]);

    const handleBuy = async () => {
        if (isSold || isLoading) return;
        const confirmed = await showPurchaseConfirm({
            productName: title,
            priceText: `฿${price.toLocaleString()}`,
        });

        if (!confirmed) return;

        setIsLoading(true);

        try {
            const response = await fetch("/api/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: id }),
            });

            const data = await response.json();

            if (data.success) {
                await showPurchaseSuccessModal({
                    productName: data.productName,
                });
                router.refresh();
            } else {
                showWarning(data.message);
            }
        } catch {
            showError("ไม่สามารถทำรายการได้ กรุณาลองใหม่");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Card
                className={`
                    group overflow-hidden bg-card rounded-2xl 
                    border border-border shadow-md shadow-primary/10
                    transition-all duration-300 ease-out
                    hover:shadow-xl hover:shadow-primary/20
                    hover:-translate-y-1 hover:border-primary/30
                    touch-feedback
                    ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                `}
                style={{
                    transitionDelay: `${index * 50}ms`,
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <Link href={`/product/${id}`} className="block">
                    {/* Image Container with Overlay */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        <Image
                            src={image || "/placeholder.jpg"}
                            alt={title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            className={`
                                object-cover transition-transform duration-500 ease-out
                                ${isHovered ? 'scale-110' : 'scale-100'}
                            `}
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "https://placehold.co/600x400/f1f5f9/64748b?text=No+Image";
                            }}
                        />

                        {/* Hover Overlay with Button */}
                        <div className={`
                            absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]
                            flex items-center justify-center
                            transition-all duration-300 ease-out
                            ${isHovered && !isSold ? 'opacity-100' : 'opacity-0'}
                        `}>
                            <span className="flex items-center gap-2 px-5 py-2.5 bg-white/95 dark:bg-gray-800/95 rounded-full text-sm font-semibold text-primary shadow-xl border-2 border-primary/30 hover:border-primary transition-all">
                                ดูรายละเอียด
                                <ArrowRight className="h-4 w-4" />
                            </span>
                        </div>

                        {/* Sold Overlay */}
                        {isSold && (
                            <div className="absolute inset-0 flex items-center justify-center bg-card/90 backdrop-blur-sm">
                                <Badge variant="destructive" className="text-sm px-4 py-1.5 rounded-full shadow-lg">
                                    ขายแล้ว
                                </Badge>
                            </div>
                        )}

                        {/* Category Badge */}
                        <Badge
                            className={`
                                absolute left-3 top-3 text-xs bg-primary text-white border-0 rounded-full
                                transition-transform duration-300
                                ${isHovered ? 'scale-110' : 'scale-100'}
                            `}
                        >
                            {category}
                        </Badge>
                    </div>

                    {/* Content */}
                    <CardContent className="p-3">
                        <h3 className="line-clamp-1 font-medium text-card-foreground transition-colors duration-200 group-hover:text-primary">
                            {title}
                        </h3>
                        <p className="mt-1 text-lg font-bold text-primary">
                            ฿{price.toLocaleString()}
                        </p>
                    </CardContent>
                </Link>

                {/* Footer */}
                <CardFooter className="flex gap-2 p-3 pt-0">
                    <Button
                        className="flex-1 gap-2 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/25"
                        size="sm"
                        disabled={isSold || isLoading}
                        onClick={handleBuy}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <ShoppingCart className="h-4 w-4" />
                        )}
                        {isSold ? "ขายแล้ว" : "ซื้อ"}
                    </Button>
                    {!isSold && (
                        <AddToCartButton
                            product={{
                                id,
                                name: title,
                                price,
                                imageUrl: image,
                                category,
                                quantity: 1,
                            }}
                            disabled={isSold}
                            className="flex-1"
                        />
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-xl border-border text-muted-foreground hover:bg-accent transition-all duration-200"
                        asChild
                    >
                        <Link href={`/product/${id}`}>
                            <Eye className="h-4 w-4" />
                        </Link>
                    </Button>
                </CardFooter>
            </Card >
        </>
    );
}
