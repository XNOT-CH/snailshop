"use client";

import Image from "next/image";
import { CartItem as CartItemType } from "@/components/providers/CartContext";
import { QuantitySelector } from "@/components/QuantitySelector";
import { Package, X } from "lucide-react";
import { formatCurrencyAmount, type PublicCurrencySettings } from "@/lib/currencySettings";
import { themeClasses } from "@/lib/theme";

interface CartItemProps {
    item: CartItemType;
    onRemove: (id: string) => void;
    onUpdateQuantity: (id: string, quantity: number) => void;
    currencySettings?: PublicCurrencySettings;
}

export function CartItem({ item, onRemove, onUpdateQuantity, currencySettings }: Readonly<CartItemProps>) {
    const displayPrice = item.discountPrice ?? item.price;
    const quantity = item.quantity || 1;
    const subtotal = displayPrice * quantity;
    const originalSubtotal = item.price * quantity;
    const hasProductDiscount = item.discountPrice != null && item.discountPrice < item.price;
    const maxQty = item.stock != null && item.stock > 0 ? item.stock : 99;

    return (
        <div className={`${themeClasses.surfaceSoft} flex items-center gap-3 rounded-xl px-3 py-3 transition-colors`}>
            {/* Thumbnail */}
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-background/80">
                <Image
                    src={item.imageUrl || "/placeholder.jpg"}
                    alt={item.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://placehold.co/56x56/1e293b/94a3b8?text=?";
                    }}
                />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                    <button
                        onClick={() => onRemove(item.id)}
                        className="-m-1.5 flex-shrink-0 p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                        aria-label="ลบ"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.category}</p>

                <div className="flex items-center justify-between mt-2 gap-2">
                    <div className="text-foreground">
                        <QuantitySelector
                            value={quantity}
                            onChange={(newQty) => onUpdateQuantity(item.id, newQty)}
                            min={1}
                            max={maxQty}
                            size="sm"
                        />
                    </div>
                    <div className="text-right">
                        {hasProductDiscount ? (
                            <p className="text-xs text-muted-foreground line-through">
                                {formatCurrencyAmount(originalSubtotal, item.currency, currencySettings)}
                            </p>
                        ) : null}
                        <p className="text-sm font-bold text-red-500 dark:text-red-400">
                            {hasProductDiscount
                                ? `เหลือ ${formatCurrencyAmount(subtotal, item.currency, currencySettings)}`
                                : formatCurrencyAmount(subtotal, item.currency, currencySettings)}
                        </p>
                        {item.stock != null && (
                            <p className="flex items-center justify-end gap-0.5 text-[10px] text-muted-foreground">
                                <Package className="h-2.5 w-2.5" />
                                เหลือ {item.stock}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

