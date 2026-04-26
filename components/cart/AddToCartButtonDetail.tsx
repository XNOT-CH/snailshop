"use client";

import { Button } from "@/components/ui/button";
import { Plus, ShoppingCart, Loader2 } from "lucide-react";
import { useCart } from "@/components/providers/CartContext";
import { useState } from "react";
import { QuantitySelector } from "@/components/QuantitySelector";

interface ProductDetailAddToCartProps {
    product: {
        id: string;
        name: string;
        price: number;
        discountPrice?: number | null;
        imageUrl: string | null;
        category: string;
    };
    disabled?: boolean;
    maxQuantity?: number;
}

export function ProductDetailAddToCart({ product, disabled = false, maxQuantity = 99 }: Readonly<ProductDetailAddToCartProps>) {
    const { addToCart, isInCart, isLoading: cartLoading, openCart } = useCart();
    const [isAdding, setIsAdding] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const inCart = isInCart(product.id);

    const handleAddToCart = async () => {
        if (disabled || isAdding) return;

        if (inCart) {
            openCart();
            return;
        }

        setIsAdding(true);
        try {
            await addToCart({
                id: product.id,
                name: product.name,
                price: product.price,
                discountPrice: product.discountPrice,
                imageUrl: product.imageUrl,
                category: product.category,
                quantity: quantity,
            });
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            {/* Quantity Selector */}
            {!inCart && !disabled && (
                <QuantitySelector
                    value={quantity}
                    onChange={setQuantity}
                    min={1}
                    max={maxQuantity}
                    size="md"
                    disabled={isAdding || cartLoading}
                    label="จำนวนสินค้า"
                />
            )}

            {/* Add to Cart Button */}
            <Button
                variant={inCart ? "secondary" : "outline"}
                size="lg"
                className="w-full gap-2 text-lg rounded-xl"
                disabled={disabled || isAdding || cartLoading}
                onClick={handleAddToCart}
            >
                {isAdding && (
                    <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        กำลังเพิ่ม...
                    </>
                )}
                {!isAdding && inCart && (
                    <>
                        <ShoppingCart className="h-5 w-5" />
                        ดูในตะกร้า
                    </>
                )}
                {!isAdding && !inCart && (
                    <>
                        <Plus className="h-5 w-5" />
                        เพิ่มลงตะกร้า
                    </>
                )}
            </Button>
        </div>
    );
}

