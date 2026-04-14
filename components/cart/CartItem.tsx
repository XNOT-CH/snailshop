"use client";

import Image from "next/image";
import { CartItem as CartItemType } from "@/components/providers/CartContext";
import { QuantitySelector } from "@/components/QuantitySelector";
import { Package, X } from "lucide-react";
import { formatCurrencyAmount, type PublicCurrencySettings } from "@/lib/currencySettings";

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
    const maxQty = item.stock != null && item.stock > 0 ? item.stock : 99;

    return (
        <div className="flex items-center gap-3 rounded-xl bg-white/10 hover:bg-white/15 transition-colors px-3 py-3">
            {/* Thumbnail */}
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-white/10">
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
                    <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                    <button
                        onClick={() => onRemove(item.id)}
                        className="text-white/30 hover:text-red-400 transition-colors flex-shrink-0 p-1.5 -m-1.5"
                        aria-label="ลบ"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <p className="text-xs text-white/40 mt-0.5">{item.category}</p>

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
                        <p className="text-sm font-bold text-blue-400">
                            {formatCurrencyAmount(subtotal, item.currency, currencySettings)}
                        </p>
                        {item.stock != null && (
                            <p className="text-[10px] text-white/30 flex items-center justify-end gap-0.5">
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

