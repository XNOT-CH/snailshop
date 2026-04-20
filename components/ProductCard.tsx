"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { showPurchaseConfirm, showPurchaseSuccessModal, showError, showWarning } from "@/lib/swal";
import { ShoppingCart, Eye, Loader2 } from "lucide-react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { useMaintenanceStatus } from "@/hooks/useMaintenanceStatus";
import { formatCurrencyAmount, type PublicCurrencySettings } from "@/lib/currencySettings";
import { preparePurchase } from "@/lib/prepare-purchase";
import { themeClasses } from "@/lib/theme";

interface ProductCardProps {
    id: string;
    image: string;
    title: string;
    price: number;
    currency?: string | null;
    category: string;
    isSold: boolean;
    index?: number;
    currencySettings?: PublicCurrencySettings;
}

export function ProductCard({
    id,
    image,
    title,
    price,
    currency = "THB",
    category,
    isSold,
    index = 0,
    currencySettings,
}: Readonly<ProductCardProps>) {
    const router = useRouter();
    const maintenance = useMaintenanceStatus().purchase;
    const [isLoading, setIsLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, index * 50);
        return () => clearTimeout(timer);
    }, [index]);

    const handleBuy = async () => {
        if (maintenance?.enabled) {
            showWarning(maintenance.message);
            return;
        }

        if (isSold || isLoading) return;

        const confirmed = await showPurchaseConfirm({
            productName: title,
            priceText: formatCurrencyAmount(price, currency, currencySettings),
        });

        if (!confirmed) return;

        const purchaseCheck = await preparePurchase({
            router,
            amount: price,
            currency,
            currencySettings,
            pinActionLabel: "ยืนยัน PIN เพื่อซื้อสินค้า",
        });
        if (!purchaseCheck.allowed) return;

        setIsLoading(true);

        try {
            const response = await fetch("/api/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: id, pin: purchaseCheck.pin }),
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
            } else {
                showWarning(data.message);
            }
        } catch {
            showError("เกิดข้อผิดพลาดในการสั่งซื้อ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className={`
                ${themeClasses.surface} storefront-product-card group relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_22px_42px_-28px_rgba(39,71,121,0.24)] dark:hover:shadow-[0_26px_50px_-34px_rgba(0,0,0,0.92)]
                ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
            `}
            style={{
                transitionDelay: `${index * 50}ms`,
            }}
        >
            <div className={`${themeClasses.surfaceMedia} relative aspect-square overflow-hidden border-b border-border/80`}>
                <div className="absolute top-3 left-3 z-10">
                    <span className={`${themeClasses.badge} storefront-product-category rounded-full px-2 py-1 text-xs font-medium shadow-sm`}>
                        {category}
                    </span>
                </div>
                {isSold && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                        <span className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-full transform -rotate-12">
                            ขายแล้ว
                        </span>
                    </div>
                )}
                {!isSold && (
                    <Link href={`/product/${id}`} className={`${themeClasses.overlayScrim} absolute inset-0 z-10 flex items-center justify-center opacity-0 backdrop-blur-[1px] transition duration-300 group-hover:opacity-100`}>
                        <span className={`${themeClasses.badge} storefront-product-category flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold`}>
                            ดูรายละเอียด
                        </span>
                    </Link>
                )}
                <Image
                    src={image || "/placeholder.jpg"}
                    alt={title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover group-hover:grayscale-[50%] group-hover:blur-[1px] transition-all duration-300 ease-out"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://placehold.co/600x400/f1f5f9/64748b?text=No+Image";
                    }}
                />
            </div>
            <div className="p-4 text-center">
                <h3 className="mb-1 truncate text-center font-semibold text-foreground">{title}</h3>
                <p className="text-center text-lg font-bold text-primary">
                    {formatCurrencyAmount(price, currency, currencySettings)}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                    {isSold ? (
                        <Button variant="outline" className="col-span-2 w-full border-border/80 bg-accent/40 text-foreground" disabled>
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            ขายแล้ว
                        </Button>
                    ) : (
                        <>
                            <Button
                                className="col-span-2 w-full"
                                onClick={() => void handleBuy()}
                                disabled={isLoading || maintenance?.enabled}
                            >
                                {isLoading ? (
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
                                    id,
                                    name: title,
                                    price,
                                    currency,
                                    imageUrl: image,
                                    category,
                                    quantity: 1,
                                }}
                                className={`${themeClasses.actionMuted} storefront-product-action w-full`}
                                showText={false}
                                size="icon"
                            />
                        </>
                    )}
                    <Link href={`/product/${id}`} className="block">
                        <Button variant="outline" size="icon" className={`${themeClasses.actionMuted} storefront-product-action w-full`} aria-label={`ดูรายละเอียด ${title}`}>
                            <Eye className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

