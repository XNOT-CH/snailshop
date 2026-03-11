"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { CartItem as CartItemType } from "@/components/providers/CartContext";
import { QuantitySelector } from "@/components/QuantitySelector";

interface CartItemProps {
    item: CartItemType;
    onRemove: (id: string) => void;
    onUpdateQuantity: (id: string, quantity: number) => void;
}

export function CartItem({ item, onRemove, onUpdateQuantity }: Readonly<CartItemProps>) {
    const displayPrice = item.discountPrice ?? item.price;
    const hasDiscount = item.discountPrice !== null && item.discountPrice !== undefined && item.discountPrice < item.price;
    const quantity = item.quantity || 1;
    const subtotal = displayPrice * quantity;

    return (
        <div className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
            {/* Product Image */}
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                    src={item.imageUrl || "/placeholder.jpg"}
                    alt={item.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://placehold.co/64x64/f1f5f9/64748b?text=No+Image";
                    }}
                />
            </div>

            {/* Product Details & Quantity */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h4 className="font-medium text-sm truncate text-foreground">
                            {item.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    {/* Remove Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0 -mt-1 -mr-1"
                        onClick={() => onRemove(item.id)}
                    >
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>

                <div className="flex items-center justify-between gap-2 mt-2">
                    {/* Quantity Selector */}
                    <QuantitySelector
                        value={quantity}
                        onChange={(newQty) => onUpdateQuantity(item.id, newQty)}
                        min={1}
                        max={99}
                        size="sm"
                    />

                    {/* Subtotal */}
                    <div className="text-right flex-shrink-0">
                        <span className="font-bold text-sm text-primary">
                            ฿{subtotal.toLocaleString()}
                        </span>
                        {(hasDiscount || quantity > 1) && (
                            <p className="text-[10px] text-muted-foreground">
                                {hasDiscount && <span className="line-through">฿{item.price.toLocaleString()}</span>}
                                {hasDiscount && quantity > 1 && " · "}
                                {quantity > 1 && `฿${displayPrice.toLocaleString()} × ${quantity}`}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
