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
import { requireAuthBeforePurchase } from "@/lib/require-auth-before-purchase";

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

        const authCheck = await requireAuthBeforePurchase(router);
        if (!authCheck.allowed) {
            return;
        }

        const confirmed = await showPurchaseConfirm({
            productName: title,
            priceText: formatCurrencyAmount(price, currency, currencySettings),
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
                group relative rounded-2xl border border-slate-300/80 bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300
                ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
            `}
            style={{
                transitionDelay: `${index * 50}ms`,
            }}
        >
            <div className="relative aspect-square overflow-hidden border-b border-slate-300/80 bg-muted">
                <div className="absolute top-3 left-3 z-10">
                    <span className="px-2 py-1 text-xs font-medium bg-primary/90 text-primary-foreground rounded-full">
                        {category}
                    </span>
                </div>
                {isSold && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                        <span className="px-4 py-2 bg-red-500 text-white font-bold rounded-full transform -rotate-12">
                            ขายแล้ว
                        </span>
                    </div>
                )}
                {!isSold && (
                    <Link href={`/product/${id}`} className="absolute inset-0 z-10 flex items-center justify-center bg-white/10 opacity-0 backdrop-blur-[1px] transition duration-300 group-hover:opacity-100">
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
                <h3 className="font-semibold text-foreground truncate mb-1 text-center">{title}</h3>
                <p className="text-lg font-bold text-primary text-center">
                    {formatCurrencyAmount(price, currency, currencySettings)}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                    {isSold ? (
                        <Button variant="outline" className="col-span-2 w-full" disabled>
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
                                className="w-full"
                                showText={false}
                                size="icon"
                            />
                        </>
                    )}
                    <Link href={`/product/${id}`} className="block">
                        <Button variant="outline" size="icon" className="w-full" aria-label={`ดูรายละเอียด ${title}`}>
                            <Eye className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

