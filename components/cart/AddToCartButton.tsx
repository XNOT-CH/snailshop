"use client";

import { Button } from "@/components/ui/button";
import { Plus, Check, Loader2 } from "lucide-react";
import { useCart, CartItem } from "@/components/providers/CartContext";
import { useState } from "react";

interface AddToCartButtonProps {
    product: CartItem;
    disabled?: boolean;
    size?: "sm" | "default" | "lg" | "icon";
    className?: string;
    showText?: boolean;
}

export function AddToCartButton({
    product,
    disabled = false,
    size = "sm",
    className = "",
    showText = true,
}: Readonly<AddToCartButtonProps>) {
    const { addToCart, isInCart, isLoading: cartLoading } = useCart();
    const [isAdding, setIsAdding] = useState(false);
    const inCart = isInCart(product.id);

    const handleAddToCart = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (disabled || inCart || isAdding) return;

        setIsAdding(true);
        try {
            await addToCart(product);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <Button
            variant={inCart ? "secondary" : "outline"}
            size={size}
            className={`gap-2 rounded-xl transition-all duration-200 ${className}`}
            disabled={disabled || isAdding || cartLoading}
            onClick={handleAddToCart}
            aria-label={
                showText
                    ? undefined
                    : inCart
                        ? `อยู่ในตะกร้าแล้ว: ${product.name}`
                        : `เพิ่ม ${product.name} ลงตะกร้า`
            }
        >
            {isAdding && <Loader2 className="h-4 w-4 animate-spin" />}
            {!isAdding && inCart && <Check className="h-4 w-4" />}
            {!isAdding && !inCart && <Plus className="h-4 w-4" />}
            {showText && (inCart ? "อยู่ในตะกร้า" : "ตะกร้า")}
        </Button>
    );
}
